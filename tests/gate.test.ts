import { describe, expect, it } from "vitest";
import { HttpError } from "@/lib/errors";
import { createFromApproval, runInvoiceAction, type Deps } from "@/lib/service";
import { draft, policy, spyGateway, TODAY, view } from "./helpers";

const deps = (gateway = spyGateway()): Deps => ({ gateway, model: null, policy, today: TODAY });
const code = (error: unknown) => (error as HttpError).code;

describe("approval gate and policy, enforced in code", () => {
  it("does not create without an explicit approval", async () => {
    const gateway = spyGateway();
    for (const approved of [undefined, false, "true", 1]) {
      await expect(createFromApproval({ approved, draft }, deps(gateway))).rejects.toSatisfy((e) => code(e) === "APPROVAL_REQUIRED");
    }
    expect(gateway.createInvoice).not.toHaveBeenCalled();
  });

  it("blocks an over-limit invoice before PayPal is called", async () => {
    const gateway = spyGateway();
    const big = { ...draft, lines: [{ description: "Labour", quantity: 100, unitPrice: "85.00" }] };
    await expect(createFromApproval({ approved: true, draft: big }, deps(gateway))).rejects.toSatisfy((e) => code(e) === "POLICY_BLOCKED");
    expect(gateway.createInvoice).not.toHaveBeenCalled();
  });

  it("blocks a currency outside the policy", async () => {
    const gateway = spyGateway();
    await expect(createFromApproval({ approved: true, draft: { ...draft, currency: "JPY" } }, deps(gateway))).rejects.toSatisfy((e) => code(e) === "POLICY_BLOCKED");
    expect(gateway.createInvoice).not.toHaveBeenCalled();
  });

  it("rejects a draft with an unresolved line", async () => {
    const gateway = spyGateway();
    const open = { ...draft, lines: [{ description: "Labour", quantity: null, unitPrice: "85.00" }] };
    await expect(createFromApproval({ approved: true, draft: open }, deps(gateway))).rejects.toSatisfy((e) => code(e) === "DRAFT_INCOMPLETE");
    expect(gateway.createInvoice).not.toHaveBeenCalled();
  });

  it("creates a draft when approved and in policy", async () => {
    const gateway = spyGateway();
    await createFromApproval({ approved: true, draft }, deps(gateway));
    expect(gateway.createInvoice).toHaveBeenCalledOnce();
  });

  it.each([
    ["send", {}],
    ["remind", { subject: "s", note: "n", overdueAfterDays: 14 }],
    ["record_payment", { method: "CASH", amount: "1.00", paymentDate: TODAY }],
  ])("%s needs approval", async (action, rest) => {
    const gateway = spyGateway();
    await expect(runInvoiceAction("INV2-1", { action, ...rest }, deps(gateway))).rejects.toSatisfy((e) => code(e) === "APPROVAL_REQUIRED");
    expect(gateway.sendInvoice).not.toHaveBeenCalled();
    expect(gateway.sendReminder).not.toHaveBeenCalled();
    expect(gateway.recordPayment).not.toHaveBeenCalled();
  });

  it("checks the amount PayPal reports before send, and fails closed when it cannot be read", async () => {
    for (const current of [view({ status: "DRAFT", total: "9000.00" }), view({ status: "DRAFT", total: null }), view({ status: "DRAFT", recipientEmail: null }), view({ status: "SENT" })]) {
      const gateway = spyGateway(current);
      await expect(runInvoiceAction("INV2-1", { action: "send", approved: true }, deps(gateway))).rejects.toSatisfy((e) => code(e) === "POLICY_BLOCKED");
      expect(gateway.sendInvoice).not.toHaveBeenCalled();
    }
  });

  it("sends an in-policy draft once approved", async () => {
    const gateway = spyGateway(view({ status: "DRAFT" }));
    const result = await runInvoiceAction("INV2-1", { action: "send", approved: true }, deps(gateway));
    expect(gateway.sendInvoice).toHaveBeenCalledOnce();
    expect(result.status).toBe("SENT");
  });

  it("refuses a reminder on an invoice that is not overdue", async () => {
    const gateway = spyGateway(view({ invoiceDate: "2026-11-01" }));
    await expect(runInvoiceAction("INV2-1", { action: "remind", approved: true, subject: "s", note: "n", overdueAfterDays: 14 }, deps(gateway))).rejects.toSatisfy((e) => code(e) === "NOT_OVERDUE");
    expect(gateway.sendReminder).not.toHaveBeenCalled();
  });

  it("refuses to record more than is owed, or a payment on a settled invoice", async () => {
    for (const [current, amount] of [[view(), "999.00"], [view({ status: "PAID", due: "0.00" }), "1.00"]] as const) {
      const gateway = spyGateway(current);
      await expect(runInvoiceAction("INV2-1", { action: "record_payment", approved: true, method: "CASH", amount, paymentDate: TODAY }, deps(gateway))).rejects.toSatisfy((e) => code(e) === "PAYMENT_BLOCKED");
      expect(gateway.recordPayment).not.toHaveBeenCalled();
    }
  });
});
