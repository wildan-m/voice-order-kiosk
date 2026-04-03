export interface CartItem {
  name: string;
  quantity: number;
  unitPrice: number;
  notes: string;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  confirmed: boolean;
}

const TAX_RATE = 0.08875;

function recalculate(cart: Cart): Cart {
  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const tax = subtotal * TAX_RATE;
  return {
    ...cart,
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round((subtotal + tax) * 100) / 100,
  };
}

export function createCart(): Cart {
  return {
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    confirmed: false,
  };
}

export function addItem(
  cart: Cart,
  name: string,
  quantity: number,
  unitPrice: number,
  notes: string = ""
): Cart {
  const existing = cart.items.find(
    (item) => item.name.toLowerCase() === name.toLowerCase() && item.notes === notes
  );

  let newItems: CartItem[];
  if (existing) {
    newItems = cart.items.map((item) =>
      item === existing
        ? { ...item, quantity: item.quantity + quantity }
        : item
    );
  } else {
    newItems = [...cart.items, { name, quantity, unitPrice, notes }];
  }

  return recalculate({ ...cart, items: newItems });
}

export function removeItem(cart: Cart, name: string): Cart {
  const newItems = cart.items.filter(
    (item) => item.name.toLowerCase() !== name.toLowerCase()
  );
  return recalculate({ ...cart, items: newItems });
}

export function modifyItem(
  cart: Cart,
  name: string,
  quantity: number
): Cart {
  if (quantity <= 0) {
    return removeItem(cart, name);
  }

  const newItems = cart.items.map((item) =>
    item.name.toLowerCase() === name.toLowerCase()
      ? { ...item, quantity }
      : item
  );

  return recalculate({ ...cart, items: newItems });
}

export function confirmOrder(cart: Cart): Cart {
  return { ...cart, confirmed: true };
}
