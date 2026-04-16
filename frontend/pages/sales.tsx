import Head from 'next/head';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../components/AppShell';
import { ApiError, apiFetch } from '../lib/api';
import { clearSession, getRole, getToken } from '../lib/auth';
import { formatCurrency } from '../lib/format';
import { Notice, Product } from '../lib/types';

type CartItem = Product & {
  quantity: number;
};

export default function SalesPage() {
  const router = useRouter();
  const [barcode, setBarcode] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [sending, setSending] = useState(false);
  const [lastKeystamp, setLastKeystamp] = useState<number | null>(null);
  const [isFast, setIsFast] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scanTimerRef = useRef<number | null>(null);

  const clearScanTimer = () => {
    if (typeof window === 'undefined' || scanTimerRef.current === null) return;
    window.clearTimeout(scanTimerRef.current);
    scanTimerRef.current = null;
  };

  const focusBarcodeInput = () => {
    inputRef.current?.focus();
  };

  useEffect(() => {
    const role = getRole();
    const token = getToken();

    if (role !== 'sales' || !token) {
      clearSession();
      router.replace('/');
      return;
    }

    focusBarcodeInput();
  }, [router]);

  useEffect(() => clearScanTimer, []);

  const total = useMemo(() => cart.reduce((sum, product) => sum + product.price * product.quantity, 0), [cart]);
  const lineCount = cart.length;
  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const addProduct = async (code: string) => {
    clearScanTimer();

    const trimmed = code.trim();
    if (!trimmed) {
      focusBarcodeInput();
      return;
    }

    try {
      const product = await apiFetch<Product>(`/products/barcode/${encodeURIComponent(trimmed)}`);
      setCart((prev) => {
        const existingIdx = prev.findIndex((item) => item.id === product.id || item.barcode === product.barcode);

        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = {
            ...next[existingIdx],
            quantity: next[existingIdx].quantity + 1,
          };
          return next;
        }

        return [...prev, { ...product, quantity: 1 }];
      });

      setBarcode('');
      setLastKeystamp(null);
      setIsFast(false);
      setNotice(null);
    } catch (error) {
      const apiError = error as ApiError;

      if (apiError.status === 404) {
        setNotice({ tone: 'error', text: 'Product not found for this barcode.' });
      } else {
        setNotice({ tone: 'error', text: apiError.message || 'Product lookup failed.' });
      }
    } finally {
      focusBarcodeInput();
    }
  };

  const handleScan = (e: FormEvent) => {
    e.preventDefault();
    void addProduct(barcode);
  };

  useEffect(() => {
    clearScanTimer();

    if (!barcode || !isFast || typeof window === 'undefined') return;

    scanTimerRef.current = window.setTimeout(() => {
      void addProduct(barcode);
    }, 120);

    return clearScanTimer;
  }, [barcode, isFast]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = performance.now();

    if (e.key === 'Enter') {
      clearScanTimer();
      e.preventDefault();
      void addProduct(barcode);
      return;
    }

    if (e.key.length === 1) {
      if (lastKeystamp !== null) {
        setIsFast(now - lastKeystamp <= 35);
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
    setNotice(null);
    focusBarcodeInput();
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
      setNotice({ tone: 'error', text: 'Cart is empty.' });
      return;
    }

    const token = getToken();
    if (!token) {
      clearSession();
      router.replace('/');
      return;
    }

    setSending(true);
    setNotice(null);

    try {
      await apiFetch('/factures', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items: cart.map((product) => ({
            id: product.id,
            name: product.name,
            price: product.price,
            barcode: product.barcode,
            quantity: product.quantity,
          })),
        }),
      });

      setCart([]);
      setBarcode('');
      setNotice({ tone: 'success', text: 'Facture sent to the manager live queue.' });
    } catch (error) {
      const apiError = error as ApiError;
      setNotice({ tone: 'error', text: apiError.message || 'Failed to create facture.' });
    } finally {
      setSending(false);
      focusBarcodeInput();
    }
  };

  const metrics = [
    {
      label: 'Cart lines',
      value: lineCount.toString(),
      detail: 'Distinct products currently in the checkout cart.',
    },
    {
      label: 'Units',
      value: itemCount.toString(),
      detail: 'Total quantity across all line items.',
    },
    {
      label: 'Running total',
      value: formatCurrency(total),
      detail: 'Updates instantly when price or quantity changes.',
    },
  ];

  return (
    <>
      <Head>
        <title>Sales | Depot Manager</title>
      </Head>

      <AppShell
        title="Checkout Console"
        eyebrow="Sales workspace"
        description="Built for rapid barcode entry with manual overrides when needed. Scan products, tune price or quantity, then send the facture straight into the manager print queue."
        role="sales"
        navItems={[
          { href: '/sales', label: 'Checkout' },
          { href: '/products', label: 'Products' },
          { href: '/facture', label: 'Batch Facture' },
        ]}
        metrics={metrics}
        actions={
          <div className="button-row">
            <button type="button" className="button" onClick={createFacture} disabled={cart.length === 0 || sending}>
              {sending ? 'Sending...' : 'Create facture'}
            </button>
            <button type="button" className="button secondary" onClick={clearCart} disabled={cart.length === 0}>
              Clear cart
            </button>
          </div>
        }
      >
        <section className="content-grid content-grid--split">
          <article className="surface">
            <div className="surface-header">
              <div>
                <span className="eyebrow">Scanner input</span>
                <h2>Add products</h2>
              </div>
              <span className={`status-pill ${isFast ? 'success' : 'neutral'}`}>
                {isFast ? 'Scanner burst detected' : 'Manual entry mode'}
              </span>
            </div>

            <form onSubmit={handleScan} className="scan-form">
              <input
                ref={inputRef}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Scan or type barcode"
              />
              <button type="submit" className="button">
                Add item
              </button>
            </form>

            <p className="field-note">
              The field stays focused after every scan, and fast scanner bursts no longer double-submit items.
            </p>

            {notice && <div className={`alert ${notice.tone}`}>{notice.text}</div>}
          </article>

          <article className="surface">
            <div className="surface-header">
              <div>
                <span className="eyebrow">Checkout summary</span>
                <h2>Cart totals</h2>
              </div>
            </div>

            <div className="summary-grid">
              <div className="summary-tile">
                <span>Lines</span>
                <strong>{lineCount}</strong>
              </div>
              <div className="summary-tile">
                <span>Units</span>
                <strong>{itemCount}</strong>
              </div>
              <div className="summary-tile">
                <span>Total</span>
                <strong>{formatCurrency(total)}</strong>
              </div>
            </div>
          </article>
        </section>

        <section className="surface">
          <div className="surface-header">
            <div>
              <span className="eyebrow">Current sale</span>
              <h2>Cart items</h2>
            </div>
          </div>

          {cart.length === 0 ? (
            <div className="empty-state">
              <strong>Cart is empty</strong>
              <span>Scan a barcode to start the checkout flow.</span>
            </div>
          ) : (
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Barcode</th>
                    <th>Price</th>
                    <th>Qty</th>
                    <th>Subtotal</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {cart.map((product, idx) => (
                    <tr key={`${product.id}-${idx}`}>
                      <td>
                        <div className="table-title">
                          <strong>{product.name}</strong>
                        </div>
                      </td>
                      <td>{product.barcode}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={product.price}
                          onChange={(e) => updatePrice(idx, e.target.value)}
                          className="table-input"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={product.quantity}
                          onChange={(e) => updateQuantity(idx, e.target.value)}
                          className="table-input table-input--small"
                        />
                      </td>
                      <td>{formatCurrency(product.price * product.quantity)}</td>
                      <td className="table-action-cell">
                        <button type="button" className="button danger small" onClick={() => removeFromCart(idx)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </AppShell>
    </>
  );
}
