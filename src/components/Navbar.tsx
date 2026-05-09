import { NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <NavLink to="/" className="navbar__brand">
          <span className="navbar__mark" aria-hidden="true">SP</span>
          <span>Student Portal</span>
          <span className="navbar__badge">v2</span>
        </NavLink>

        <nav className="navbar__links" aria-label="Primary">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
          >
            Home
          </NavLink>
          <NavLink
            to="/students"
            className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
          >
            Students
          </NavLink>
          <NavLink to="/students/new" className="btn btn--primary btn--sm">
            + Add a student
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
