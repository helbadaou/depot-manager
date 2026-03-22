import { FormEvent, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../lib/api';
import { getToken, getRole } from '../lib/auth';

type Product = {
  id: number;
  name: string;
  price: number;
  barcode: string;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [barcode, setBarcode] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const token = getToken();
  const role = getRole();

  const load = async () => {
    try {
      const data = await apiFetch<Product[]>('/products');
      setProducts(data);
    } catch (err: any) {
      setStatus(err.message || 'Failed to load products');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || role !== 'sales') {
      setStatus('Sales login required');
      return;
    }
    if (!name.trim() || !price.trim()) {
      setStatus('Name and price are required');
      return;
    }
    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      setStatus('Price must be > 0');
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const created = await apiFetch<Product>('/products', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), price: priceNum, barcode: barcode.trim() }),
      });
      setProducts((prev) => [created, ...prev]);
      setName('');
      setPrice('');
      setBarcode('');
      setStatus('Product added');
    } catch (err: any) {
      const apiErr = err as ApiError;
      setStatus(apiErr.message || 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <h1>Products</h1>
        <form onSubmit={submit} className="form" style={{ marginBottom: 12 }}>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Price
            <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
          </label>
          <label>
            Barcode (optional)
            <input value={barcode} onChange={(e) => setBarcode(e.target.value)} />
          </label>
          <button type="submit" disabled={loading}>Add product</button>
        </form>
        {status && <p className="status">{status}</p>}
        <div className="list">
          {products.length === 0 && <p className="muted">No products</p>}
          {products.map((p) => (
            <div key={p.id} className="row">
              <div>
                <strong>{p.name}</strong>
                <span className="sub">{p.barcode || 'no barcode'}</span>
              </div>
              <div>${p.price.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
