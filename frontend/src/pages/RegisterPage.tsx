import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../api';
import { useAuth } from '../auth';

export default function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();

  const [organizationName, setOrganizationName] = useState('');
  const [ruc, setRuc] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => organizationName.trim() && name.trim() && email.trim() && password.length >= 8 && !loading,
    [email, loading, name, organizationName, password],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      await register({
        organization_name: organizationName.trim(),
        ruc: ruc.trim() || undefined,
        name: name.trim(),
        email: email.trim(),
        password,
      });
      nav('/people', { replace: true });
    } catch (e) {
      if (e instanceof ApiError) {
        const payload = e.payload;
        if (payload && typeof payload === 'object' && 'errors' in payload && payload.errors) {
          const first = Object.values(payload.errors as Record<string, string[]>)[0]?.[0];
          setError(first ?? e.message);
        } else {
          setError(e.message);
        }
      } else {
        setError('No se pudo crear la cuenta.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="loginPage">
      <header className="loginHeaderBar">
        <img className="loginHeaderLogo" src="/logo-emta.png" alt="EMTA" />
      </header>

      <section className="loginHero">
        <div className="loginHeroBackdrop" />
        <div className="loginHeroInner">
          <div className="loginBrandBlock">
            <div className="loginMonogram">H</div>
            <div>
              <h1 className="loginHeroTitle">Cree la cuenta de su organización</h1>
              <p className="loginHeroText">
                Pruebe la plataforma de habilitaciones y control documental sin costo durante 30 días. Sin instalación: solo
                necesita un navegador.
              </p>
            </div>
          </div>

          <div className="authCard authCardLight">
            <div className="authCardTitle">Registro — prueba gratuita</div>

            <form onSubmit={onSubmit} className="authForm">
              <label className="field">
                <div className="label">Nombre de la organización</div>
                <input value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} autoFocus />
              </label>

              <label className="field">
                <div className="label">RUC (opcional)</div>
                <input value={ruc} onChange={(e) => setRuc(e.target.value)} />
              </label>

              <label className="field">
                <div className="label">Su nombre</div>
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </label>

              <label className="field">
                <div className="label">Email</div>
                <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
              </label>

              <label className="field">
                <div className="label">Contraseña (mínimo 8 caracteres)</div>
                <div className="passwordField">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                  />
                  <button className="passwordToggle" type="button" onClick={() => setShowPassword((v) => !v)}>
                    {showPassword ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
              </label>

              {error ? <div className="alert alertSoft">{error}</div> : null}

              <button className="btnPrimary btnLogin" disabled={!canSubmit} type="submit">
                {loading ? 'Creando cuenta…' : 'Crear cuenta'}
              </button>

              <Link className="textLink" to="/login">
                Ya tengo una cuenta — iniciar sesión
              </Link>
            </form>
          </div>
        </div>
      </section>

      <footer className="loginFooter">
        <div className="loginFooterText">EMTA es una aplicación desarrollada para la gestión integral de habilitaciones.</div>
        <img className="loginFooterLogo" src="/tema.png" alt="Tema" />
      </footer>
    </div>
  );
}
