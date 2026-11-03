import { fromCents } from "./money";
import { HttpError } from "./errors";

/**
 * The fictional shop's catalogue for this entry. Prices and limits live on the server: a visitor
 * chooses quantities only.
 */
export const CATALOG = [
  { sku: "MUG", name: "Stoneware mug", unitCents: 1400, finalSale: false },
  { sku: "TEA", name: "Loose-leaf tea tin", unitCents: 950, finalSale: false },
  { sku: "PRINT", name: "Custom name print (final sale)", unitCents: 2200, finalSale: true },
] as const;

export const SHOP_NAME = "Refund Referee test shop";
export const CURRENCY = "USD";
export const TAX_BASIS_POINTS = 800;
export const SHIPPING_CENTS = 500;
export const MAX_UNITS_PER_ITEM = 3;
export const MAX_ORDER_CENTS = 10_000;

export type Quantities = Record<string, number>;

export function isFinalSale(sku: string): boolean {
  return CATALOG.some((item) => item.sku === sku && item.finalSale);
}

export function priceCart(quantities: Quantities) {
  for (const [sku, units] of Object.entries(quantities)) {
    if (!CATALOG.some((item) => item.sku === sku)) throw new HttpError(400, "UNKNOWN_ITEM", `There is no item ${sku} in this shop.`);
    if (!Number.isInteger(units) || units < 0 || units > MAX_UNITS_PER_ITEM) throw new HttpError(400, "BAD_QUANTITY", `Each quantity must be a whole number from 0 to ${MAX_UNITS_PER_ITEM}.`);
  }
  const lines = CATALOG.filter((item) => (quantities[item.sku] ?? 0) > 0).map((item) => ({ ...item, units: quantities[item.sku] }));
  if (!lines.length) throw new HttpError(400, "EMPTY_CART", "Choose at least one item.");
  const itemTotalCents = lines.reduce((sum, line) => sum + line.unitCents * line.units, 0);
  const taxCents = Math.round((itemTotalCents * TAX_BASIS_POINTS) / 10_000);
  const totalCents = itemTotalCents + taxCents + SHIPPING_CENTS;
  if (totalCents > MAX_ORDER_CENTS) throw new HttpError(422, "ORDER_CAP", `A test order on this public demo cannot exceed $${fromCents(MAX_ORDER_CENTS)}.`);
  return { lines, itemTotalCents, taxCents, shippingCents: SHIPPING_CENTS, totalCents };
}

const money = (cents: number) => ({ currency_code: CURRENCY, value: fromCents(cents) });

/** The Orders v2 create body. Field names checked against PayPal's published Orders v2 schema. */
export function buildOrderBody(quantities: Quantities, customId: string, urls: { returnUrl: string; cancelUrl: string }) {
  const cart = priceCart(quantities);
  return {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: "default",
        custom_id: customId,
        description: `${SHOP_NAME}, sandbox test purchase`,
        amount: {
          ...money(cart.totalCents),
          breakdown: { item_total: money(cart.itemTotalCents), tax_total: money(cart.taxCents), shipping: money(cart.shippingCents) },
        },
        items: cart.lines.map((line) => ({ name: line.name, sku: line.sku, quantity: String(line.units), unit_amount: money(line.unitCents) })),
      },
    ],
    payment_source: {
      paypal: {
        experience_context: { brand_name: SHOP_NAME, shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW", return_url: urls.returnUrl, cancel_url: urls.cancelUrl },
      },
    },
  };
}
