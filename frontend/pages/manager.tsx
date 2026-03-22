import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { apiConfig } from '../lib/api';
import { getRole, getToken } from '../lib/auth';

type Product = {
  id: number;
  name: string;
  price: number;
  barcode: string;
};

type LineItem = {
  key: string;
  name: string;
  barcode: string;
  price: number;
  quantity: number;
  subtotal: number;
};

type Facture = {
  id: number;
  products: Product[];
  total: number;
  created_at: string;
};

export default function ManagerPage() {
  const router = useRouter();
  const [factures, setFactures] = useState<Facture[]>([]);
  const [status, setStatus] = useState('Connecting...');
  const [latest, setLatest] = useState<Facture | null>(null);

  useEffect(() => {
    const role = getRole();
    if (role !== 'manager') {
      router.replace('/');
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace('/');
      return;
    }

    const wsUrl = apiConfig.baseUrl.replace(/^http/, 'ws') + `/ws?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => setStatus('Connected');
    ws.onclose = () => setStatus('Disconnected');
    ws.onerror = () => setStatus('Error');
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as Facture;
        setFactures((prev: Facture[]) => [data, ...prev]);
        setLatest(data);
        setStatus('Receiving factures');
      } catch {
        setStatus('Parse error');
      }
    };

    return () => ws.close();
  }, [router]);

  useEffect(() => {
    if (!latest) return;
    const t = setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.print();
      }
    }, 150);
    return () => clearTimeout(t);
  }, [latest]);

  const manualPrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const groupProducts = (products: Product[]): LineItem[] => {
    const map = new Map<string, LineItem>();
    products.forEach((p) => {
      const key = `${p.barcode}-${p.price}-${p.name}`;
      const existing = map.get(key);
      if (existing) {
        existing.quantity += 1;
        existing.subtotal = existing.price * existing.quantity;
      } else {
        map.set(key, {
          key,
          name: p.name,
          barcode: p.barcode,
          price: p.price,
          quantity: 1,
          subtotal: p.price,
        });
      }
    });
    return Array.from(map.values());
  };

  return (
    <div className="page">
      <div className="card">
        <h1>Manager</h1>
        <p className="status">{status}</p>
        <div className="row" style={{ marginBottom: 8 }}>
          <span className="sub">Latest facture will auto-print</span>
          <button onClick={manualPrint} disabled={!factures.length}>
            Print latest
          </button>
        </div>
        <div className="list">
          {factures.length === 0 && <p className="muted">No factures yet</p>}
          {factures.map((f: Facture) => {
            const lines = groupProducts(f.products);
            return (
              <div key={f.id} className="facture">
                <div className="row">
                  <strong>Facture #{f.id}</strong>
                  <span className="sub">{new Date(f.created_at).toLocaleString()}</span>
                </div>
                <table className="ticket-table" style={{ width: '100%', marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Product</th>
                      <th style={{ textAlign: 'right' }}>Price</th>
                      <th style={{ textAlign: 'right' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={`${f.id}-${line.key}`}>
                        <td>{line.name}</td>
                        <td style={{ textAlign: 'right' }}>${line.price.toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>x{line.quantity}</td>
                        <td style={{ textAlign: 'right' }}>${line.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'right' }}>
                        Total
                      </td>
                      <td style={{ textAlign: 'right' }}>${f.total.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })}
        </div>
      </div>
      <div className="print-area" aria-hidden={true}>
        {latest && (
          <div className="ticket">
            <h2>Facture #{latest.id}</h2>
            <p className="sub">{new Date(latest.created_at).toLocaleString()}</p>
            <table className="ticket-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th style={{ textAlign: 'right' }}>Price</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {groupProducts(latest.products).map((line) => (
                  <tr key={`${latest.id}-${line.key}`}>
                    <td>{line.name}</td>
                    <td style={{ textAlign: 'right' }}>${line.price.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>x{line.quantity}</td>
                    <td style={{ textAlign: 'right' }}>${line.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>Total</td>
                  <td style={{ textAlign: 'right' }}>${latest.total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
