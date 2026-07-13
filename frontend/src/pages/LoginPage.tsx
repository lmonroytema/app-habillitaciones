import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, apiFetch } from '../api';
import { useAuth } from '../auth';

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('admin@habilitaciones.local');
  const [password, setPassword] = useState('Admin.12345');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('admin@habilitaciones.local');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  const canSubmit = useMemo(() => email.trim() && password.trim() && !loading, [email, loading, password]);
  const canRecover = useMemo(() => recoveryEmail.trim() && !recoveryLoading, [recoveryEmail, recoveryLoading]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      nav('/people', { replace: true });
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError('No se pudo iniciar sesión.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function onRecoverSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canRecover) return;
    setRecoveryError(null);
    setRecoveryMessage(null);
    setRecoveryLoading(true);

    try {
      const res = await apiFetch<{ message: string }>('/api/forgot-password', {
        method: 'POST',
        auth: false,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail.trim() }),
      });
      setRecoveryMessage(res.message);
    } catch (e) {
      if (e instanceof ApiError) {
        setRecoveryError(e.message);
      } else {
        setRecoveryError('No se pudo procesar la solicitud.');
      }
    } finally {
      setRecoveryLoading(false);
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
              <h1 className="loginHeroTitle">Gestión de habilitaciones y control documental</h1>
              <p className="loginHeroText">Módulo profesional para seguimiento de personal, vehículos, embarcaciones, requisitos y vigencias.</p>
            </div>
          </div>

          <div className="authCard authCardLight">
            <div className="authCardTitle">Iniciar sesión</div>

            <form onSubmit={onSubmit} className="authForm">
              <label className="field">
                <div className="label">Email</div>
                <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
              </label>

              <label className="field">
                <div className="label">Contraseña</div>
                <div className="passwordField">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                  />
                  <button className="passwordToggle" type="button" onClick={() => setShowPassword((v) => !v)}>
                    {showPassword ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
              </label>

              {error ? <div className="alert alertSoft">{error}</div> : null}

              <button className="btnPrimary btnLogin" disabled={!canSubmit} type="submit">
                {loading ? 'Conectando…' : 'Conectar'}
              </button>

              <button
                className="textLink"
                type="button"
                onClick={() => {
                  setRecoveryOpen((v) => !v);
                  setRecoveryMessage(null);
                  setRecoveryError(null);
                }}
              >
                He olvidado mi contraseña
              </button>
            </form>

            {recoveryOpen ? (
              <div className="recoveryPanel">
                <div className="recoveryTitle">Recuperación de contraseña</div>
                <div className="recoveryText">Ingresa tu correo y te enviaremos las instrucciones para restablecer el acceso.</div>

                <form onSubmit={onRecoverSubmit} className="authForm">
                  <label className="field">
                    <div className="label">Correo de recuperación</div>
                    <input value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} autoComplete="email" />
                  </label>

                  {recoveryError ? <div className="alert alertSoft">{recoveryError}</div> : null}
                  {recoveryMessage ? <div className="alert alertSuccess">{recoveryMessage}</div> : null}

                  <button className="btnSoft btnRecovery" disabled={!canRecover} type="submit">
                    {recoveryLoading ? 'Enviando…' : 'Enviar instrucciones'}
                  </button>
                </form>
              </div>
            ) : null}
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
