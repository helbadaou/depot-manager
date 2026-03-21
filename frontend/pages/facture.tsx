import { FormEvent, useMemo, useState } from 'react';
import { apiFetch, ApiError } from '../lib/api';
import { getRole, getToken } from '../lib/auth';

type Product = {
  id: number;
  name: string;
  price: number;
  barcode: string;
};

type Facture = {
  id: number;
  products: Product[];
  total: number;
  created_at: string;
};

export default function FacturePage() {
  const [barcodes, setBarcodes] = useState<string>('');
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const token = getToken();
  const role = getRole();

  const parsedBarcodes = useMemo(
    () =>
      barcodes
        .split(/\n|,|;/)
        .map((b) => b.trim())
        .filter(Boolean),
    [barcodes]
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || role !== 'sales') {
      setStatus('Sales login required');
      return;
    }
    if (parsedBarcodes.length === 0) {
      setStatus('Add at least one barcode');
      return;
    }
    setSending(true);
    setStatus(null);
    try {
      const facture = await apiFetch<Facture>('/factures', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ barcodes: parsedBarcodes }),
      });
      setStatus(`Facture #${facture.id} created, total $${facture.total.toFixed(2)}`);
      setBarcodes('');
    } catch (err: any) {
      const apiErr = err as ApiError;
      setStatus(apiErr.message || 'Failed to create facture');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <h1>Create Facture</h1>
        <form onSubmit={submit} className="form">
          <label>
            Barcodes (comma, semicolon or newline separated)
            <textarea
              value={barcodes}
              onChange={(e) => setBarcodes(e.target.value)}
              rows={4}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
          </label>
          <button type="submit" disabled={sending}>
            {sending ? 'Creating...' : 'Create facture'}
          </button>
        </form>
        {status && <p className="status">{status}</p>}
      </div>
    </div>
  );
}
