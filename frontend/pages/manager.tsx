import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../components/AppShell';
import { ApiError, apiFetch, getWebSocketUrl } from '../lib/api';
import { clearSession, getRole, getToken } from '../lib/auth';
import { formatCurrency, formatDateTime, groupProducts } from '../lib/format';
import { Facture, Notice } from '../lib/types';

export default function ManagerPage() {
  const router = useRouter();
  const [factures, setFactures] = useState<Facture[]>([]);
  const [status, setStatus] = useState<Notice>({
    tone: 'info',
    text: 'Loading saved factures and connecting to the live feed...',
  });
  const [latest, setLatest] = useState<Facture | null>(null);

  useEffect(() => {
    const role = getRole();
    const token = getToken();

    if (role !== 'manager' || !token) {
      clearSession();
      router.replace('/');
      return;
    }

    let cancelled = false;

    const sortFactures = (incoming: Facture[]) => incoming.sort((left, right) => right.id - left.id);

    const triggerPrint = (facture: Facture) => {
      setLatest(facture);

      if (typeof window === 'undefined') return;

      window.setTimeout(() => {
        window.print();
      }, 160);
    };

    const loadHistory = async () => {
      try {
        const data = await apiFetch<Facture[]>('/factures', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (cancelled) return;

        const ordered = sortFactures([...data]);
        setFactures(ordered);
        setLatest(ordered[0] || null);
        setStatus({
          tone: ordered.length > 0 ? 'success' : 'info',
          text: ordered.length > 0 ? 'Saved factures loaded. Waiting for new receipts.' : 'No factures yet. Waiting for new receipts.',
        });
      } catch (error) {
        const apiError = error as ApiError;

        if (apiError.status === 401) {
          clearSession();
          router.replace('/');
          return;
        }

        if (cancelled) return;
        setStatus({ tone: 'error', text: apiError.message || 'Could not load saved factures.' });
      }
    };

    void loadHistory();

    const wsUrl = getWebSocketUrl(`/ws?token=${encodeURIComponent(token)}`);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      if (!cancelled) {
        setStatus({ tone: 'success', text: 'Live manager feed connected.' });
      }
    };

    ws.onclose = () => {
      if (!cancelled) {
        setStatus({ tone: 'warn', text: 'Live manager feed disconnected.' });
      }
    };

    ws.onerror = () => {
      if (!cancelled) {
        setStatus({ tone: 'error', text: 'A websocket error interrupted the live feed.' });
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as Facture;
        if (cancelled) return;

        setFactures((prev) => sortFactures([data, ...prev.filter((facture) => facture.id !== data.id)]));
        setStatus({ tone: 'success', text: `New facture #${data.id} received.` });
        triggerPrint(data);
      } catch {
        if (!cancelled) {
          setStatus({ tone: 'error', text: 'Could not parse the incoming facture payload.' });
        }
      }
    };

    return () => {
      cancelled = true;
      ws.close();
    };
  }, [router]);

  const manualPrint = (facture: Facture | null) => {
    if (!facture || typeof window === 'undefined') return;

    setLatest(facture);
    window.setTimeout(() => {
      window.print();
    }, 160);
  };

  const totalRevenue = useMemo(() => factures.reduce((sum, facture) => sum + facture.total, 0), [factures]);
  const totalUnits = useMemo(() => factures.reduce((sum, facture) => sum + facture.products.length, 0), [factures]);

  const metrics = [
    {
      label: 'Factures',
      value: factures.length.toString(),
      detail: 'Saved history plus the live queue in the current session.',
    },
    {
      label: 'Units sold',
      value: totalUnits.toString(),
      detail: 'Counted from every product line inside each facture.',
    },
    {
      label: 'Revenue tracked',
      value: formatCurrency(totalRevenue),
      detail: 'Combined total across all loaded and live factures.',
    },
  ];

  return (
    <>
      <Head>
        <title>Manager | Depot Manager</title>
      </Head>

      <AppShell
        title="Live Receipt Control"
        eyebrow="Manager workspace"
        description="Review queued receipts, keep an eye on incoming sales, and reprint any facture without leaving the live monitoring screen."
        role="manager"
        navItems={[{ href: '/manager', label: 'Live Feed' }]}
        metrics={metrics}
        actions={
          <div className="button-row">
            <button type="button" className="button" onClick={() => manualPrint(latest)} disabled={!latest}>
              Print latest
            </button>
          </div>
        }
      >
        <section className="content-grid content-grid--manager">
          <article className="surface">
            <div className="surface-header">
              <div>
                <span className="eyebrow">Queue status</span>
                <h2>Live print preview</h2>
              </div>
              <span className="status-pill neutral">{latest ? `Latest #${latest.id}` : 'Waiting'}</span>
            </div>

            <div className={`alert ${status.tone}`}>{status.text}</div>

            {latest ? (
              <div className="feature-ticket">
                <div className="feature-ticket-head">
                  <div>
                    <strong>Facture #{latest.id}</strong>
                    <span>{formatDateTime(latest.created_at)}</span>
                  </div>
                  <span className="feature-ticket-total">{formatCurrency(latest.total)}</span>
                </div>

                <div className="line-list">
                  {groupProducts(latest.products).map((line) => (
                    <div key={`${latest.id}-${line.key}`} className="line-chip">
                      <div>
                        <strong>{line.name}</strong>
                        <span>{line.barcode}</span>
                      </div>
                      <span>
                        {line.quantity} x {formatCurrency(line.price)}
                      </span>
                    </div>
                  ))}
                </div>

                <button type="button" className="button secondary" onClick={() => manualPrint(latest)}>
                  Reprint this facture
                </button>
              </div>
            ) : (
              <div className="empty-state">
                <strong>No receipt selected</strong>
                <span>Once the first facture arrives, it will appear here and auto-print.</span>
              </div>
            )}
          </article>

          <article className="surface">
            <div className="surface-header">
              <div>
                <span className="eyebrow">Receipt history</span>
                <h2>Recent factures</h2>
              </div>
            </div>

            {factures.length === 0 ? (
              <div className="empty-state">
                <strong>No factures yet</strong>
                <span>Sales receipts will appear here as soon as the checkout team sends them.</span>
              </div>
            ) : (
              <div className="facture-list">
                {factures.map((facture) => (
                  <article key={facture.id} className="facture-card">
                    <div className="facture-card-head">
                      <div>
                        <strong>Facture #{facture.id}</strong>
                        <span>{formatDateTime(facture.created_at)}</span>
                      </div>
                      <button type="button" className="button ghost small" onClick={() => manualPrint(facture)}>
                        Reprint
                      </button>
                    </div>

                    <div className="line-list compact">
                      {groupProducts(facture.products).map((line) => (
                        <div key={`${facture.id}-${line.key}`} className="line-chip">
                          <div>
                            <strong>{line.name}</strong>
                            <span>{line.barcode}</span>
                          </div>
                          <span>{formatCurrency(line.subtotal)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="facture-footer">
                      <span>{facture.products.length} units</span>
                      <strong>{formatCurrency(facture.total)}</strong>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </article>
        </section>

        <div className="print-area" aria-hidden={true}>
          {latest && (
            <div className="ticket">
              <h2>Facture #{latest.id}</h2>
              <p className="ticket-meta">{formatDateTime(latest.created_at)}</p>
              <table className="ticket-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Qty</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {groupProducts(latest.products).map((line) => (
                    <tr key={`${latest.id}-${line.key}`}>
                      <td>{line.name}</td>
                      <td>{formatCurrency(line.price)}</td>
                      <td>{line.quantity}</td>
                      <td>{formatCurrency(line.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}>Total</td>
                    <td>{formatCurrency(latest.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </AppShell>
    </>
  );
}
