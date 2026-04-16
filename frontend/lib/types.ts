export type Product = {
  id: number;
  name: string;
  price: number;
  barcode: string;
};

export type Facture = {
  id: number;
  products: Product[];
  total: number;
  created_at: string;
};

export type LineItem = {
  key: string;
  name: string;
  barcode: string;
  price: number;
  quantity: number;
  subtotal: number;
};

export type NoticeTone = 'success' | 'error' | 'info' | 'warn';

export type Notice = {
  tone: NoticeTone;
  text: string;
};
