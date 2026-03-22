import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { apiFetch, ApiError } from '../lib/api';
import { getRole, getToken } from '../lib/auth';

type Product = {
  id: number;
  name: string;
  price: number;
  barcode: string;
};

type CartItem = Product & { quantity: number };

export default function SalesPage() {
  const router = useRouter();
  const [barcode, setBarcode] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [lastKeystamp, setLastKeystamp] = useState<number | null>(null);
  const [isFast, setIsFast] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const token = getToken();

  useEffect(() => {
    const role = getRole();
    if (role !== 'sales') router.replace('/');
  }, [router]);

  const total = useMemo(() => cart.reduce((sum, p) => sum + p.price * p.quantity, 0), [cart]);

  const addProduct = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    try {
      const product = await apiFetch<Product>(`/products/barcode/${encodeURIComponent(trimmed)}`);
      setCart((prev) => {
        const existingIdx = prev.findIndex((p) => p.id === product.id || p.barcode === product.barcode);
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = { ...next[existingIdx], quantity: next[existingIdx].quantity + 1 };
          return next;
        }
        return [...prev, { ...product, quantity: 1 }];
      });
      setBarcode('');
      setLastKeystamp(null);
      setIsFast(false);
      setStatus(null);
    } catch (err: any) {
      const apiErr = err as ApiError;
      if (apiErr.status === 404) {
        setStatus('Product not found');
      } else {
        setStatus(apiErr.message || 'Product lookup failed');
      }
    }
  };

  const handleScan = (e: FormEvent) => {
    e.preventDefault();
    addProduct(barcode);
  };

  useEffect(() => {
    if (!barcode || !isFast) return;
    const t = setTimeout(() => {
      addProduct(barcode);
    }, 120);
    return () => clearTimeout(t);
  }, [barcode, isFast]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = performance.now();
    if (e.key === 'Enter') {
      e.preventDefault();
      addProduct(barcode);
      return;
    }

    if (e.key.length === 1) {
      if (lastKeystamp !== null) {
        const delta = now - lastKeystamp;
        setIsFast(delta <= 35);
      } else {
        setIsFast(false);
      }
      setLastKeystamp(now);
    }
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, idx) => idx !== index));
  };

  const clearCart = () => {
    setCart([]);
  };

  const updatePrice = (index: number, value: string) => {
    const priceNum = Number(value);
    if (Number.isNaN(priceNum) || priceNum < 0) return;
    setCart((prev) => prev.map((item, idx) => (idx === index ? { ...item, price: priceNum } : item)));
  };

  const updateQuantity = (index: number, value: string) => {
    const qtyNum = Number(value);
    if (!Number.isInteger(qtyNum) || qtyNum <= 0) return;
    setCart((prev) => prev.map((item, idx) => (idx === index ? { ...item, quantity: qtyNum } : item)));
  };

  const createFacture = async () => {
    if (cart.length === 0) {
      setStatus('Cart is empty');
      return;
    }
    if (!token) {
      router.replace('/');
      return;
    }
    setSending(true);
    setStatus(null);
    try {
      await apiFetch('/factures', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items: cart.map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            barcode: p.barcode,
            quantity: p.quantity,
          })),
        }),
      });
      setCart([]);
      setStatus('Facture sent to manager');
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
        <h1>Sales</h1>

        <form onSubmit={handleScan} className="form-inline" style={{ marginBottom: 12 }}>
          <input
            ref={inputRef}
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Scan or type barcode"
          />
          <button type="submit">Add</button>
        </form>
        <p className="sub">{isFast ? 'Scanner detected' : 'Manual typing'}</p>

        <div className="list" style={{ marginTop: 12 }}>
          {cart.length === 0 && <p className="muted">Cart is empty</p>}
          {cart.map((p, idx) => (
            <div key={`${p.id}-${idx}`} className="row" style={{ alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <strong>{p.name}</strong>
                <span className="sub">{p.barcode}</span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="sub">Price</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={p.price}
                  onChange={(e) => updatePrice(idx, e.target.value)}
                  style={{ width: 90 }}
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="sub">Qty</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={p.quantity}
                  onChange={(e) => updateQuantity(idx, e.target.value)}
                  style={{ width: 70 }}
                />
              </label>
              <div style={{ width: 110, textAlign: 'right' }}>${(p.price * p.quantity).toFixed(2)}</div>
              <button type="button" onClick={() => removeFromCart(idx)} style={{ background: '#ef4444' }}>
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="row total" style={{ marginTop: 12 }}>
          <span>Total</span>
          <strong>${total.toFixed(2)}</strong>
        </div>

        <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button type="button" onClick={createFacture} disabled={cart.length === 0 || sending}>
            {sending ? 'Sending...' : 'Create Facture'}
          </button>
          <button type="button" onClick={clearCart} disabled={cart.length === 0} style={{ background: '#6b7280' }}>
            Clear Cart
          </button>
        </div>

        {status && <p className="status">{status}</p>}
      </div>
    </div>
  );
}
