import { getRedis } from '../../config/redis';
import { publishEvent } from '../../kafka/producer';

const CART_TTL = 60 * 60 * 24 * 30; // 30 days

export interface CartItem {
  id:           string;
  productId:    string;
  productName:  string;
  productImage: string;
  sellerId:     string;
  sellerName:   string;
  unitPrice:    number;
  quantity:     number;
  stock:        number;
}

function cartKey(userId: string) { return `cart:${userId}`; }

async function getItems(userId: string): Promise<CartItem[]> {
  const raw = await getRedis().get(cartKey(userId));
  return raw ? (JSON.parse(raw) as CartItem[]) : [];
}

async function saveItems(userId: string, items: CartItem[]): Promise<void> {
  await getRedis().setex(cartKey(userId), CART_TTL, JSON.stringify(items));
  publishEvent('cart.updated', { userId, itemCount: items.length }).catch(() => {});
}

export async function getCart(userId: string) {
  const items    = await getItems(userId);
  const total    = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  return { items, total, itemCount };
}

export async function addItem(userId: string, item: Omit<CartItem, 'id'>): Promise<CartItem[]> {
  const items = await getItems(userId);
  const idx   = items.findIndex(i => i.productId === item.productId);
  if (idx >= 0) {
    items[idx].quantity = Math.min(items[idx].quantity + item.quantity, item.stock);
  } else {
    items.push({ id: item.productId, ...item });
  }
  await saveItems(userId, items);
  return items;
}

export async function updateItem(userId: string, productId: string, quantity: number): Promise<CartItem[]> {
  const items   = await getItems(userId);
  const updated = items.map(i =>
    i.productId === productId ? { ...i, quantity: Math.min(Math.max(1, quantity), i.stock) } : i,
  );
  await saveItems(userId, updated);
  return updated;
}

export async function removeItem(userId: string, productId: string): Promise<CartItem[]> {
  const items    = await getItems(userId);
  const filtered = items.filter(i => i.productId !== productId);
  await saveItems(userId, filtered);
  return filtered;
}

export async function clearCart(userId: string): Promise<void> {
  await getRedis().del(cartKey(userId));
  publishEvent('cart.cleared', { userId }).catch(() => {});
}
