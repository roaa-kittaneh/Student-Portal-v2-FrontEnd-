# Student Portal v2

A production-grade React reference implementation in **TypeScript**, built around five engineering pillars:

1. **Multi-page routing** — `react-router-dom` v6 with code-splitting via `React.lazy`.
2. **REST data layer** — local mock API (`server.mjs`) proxied through Vite, wrapped in a typed fetch client with `AbortController` cancellation.
3. **CRUD** — full create / read / update / delete on students.
4. **Global state** — `Context + useReducer` (clean, predictable transitions; no Redux needed for this scope).
5. **Reusable hooks + Error boundaries + Suspense loaders** — production patterns rather than toy code.

Plus a dedicated **performance pass** (memoization, stable refs, debouncing) you can profile in React DevTools.

The visual language is warm grays and butter yellow — soft, paper-like, friendly.

---

## Quick start

```bash
npm install
npm start          # runs the mock API + Vite concurrently
```

Then open http://localhost:5173

If you prefer to run them separately:

```bash
npm run server     # mock API (server.mjs, no deps) on :4001
npm run dev        # Vite on :5173 (proxies /api -> :4001)
npm run typecheck  # tsc --noEmit
npm run build      # tsc -b && vite build
```

## Troubleshooting

### Still seeing "500 Internal Server Error" after upgrading?

That almost always means a **different process is already bound to port 4001**, and your new `server.mjs` can't take over. Kill it:

```powershell
# Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 4001).OwningProcess | Stop-Process -Force
```

```bash
# macOS / Linux
lsof -ti:4001 | xargs kill -9
```

Then `npm start` again. You should see `Mock API ready: http://localhost:4001` and a request line for every API call. **If you don't see those request lines, you're hitting a different server.**

### How to confirm the new server is actually answering

Visit http://localhost:4001/health directly — it should return `{"status":"ok"}`. If you get HTML or a 500, it's not server.mjs.

---

## Architecture

```
src/
├── types/index.ts              # Domain types: Student, StudentDraft, FetchStatus...
├── api/client.ts               # Fetch wrapper (ApiError, AbortController, generic <T>)
├── context/
│   └── StudentsContext.tsx     # Global store: useReducer + memoized async actions
├── hooks/
│   ├── useFetch.ts             # Generic GET hook (abort-safe, manual refetch)
│   ├── useDebounce.ts          # Throttle search input
│   ├── useLocalStorage.ts      # Persist UI state across reloads
│   └── useStudents.ts          # Domain hook on top of context (memoized selectors)
├── components/
│   ├── Navbar.tsx
│   ├── ErrorBoundary.tsx       # Class component (only valid shape for this)
│   ├── Loader.tsx              # Accessible spinner
│   ├── StudentCard.tsx         # React.memo
│   ├── StudentList.tsx         # React.memo (memoized list container)
│   ├── StudentForm.tsx         # Validated form, reused for create + edit
│   └── ConfirmDialog.tsx       # Modal w/ scroll-lock and Escape handling
├── pages/                      # One file per route
│   ├── HomePage.tsx
│   ├── StudentsPage.tsx
│   ├── StudentDetailPage.tsx
│   ├── StudentFormPage.tsx     # Single component, mode="create" | "edit"
│   └── NotFoundPage.tsx
├── App.tsx                     # Routes + Suspense + ErrorBoundary
├── main.tsx                    # Provider tree
└── index.css                   # Design tokens + components (gray + butter yellow)
```

---

## Performance optimization — the deep dive

### What we optimized

`<StudentList>` is the hot path: it re-renders on every keystroke in the search box, every filter change, and every state change in `<StudentsPage>`. Without care, typing one character recomputes filters and reconciles every card.

### The four-layer strategy

| Layer | Tool | What it bails out |
|---|---|---|
| 1. Input | `useDebounce` | Collapses keystroke bursts into one filter recompute |
| 2. Selectors | `useMemo` (in `useStudents`) | Filter + sort runs only when items or filter inputs change |
| 3. List | `React.memo(StudentList)` | List skips reconciliation when `students` & `onDelete` refs are stable |
| 4. Items | `React.memo(StudentCard)` | Each card skips reconciliation when its student didn't change |

### How the references stay stable

```tsx
// In StudentsPage — these are the keystone optimizations:

const filterArgs = useMemo(
  () => ({ search: debouncedSearch, status, major, sortBy }),
  [debouncedSearch, status, major, sortBy]
);

const handleDelete = useCallback((s: Student) => setPendingDelete(s), []);
//                                                              ^^ empty deps =
//                                                                 stable forever
```

If we did this instead, memoization would silently break:

```tsx
// BAD: would defeat React.memo on every render:
<StudentList students={filtered} onDelete={(s) => setPendingDelete(s)} />
```

### Keys

`<StudentList>` keys cards by **`student.id`** — never `index`. Stable keys mean React reorders existing components on sort changes instead of unmounting and remounting. This preserves animation state, focus, and scroll, and minimizes DOM mutations.

### Pitfalls deliberately avoided

- **Inline objects/arrays/functions** as props to memoized children — they create a new reference each render and defeat `memo`.
- **Spreading `filters`** into `useStudents` would defeat its internal `useMemo` because the object identity churns every render. We destructure into primitive deps.
- **Index keys** in dynamic lists (sorting, filtering, deletions). Always use a stable id.
- **Premature memoization.** `useMemo` and `useCallback` aren't free — they have allocation cost and add complexity. They're applied only where measurement (or first-principles reasoning) shows they pay off.

### Profiling it yourself

1. Open React DevTools → Profiler tab.
2. Hit "Record".
3. Type into the search box and pause briefly so the debounced update fires.
4. Stop recording.

What you'll see:

- **Without memoization**: every keystroke shows N + 1 commits (list + each card).
- **With memoization**: keystrokes commit only the toolbar/header. The list's flame graph stays grey (bailed out) until the debounced search resolves and the filtered set actually changes.

Use the "Why did this render?" inspector to confirm cards are bailing out for the right reason ("Props are equal").

---

## Why these architectural choices

**`useReducer` over `useState` in the store.** Multiple related state slices (list / status / error) with discrete named transitions — easier to reason about and trivially unit-testable.

**`AbortController` everywhere.** Both `useFetch` and the context cancel inflight requests on unmount or re-fetch. Eliminates the classic "setState on unmounted component" warning and prevents stale-response races.

**Two Error Boundary levels.** Outer one in `main.tsx` catches catastrophic crashes; inner one in `App.tsx` resets per-route so a broken page doesn't take down the navbar.

**Code-splitting per route.** Each page is a separate chunk. Important once the app grows.

**Vite proxy → local mock API.** Frontend hits `/api/students`; Vite forwards to `:4001`. No CORS pain in dev, and the same code path works in production with a real API.

**TypeScript strict mode.** `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noImplicitOverride` are all on. Everything is typed end-to-end — `Student` → reducer actions → API responses → component props.

---

## Routes

| Path                   | Page              | Notes                                        |
|------------------------|-------------------|----------------------------------------------|
| `/`                    | HomePage          | Hero + memoized stats                        |
| `/students`            | StudentsPage      | Memoized list + search + filters + delete    |
| `/students/new`        | StudentFormPage   | `mode="create"`                              |
| `/students/:id`        | StudentDetailPage | Uses `useFetch` (independent of global cache)|
| `/students/:id/edit`   | StudentFormPage   | `mode="edit"`                                |
| `*`                    | NotFoundPage      | 404 catch-all                                |

---

## Extension ideas

- Optimistic updates in the reducer (apply locally, rollback on failure).
- TanStack Query (React Query) — once you outgrow context for cache + invalidation.
- Switch the mock API for a real backend — only `src/api/client.ts` and the proxy target change.
- Add `vitest` + `@testing-library/react` — the reducer and hooks are pure and trivially testable.
- Virtualize the list with `react-virtuoso` once you push past a few hundred rows.
