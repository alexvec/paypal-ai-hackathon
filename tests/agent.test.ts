import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { buildAgentTools, runAgent } from "@/lib/agent";
import { spyGateway, stopResult, TODAY, usage, view } from "./helpers";

type Call = { name: string; args: unknown };

/** A scripted stand-in for the model. Each entry is one step: tool calls, or final text. */
function scriptedModel(steps: (Call[] | string)[]) {
  let index = 0;
  return new MockLanguageModelV4({
    doGenerate: async () => {
      const step = steps[index++];
      if (typeof step === "string") return stopResult(step);
      return {
        content: step.map((c, i) => ({ type: "tool-call" as const, toolCallId: `c${index}-${i}`, toolName: c.name, input: JSON.stringify(c.args) })),
        finishReason: { unified: "tool-calls" as const, raw: undefined },
        usage,
        warnings: [],
      };
    },
  });
}

const input = { invoiceId: "INV2-TEST-0001", userNote: "", overdueAfterDays: 14, today: TODAY };

describe("agent loop", () => {
  it("gives the model no tool that can write", () => {
    const names = Object.keys(buildAgentTools(spyGateway(), input, { pending: null, question: null, invoice: null, transcript: [] }));
    expect(names.sort()).toEqual(["ask_user", "get_invoice", "list_invoices", "propose_record_payment", "propose_reminder"]);
  });

  it("turns a model reminder proposal into a pending action and sends nothing", async () => {
    const gateway = spyGateway();
    const result = await runAgent(gateway, scriptedModel([[{ name: "get_invoice", args: {} }], [{ name: "propose_reminder", args: { subject: "Reminder", note: "Please pay." } }], "A reminder is ready for you."]), input);
    expect(result.pending).toEqual({ kind: "remind", subject: "Reminder", note: "Please pay." });
    expect(result.decidedBy).toBe("LIVE_MODEL");
    expect(result.transcript.map((t) => t.tool)).toEqual(["get_invoice", "propose_reminder"]);
    expect(gateway.sendReminder).not.toHaveBeenCalled();
  });

  it("blocks in code a reminder the model proposes on an invoice that is not overdue", async () => {
    const gateway = spyGateway(view({ invoiceDate: "2026-11-01" }));
    const result = await runAgent(gateway, scriptedModel([[{ name: "propose_reminder", args: { subject: "s", note: "n" } }], "Nothing to do."]), input);
    expect(result.pending).toBeNull();
    expect(result.transcript[0].ok).toBe(false);
    expect(JSON.stringify(result.transcript[0].result)).toContain("Blocked by code");
  });

  it("blocks in code a recorded amount above what is owed", async () => {
    const result = await runAgent(spyGateway(), scriptedModel([[{ name: "propose_record_payment", args: { method: "CASH", amount: "999.00", note: "" } }], "Done."]), { ...input, userNote: "they paid cash" });
    expect(result.pending).toBeNull();
    expect(result.transcript[0].ok).toBe(false);
  });

  it("passes a PayPal read failure to the transcript instead of hiding it", async () => {
    const gateway = spyGateway();
    gateway.getInvoice.mockRejectedValueOnce(new Error("PayPal is down"));
    const result = await runAgent(gateway, scriptedModel([[{ name: "get_invoice", args: {} }], "I could not read the invoice."]), input);
    expect(result.transcript[0]).toMatchObject({ tool: "get_invoice", ok: false });
    expect(result.summary).toContain("could not read");
  });
});

describe("model failure", () => {
  it("runs the canned rules, says so, and carries the provider error", async () => {
    const model = new MockLanguageModelV4({ doGenerate: async () => { throw new Error("gateway refused"); } });
    const gateway = spyGateway();
    const result = await runAgent(gateway, model, input);
    expect(result).toMatchObject({ decidedBy: "CANNED_RULES", llmSource: "CANNED" });
    expect(result.modelError).toContain("gateway refused");
    expect(gateway.sendReminder).not.toHaveBeenCalled();
  });
});

describe("canned rules, when no model is configured", () => {
  it("proposes a reminder when overdue and labels who decided", async () => {
    const result = await runAgent(spyGateway(), null, input);
    expect(result.decidedBy).toBe("CANNED_RULES");
    expect(result.pending?.kind).toBe("remind");
  });

  it("proposes a cash payment for the amount owed when the note says so", async () => {
    const result = await runAgent(spyGateway(), null, { ...input, userNote: "They paid cash yesterday" });
    expect(result.pending).toMatchObject({ kind: "record_payment", method: "CASH", amount: "315.00" });
  });

  it("does nothing for a paid invoice or an invoice not yet due", async () => {
    expect((await runAgent(spyGateway(view({ status: "PAID" })), null, input)).pending).toBeNull();
    expect((await runAgent(spyGateway(view({ invoiceDate: "2026-11-01" })), null, input)).pending).toBeNull();
  });
});
