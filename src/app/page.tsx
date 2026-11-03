import { CATALOG, MAX_ORDER_CENTS, MAX_UNITS_PER_ITEM, SHIPPING_CENTS, TAX_BASIS_POINTS } from "@/lib/catalog";
import { connectionStatus } from "@/lib/config";
import { POLICY_CLAUSES } from "@/lib/policy";
import { Referee } from "./referee";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const text = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : null);
  return (
    <Referee
      connection={connectionStatus()}
      catalog={CATALOG.map((item) => ({ ...item }))}
      clauses={POLICY_CLAUSES.map((clause) => ({ ...clause }))}
      limits={{ maxUnits: MAX_UNITS_PER_ITEM, maxOrderCents: MAX_ORDER_CENTS, shippingCents: SHIPPING_CENTS, taxBasisPoints: TAX_BASIS_POINTS }}
      returned={{ order: text("order"), error: text("error"), cancelled: text("cancelled") === "1" }}
    />
  );
}
