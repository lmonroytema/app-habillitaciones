import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ApiError, apiFetch, toQuery } from '../api';
import { ROLE_LABELS, useAuth } from '../auth';

type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

type TenantUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
};

type UserForm = {
  name: string;
  email: string;
  password: string;
  role: string;
  is_active: boolean;
};

function emptyForm(): UserForm {
  return { name: '', email: '', password: '', role: 'operator', is_active: true };
}

function UserModal({
  open,
  title,
  form,
  saving,
  isEditing,
  onClose,
  onChange,
  onSubmit,
}: {
  open: boolean;
  title: string;
  form: UserForm;
  saving: boolean;
  isEditing: boolean;
  onClose: () => void;
  onChange: (patch: Partial<UserForm>) => void;
  onSubmit: (e: FormEvent) => void;
}) {
  if (!open) return null;

  const passwordOk = isEditing ? form.password === '' || form.password.length >= 8 : form.password.length >= 8;

  return (
    <div className="modalOverlay" onMouseDown={onClose} role="presentation">
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div className="modalTitle">{title}</div>
          <button className="iconBtn" onClick={onClose} type="button" aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="modalBody">
          <form onSubmit={onSubmit} className="formGrid">
            <label className="field" style={{ gridColumn: '1 / -1' }}>
              <div className="label">Nombre</div>
              <input value={form.name} onChange={(e) => onChange({ name: e.target.value })} autoFocus />
            </label>

            <label className="field">
              <div className="label">Email</div>
              <input value={form.email} onChange={(e) => onChange({ email: e.target.value })} autoComplete="off" />
            </label>

            <label className="field">
              <div className="label">{isEditing ? 'Contraseña (dejar vacío para no cambiar)' : 'Contraseña (mínimo 8)'}</div>
              <input
                value={form.password}
                onChange={(e) => onChange({ password: e.target.value })}
                type="password"
                autoComplete="new-password"
              />
            </label>

            <label className="field">
              <div className="label">Rol</div>
              <select value={form.role} onChange={(e) => onChange({ role: e.target.value })}>
                <option value="admin">Administrador — gestiona usuarios y todos los módulos</option>
                <option value="operator">Operador — registra y edita información</option>
                <option value="viewer">Consulta — solo lectura</option>
              </select>
            </label>

            <label className="field">
              <div className="label">Estado</div>
              <select
                value={form.is_active ? '1' : '0'}
                onChange={(e) => onChange({ is_active: e.target.value === '1' })}
              >
                <option value="1">Activo</option>
                <option value="0">Deshabilitado</option>
              </select>
            </label>

            <div className="formActions">
              <button className="btnSoft" type="button" onClick={onClose}>
                Cancelar
              </button>
              <button
                className="btnPrimary"
                type="submit"
                disabled={saving || !form.name.trim() || !form.email.trim() || !passwordOk}
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 25;

  const [data, setData] = useState<Paginated<TenantUser> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TenantUser | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const maxUsers = currentUser?.tenant?.max_users ?? null;

  const query = useMemo(
    () =>
      toQuery({
        search: search.trim() || null,
        page,
        per_page: perPage,
      }),
    [page, search],
  );

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<Paginated<TenantUser>>(`/api/users${query}`);
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar la lista.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, [query]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(item: TenantUser) {
    setEditing(item);
    setForm({
      name: item.name,
      email: item.email,
      password: '',
      role: item.role,
      is_active: item.is_active,
    });
    setModalOpen(true);
  }

  async function submitForm(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);

    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        is_active: form.is_active,
      };
      if (form.password) body.password = form.password;

      await apiFetch<TenantUser>(editing ? `/api/users/${editing.id}` : '/api/users', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setModalOpen(false);
      if (page !== 1 && !editing) setPage(1);
      else await loadUsers();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No se pudo guardar el usuario.');
    } finally {
      setSaving(false);
    }
  }

  async function removeUser(item: TenantUser) {
    if (!confirm(`Eliminar el usuario "${item.name}"?`)) return;
    try {
      await apiFetch<{ message: string }>(`/api/users/${item.id}`, { method: 'DELETE' });
      await loadUsers();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No se pudo eliminar el usuario.');
    }
  }

  return (
    <div className="page">
      <div className="pageHeader">
        <div>
          <div className="pageTitle">Usuarios</div>
          <div className="pageSubtitle">
            Accesos de su organización
            {maxUsers !== null && data ? ` · ${data.total} de ${maxUsers} usuarios del plan` : ''}
          </div>
        </div>
        <button className="btnPrimary" onClick={openCreate} type="button">
          Nuevo usuario
        </button>
      </div>

      <div className="toolbar">
        <input
          className="search"
          placeholder="Buscar por nombre o email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <div className="metaChip">{data ? `${data.total} registros` : '—'}</div>
      </div>

      {error ? <div className="alert">{error}</div> : null}

      <div className="card">
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 72 }}>ID</th>
                <th>Nombre</th>
                <th style={{ width: 260 }}>Email</th>
                <th style={{ width: 150 }}>Rol</th>
                <th style={{ width: 130 }}>Estado</th>
                <th style={{ width: 180 }} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="tdMuted">
                    Cargando…
                  </td>
                </tr>
              ) : data && data.data.length ? (
                data.data.map((item) => (
                  <tr key={item.id}>
                    <td className="tdMono">{item.id}</td>
                    <td>
                      {item.name}
                      {currentUser?.id === item.id ? ' (usted)' : ''}
                    </td>
                    <td>{item.email}</td>
                    <td>{ROLE_LABELS[item.role] ?? item.role}</td>
                    <td>{item.is_active ? 'Activo' : 'Deshabilitado'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btnSoft" type="button" onClick={() => openEdit(item)}>
                          Editar
                        </button>
                        <button
                          className="btnDanger"
                          type="button"
                          onClick={() => removeUser(item)}
                          disabled={currentUser?.id === item.id}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="tdMuted">
                    Sin usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pager">
          <button className="btnSoft" type="button" disabled={!data || data.current_page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Anterior
          </button>
          <div className="pagerMeta">
            {data ? (
              <>
                Página <span className="tdMono">{data.current_page}</span> de <span className="tdMono">{data.last_page}</span>
              </>
            ) : (
              '—'
            )}
          </div>
          <button className="btnSoft" type="button" disabled={!data || data.current_page >= data.last_page} onClick={() => setPage((p) => p + 1)}>
            Siguiente
          </button>
        </div>
      </div>

      <UserModal
        open={modalOpen}
        title={editing ? 'Editar usuario' : 'Nuevo usuario'}
        form={form}
        saving={saving}
        isEditing={!!editing}
        onClose={() => setModalOpen(false)}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        onSubmit={submitForm}
      />
    </div>
  );
}
