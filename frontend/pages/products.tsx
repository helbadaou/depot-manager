import Head from 'next/head';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../components/AppShell';
import { ApiError, apiFetch } from '../lib/api';
import { clearSession, getRole, getToken } from '../lib/auth';
import { formatCurrency } from '../lib/format';
import { Notice, Product } from '../lib/types';

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [barcode, setBarcode] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const data = await apiFetch<Product[]>('/products');
      setProducts(data);
    } catch (error) {
      const apiError = error as ApiError;
      setNotice({ tone: 'error', text: apiError.message || 'Failed to load products.' });
    }
  };

  useEffect(() => {
    const role = getRole();
    const token = getToken();

    if (role !== 'sales' || !token) {
      clearSession();
      router.replace('/');
      return;
    }

    void load();
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

    if (!name.trim() || !price.trim() || !barcode.trim()) {
      setNotice({ tone: 'error', text: 'Name, price, and barcode are required.' });
      return;
    }

    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      setNotice({ tone: 'error', text: 'Price must be greater than zero.' });
      return;
    }

    setLoading(true);
    setNotice(null);

    try {
      const created = await apiFetch<Product>('/products', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: name.trim(),
          price: priceNum,
          barcode: barcode.trim(),
        }),
      });

      setProducts((prev) => [created, ...prev]);
      setName('');
      setPrice('');
      setBarcode('');
      setNotice({ tone: 'success', text: 'Product added to inventory.' });
    } catch (error) {
      const apiError = error as ApiError;
      setNotice({ tone: 'error', text: apiError.message || 'Failed to add product.' });
    } finally {
      setLoading(false);
    }
  };

  const averagePrice = useMemo(() => {
    if (products.length === 0) return 0;
    return products.reduce((sum, product) => sum + product.price, 0) / products.length;
  }, [products]);

  const metrics = [
    {
      label: 'Tracked products',
      value: products.length.toString(),
      detail: 'Visible across the sales and batch facture screens.',
    },
    {
      label: 'Average price',
      value: formatCurrency(averagePrice),
      detail: 'Current mean ticket value per stored product.',
    },
    {
      label: 'Newest product',
      value: products[0]?.name || 'None yet',
      detail: products[0]?.barcode || 'Add a product to populate the catalog.',
    },
  ];

  return (
    <>
      <Head>
        <title>Products | Depot Manager</title>
      </Head>

      <AppShell
        title="Inventory Catalog"
        eyebrow="Sales workspace"
        description="Keep shelf data clean before checkout. Every saved barcode flows directly into scanner sales and batch facture creation."
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
                <span className="eyebrow">Add stock</span>
                <h2>Create a product</h2>
              </div>
              <span className="status-pill neutral">Barcode required</span>
            </div>

            <form onSubmit={submit} className="form stack">
              <label>
                Product name
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Detergent 1L" />
              </label>

              <label>
                Price
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  inputMode="decimal"
                  placeholder="19.90"
                />
              </label>

              <label>
                Barcode
                <input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="6291041500214" />
              </label>

              <p className="field-note">Barcodes are mandatory because checkout and batch facture creation depend on them.</p>

              {notice && <div className={`alert ${notice.tone}`}>{notice.text}</div>}

              <button type="submit" className="button" disabled={loading}>
                {loading ? 'Saving product...' : 'Save product'}
              </button>
            </form>
          </article>

          <article className="surface">
            <div className="surface-header">
              <div>
                <span className="eyebrow">Inventory list</span>
                <h2>Available products</h2>
              </div>
            </div>

            {products.length === 0 ? (
              <div className="empty-state">
                <strong>No products yet</strong>
                <span>Add your first barcode-based product to start using checkout.</span>
              </div>
            ) : (
              <div className="inventory-grid">
                {products.map((product) => (
                  <article key={product.id} className="product-card">
                    <div className="product-card-top">
                      <strong>{product.name}</strong>
                      <span className="product-price">{formatCurrency(product.price)}</span>
                    </div>
                    <span className="barcode-chip">{product.barcode}</span>
                  </article>
                ))}
              </div>
            )}
          </article>
        </section>
      </AppShell>
    </>
  );
}
