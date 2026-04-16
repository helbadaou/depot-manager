import Head from 'next/head';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../components/AppShell';
import { ApiError, apiFetch } from '../lib/api';
import { clearSession, getRole, getToken } from '../lib/auth';
import { formatCurrency } from '../lib/format';
import { Facture, Notice } from '../lib/types';

export default function FacturePage() {
  const router = useRouter();
  const [barcodes, setBarcodes] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [sending, setSending] = useState(false);

  const parsedBarcodes = useMemo(
    () =>
      barcodes
        .split(/\n|,|;/)
        .map((barcode) => barcode.trim())
        .filter(Boolean),
    [barcodes]
  );

  const uniqueCount = useMemo(() => new Set(parsedBarcodes).size, [parsedBarcodes]);

  useEffect(() => {
    const role = getRole();
    const token = getToken();

    if (role !== 'sales' || !token) {
      clearSession();
      router.replace('/');
    }
  }, [router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    const token = getToken();
    const role = getRole();

    if (!token || role !== 'sales') {
      clearSession();
      router.replace('/');
      return;
    }

    if (parsedBarcodes.length === 0) {
      setNotice({ tone: 'error', text: 'Add at least one barcode.' });
      return;
    }

    setSending(true);
    setNotice(null);

    try {
      const facture = await apiFetch<Facture>('/factures', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ barcodes: parsedBarcodes }),
      });

      setNotice({
        tone: 'success',
        text: `Facture #${facture.id} created for ${formatCurrency(facture.total)}.`,
      });
      setBarcodes('');
    } catch (error) {
      const apiError = error as ApiError;
      setNotice({ tone: 'error', text: apiError.message || 'Failed to create facture.' });
    } finally {
      setSending(false);
    }
  };

  const metrics = [
    {
      label: 'Parsed entries',
      value: parsedBarcodes.length.toString(),
      detail: 'Every separator creates a new line item input.',
    },
    {
      label: 'Unique codes',
      value: uniqueCount.toString(),
      detail: 'Useful when the same barcode appears multiple times.',
    },
    {
      label: 'Duplicate scans',
      value: String(parsedBarcodes.length - uniqueCount),
      detail: 'Repeated codes are preserved and counted in the final facture.',
    },
  ];

  return (
    <>
      <Head>
        <title>Batch Facture | Depot Manager</title>
      </Head>

      <AppShell
        title="Batch Facture Builder"
        eyebrow="Sales workspace"
        description="Paste large barcode batches in one pass. The parser keeps duplicates, so bulk imports stay aligned with real stock movement."
        role="sales"
        navItems={[
          { href: '/sales', label: 'Checkout' },
          { href: '/products', label: 'Products' },
          { href: '/facture', label: 'Batch Facture' },
        ]}
        metrics={metrics}
      >
        <section className="content-grid content-grid--split">
          <article className="surface">
            <div className="surface-header">
              <div>
                <span className="eyebrow">Bulk entry</span>
                <h2>Paste barcode lines</h2>
              </div>
            </div>

            <form onSubmit={submit} className="form stack">
              <label>
                Barcodes
                <textarea
                  value={barcodes}
                  onChange={(e) => setBarcodes(e.target.value)}
                  rows={10}
                  placeholder={`6291041500214\n6291041500214\n8901234567890`}
                />
              </label>

              <p className="field-note">Use commas, semicolons, or new lines. Repeated barcodes stay repeated in the final facture.</p>

              {notice && <div className={`alert ${notice.tone}`}>{notice.text}</div>}

              <button type="submit" className="button" disabled={sending}>
                {sending ? 'Creating facture...' : 'Create facture'}
              </button>
            </form>
          </article>

          <article className="surface">
            <div className="surface-header">
              <div>
                <span className="eyebrow">Preview</span>
                <h2>Parsed barcodes</h2>
              </div>
              <span className="status-pill neutral">{parsedBarcodes.length} entries</span>
            </div>

            {parsedBarcodes.length === 0 ? (
              <div className="empty-state">
                <strong>No barcodes parsed</strong>
                <span>Paste barcode data to preview exactly what will be submitted.</span>
              </div>
            ) : (
              <div className="barcode-list">
                {parsedBarcodes.map((code, index) => (
                  <span key={`${code}-${index}`} className="barcode-chip">
                    {code}
                  </span>
                ))}
              </div>
            )}
          </article>
        </section>
      </AppShell>
    </>
  );
}
