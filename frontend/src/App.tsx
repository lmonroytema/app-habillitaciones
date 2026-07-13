import type { ReactNode } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import './App.css';
import { useAuth } from './auth';
import LoginPage from './pages/LoginPage';
import PeoplePage from './pages/PeoplePage';
import VehiclesPage from './pages/VehiclesPage';
import VesselsPage from './pages/VesselsPage';
import RequirementsPage from './pages/RequirementsPage';
import CompaniesPage from './pages/CompaniesPage';
import ProjectsPage from './pages/ProjectsPage';
import DocumentsPage from './pages/DocumentsPage';

function RequireAuth({ children }: { children: ReactNode }) {
  const { token, isBooting } = useAuth();
  const loc = useLocation();
  if (isBooting) return <div className="boot">Cargando…</div>;
  if (!token) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}

function AppShell() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebarTop">
          <img className="sidebarLogo" src="/logo-emta.png" alt="EMTA" />
          <div>
            <div className="brandTitle">Habilitaciones</div>
            <div className="brandSubtitle">Control documental y vigencias</div>
          </div>
        </div>

        <nav className="nav">
          <NavLink to="/people" className={({ isActive }) => (isActive ? 'navItem navItemActive' : 'navItem')}>
            Personas
          </NavLink>
          <NavLink to="/vehicles" className={({ isActive }) => (isActive ? 'navItem navItemActive' : 'navItem')}>
            Vehículos
          </NavLink>
          <NavLink to="/vessels" className={({ isActive }) => (isActive ? 'navItem navItemActive' : 'navItem')}>
            Embarcaciones
          </NavLink>
          <NavLink to="/requirements" className={({ isActive }) => (isActive ? 'navItem navItemActive' : 'navItem')}>
            Requisitos
          </NavLink>
          <NavLink to="/companies" className={({ isActive }) => (isActive ? 'navItem navItemActive' : 'navItem')}>
            Empresas
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) => (isActive ? 'navItem navItemActive' : 'navItem')}>
            Proyectos
          </NavLink>
          <NavLink to="/documents" className={({ isActive }) => (isActive ? 'navItem navItemActive' : 'navItem')}>
            Documentos
          </NavLink>
        </nav>

        <div className="sidebarBottom">
          <div className="userBlock">
            <div className="userName">{user?.name ?? '—'}</div>
            <div className="userEmail">{user?.email ?? ''}</div>
          </div>
          <button
            className="btnSoft"
            type="button"
            onClick={async () => {
              await logout();
              nav('/login', { replace: true });
            }}
          >
            Salir
          </button>
        </div>
      </aside>

      <div className="shellMain">
        <header className="topbar">
          <div className="topbarBrand">
            <img className="topbarLogo" src="/logo-emta.png" alt="EMTA" />
            <div>
              <div className="topbarTitle">Aplicación de Habilitaciones</div>
              <div className="topbarSubtitle">Seguimiento profesional de documentos, personal, vehículos y embarcaciones</div>
            </div>
          </div>

          <div className="topbarMeta">
            <div className="projectBadge">Control operativo</div>
            <div className="userSummary">
              <div className="userAvatar">{(user?.name ?? 'A').slice(0, 1).toUpperCase()}</div>
              <div>
                <div className="userSummaryName">{user?.name ?? '—'}</div>
                <div className="userSummaryEmail">{user?.email ?? ''}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="content">
          <Routes>
            <Route path="/people" element={<PeoplePage />} />
            <Route path="/vehicles" element={<VehiclesPage />} />
            <Route path="/vessels" element={<VesselsPage />} />
            <Route path="/requirements" element={<RequirementsPage />} />
            <Route path="/companies" element={<CompaniesPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="*" element={<Navigate to="/people" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { token } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/people" replace /> : <LoginPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
