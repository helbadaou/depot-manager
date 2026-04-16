import Head from 'next/head';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '../lib/api';
import { LoginResponse, getRole, saveSession } from '../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const applyQuickLogin = (nextUsername: string) => {
    setUsername(nextUsername);
    setPassword('1234');
    setError(null);
  };

  useEffect(() => {
    const role = getRole();
    if (role === 'manager') router.replace('/manager');
    if (role === 'sales') router.replace('/sales');
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch<LoginResponse>('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      saveSession(res);

      if (res.role === 'manager') router.replace('/manager');
      else router.replace('/sales');
    } catch (error) {
      const loginError = error as Error;
      setError(loginError.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page page-auth">
      <Head>
        <title>Depot Manager</title>
      </Head>

      <div className="auth-shell">
        <section className="surface auth-spotlight">
          <span className="eyebrow">Depot operations</span>
          <h1>Move stock, ring sales, and monitor live receipts from one screen.</h1>
          <p className="hero-copy-text">
            The app now has a cleaner dashboard shell, stronger status handling, and a sales flow that behaves
            reliably with barcode scanners.
          </p>

          <div className="credential-grid">
            <button type="button" className="credential-card" onClick={() => applyQuickLogin('manager')}>
              <span className="credential-role">Manager</span>
              <strong>manager / 1234</strong>
              <small>Live facture feed, queue status, and receipt reprints.</small>
            </button>

            <button type="button" className="credential-card" onClick={() => applyQuickLogin('sales')}>
              <span className="credential-role">Sales</span>
              <strong>sales / 1234</strong>
              <small>Scanner-first checkout, inventory updates, and batch facture creation.</small>
            </button>
          </div>

          <div className="insight-list">
            <div className="insight-card">
              <strong>Live activity</strong>
              <span>Manager mode now loads saved factures first, then keeps listening for new receipts.</span>
            </div>
            <div className="insight-card">
              <strong>Cleaner errors</strong>
              <span>API failures surface readable messages instead of raw JSON payloads.</span>
            </div>
            <div className="insight-card">
              <strong>Faster checkout</strong>
              <span>Scanner bursts no longer double-submit, while manual typing still works as expected.</span>
            </div>
          </div>
        </section>

        <section className="surface auth-card">
          <div className="surface-header">
            <div>
              <span className="eyebrow">Sign in</span>
              <h2>Access your workspace</h2>
            </div>
            <span className="status-pill neutral">Local demo accounts</span>
          </div>

          <form onSubmit={handleSubmit} className="form stack">
            <label>
              Username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="manager or sales"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="1234"
              />
            </label>

            {error && <div className="alert error">{error}</div>}

            <button type="submit" className="button block" disabled={loading}>
              {loading ? 'Signing in...' : 'Open dashboard'}
            </button>
          </form>

          <div className="auth-footer">
            <span>Tip: click a role card to auto-fill its credentials.</span>
          </div>
        </section>
      </div>
    </div>
  );
}
