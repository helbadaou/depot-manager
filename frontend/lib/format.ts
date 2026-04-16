import { LineItem, Product } from './types';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export function formatDateTime(value: string | Date) {
  return dateTimeFormatter.format(new Date(value));
}

export function groupProducts(products: Product[]): LineItem[] {
  const grouped = new Map<string, LineItem>();

  products.forEach((product) => {
    const key = `${product.barcode}-${product.price}-${product.name}`;
    const existing = grouped.get(key);

    if (existing) {
      existing.quantity += 1;
      existing.subtotal = existing.quantity * existing.price;
      return;
    }

    grouped.set(key, {
      key,
      name: product.name,
      barcode: product.barcode,
      price: product.price,
      quantity: 1,
      subtotal: product.price,
    });
  });

  return Array.from(grouped.values());
}
