import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import Navbar from './components/Navbar';
import Loader from './components/Loader';
import ErrorBoundary from './components/ErrorBoundary';

type RouteModule<T extends ComponentType<any>> = Promise<{ default: T }>;

function lazyWithRetry<T extends ComponentType<any>>(
  loader: () => RouteModule<T>,
  tries = 3
): LazyExoticComponent<T> {
  return lazy(async () => {
    let lastErr: unknown;

    for (let i = 0; i < tries; i += 1) {
      try {
        return await loader();
      } catch (err) {
        lastErr = err;
        if (i < tries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 300 * (i + 1)));
        }
      }
    }

    throw lastErr instanceof Error
      ? lastErr
      : new Error('Failed to load route module');
  });
}

// Code-splitting: each route is its own bundle. Reduces initial JS payload
// and means a render error in one route doesn't crash the whole app.
const HomePage = lazyWithRetry(() => import('./pages/HomePage'));
const StudentsPage = lazyWithRetry(() => import('./pages/StudentsPage'));
const StudentDetailPage = lazyWithRetry(() => import('./pages/StudentDetailPage'));
const StudentFormPage = lazyWithRetry(() => import('./pages/StudentFormPage'));
const NotFoundPage = lazyWithRetry(() => import('./pages/NotFoundPage'));

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="container">
        <ErrorBoundary>
          <Suspense fallback={<Loader label="Loading view..." />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/students" element={<StudentsPage />} />
              <Route path="/students/new" element={<StudentFormPage mode="create" />} />
              <Route path="/students/:id" element={<StudentDetailPage />} />
              <Route path="/students/:id/edit" element={<StudentFormPage mode="edit" />} />
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}
