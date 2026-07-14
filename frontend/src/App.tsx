import type { ReactNode } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import './App.css';
import { PLAN_LABELS, ROLE_LABELS, useAuth } from './auth';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PeoplePage from './pages/PeoplePage';
import VehiclesPage from './pages/VehiclesPage';
import VesselsPage from './pages/VesselsPage';
import RequirementsPage from './pages/RequirementsPage';
import CompaniesPage from './pages/CompaniesPage';
import ProjectsPage from './pages/ProjectsPage';
import DocumentsPage from './pages/DocumentsPage';
import UsersPage from './pages/UsersPage';
import TenantsPage from './pages/TenantsPage';

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

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';
  const tenant = user?.tenant ?? null;

  const navClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'navItem navItemActive' : 'navItem');

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
          <NavLink to="/people" className={navClass}>
            Personas
          </NavLink>
          <NavLink to="/vehicles" className={navClass}>
            Vehículos
          </NavLink>
          <NavLink to="/vessels" className={navClass}>
            Embarcaciones
          </NavLink>
          <NavLink to="/requirements" className={navClass}>
            Requisitos
          </NavLink>
          <NavLink to="/companies" className={navClass}>
            Empresas
          </NavLink>
          <NavLink to="/projects" className={navClass}>
            Proyectos
          </NavLink>
          <NavLink to="/documents" className={navClass}>
            Documentos
          </NavLink>
          {isAdmin ? (
            <NavLink to="/users" className={navClass}>
              Usuarios
            </NavLink>
          ) : null}
          {isSuperAdmin ? (
            <NavLink to="/tenants" className={navClass}>
              Organizaciones
            </NavLink>
          ) : null}
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
            <div className="projectBadge">
              {isSuperAdmin
                ? 'Plataforma'
                : tenant
                  ? `${tenant.name} · Plan ${PLAN_LABELS[tenant.plan] ?? tenant.plan}`
                  : 'Control operativo'}
            </div>
            {tenant?.plan === 'trial' && tenant.trial_ends_at ? (
              <div className="projectBadge">Prueba hasta {tenant.trial_ends_at}</div>
            ) : null}
            <div className="userSummary">
              <div className="userAvatar">{(user?.name ?? 'A').slice(0, 1).toUpperCase()}</div>
              <div>
                <div className="userSummaryName">{user?.name ?? '—'}</div>
                <div className="userSummaryEmail">{user ? (ROLE_LABELS[user.role] ?? user.role) : ''}</div>
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
            {isAdmin ? <Route path="/users" element={<UsersPage />} /> : null}
            {isSuperAdmin ? <Route path="/tenants" element={<TenantsPage />} /> : null}
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
      <Route path="/register" element={token ? <Navigate to="/people" replace /> : <RegisterPage />} />
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
