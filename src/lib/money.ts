/** Money is integer cents in code and a decimal string on the wire. */
export function toCents(value: string | number): number {
  const text = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error(`Not a money amount: ${text}`);
  const [whole, fraction = ""] = text.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}
