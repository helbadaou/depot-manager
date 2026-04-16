import Link from 'next/link';
import { useRouter } from 'next/router';
import { ReactNode } from 'react';
import { UserRole, clearSession } from '../lib/auth';

type NavItem = {
  href: string;
  label: string;
};

type Metric = {
  label: string;
  value: string;
  detail: string;
};

type AppShellProps = {
  title: string;
  eyebrow: string;
  description: string;
  role: UserRole;
  navItems: NavItem[];
  metrics?: Metric[];
  actions?: ReactNode;
  children: ReactNode;
};

export default function AppShell({
  title,
  eyebrow,
  description,
  role,
  navItems,
  metrics = [],
  actions,
  children,
}: AppShellProps) {
  const router = useRouter();

  const logout = () => {
    clearSession();
    router.replace('/');
  };

  return (
    <div className="shell-page">
      <main className="shell-frame">
        <header className="surface topbar">
          <Link href={role === 'manager' ? '/manager' : '/sales'} className="brand">
            <span className="brand-mark">DM</span>
            <span className="brand-copy">
              <strong>Depot Manager</strong>
              <small>Inventory, checkout, and live receipt flow</small>
            </span>
          </Link>

          <nav className="topnav" aria-label="Primary">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link${router.pathname === item.href ? ' active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="topbar-actions">
            <span className={`status-pill ${role === 'manager' ? 'accent' : 'success'}`}>
              {role === 'manager' ? 'Manager access' : 'Sales access'}
            </span>
            <button type="button" className="button ghost small" onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        <section className="surface hero">
          <div className="hero-copy">
            <span className="eyebrow">{eyebrow}</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          {actions && <div className="hero-actions">{actions}</div>}
        </section>

        {metrics.length > 0 && (
          <section className="metric-grid">
            {metrics.map((metric) => (
              <article key={metric.label} className="metric-card">
                <span className="metric-label">{metric.label}</span>
                <strong className="metric-value">{metric.value}</strong>
                <span className="metric-detail">{metric.detail}</span>
              </article>
            ))}
          </section>
        )}

        <div className="content-stack">{children}</div>
      </main>
    </div>
  );
}
