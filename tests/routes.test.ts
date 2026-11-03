import { MockLanguageModelV4 } from "ai/test";
import nock from "nock";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as agentPost } from "@/app/api/agent/route";
import { GET as health } from "@/app/api/health/route";
import { POST as actionPost } from "@/app/api/invoices/[id]/actions/route";
import { POST as invoicesPost } from "@/app/api/invoices/route";
import { POST as proposePost } from "@/app/api/propose/route";
import { CANNED_MODEL_BANNER, MOCK_PAYPAL_BANNER, publicModes, resolveLlmMode, resolvePayPalMode } from "@/lib/config";
import { extract } from "@/lib/extract";
import { checkModel, clearModelCheckCache } from "@/lib/llm";
import { DEFAULT_RATE_CARD, SAMPLE_NOTE } from "@/lib/samples";
import { draft, stopResult } from "./helpers";

const json = (body: unknown) => new Request("http://test/api", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
const action = (id: string, body: unknown) => actionPost(json(body), { params: Promise.resolve({ id }) });
const KEYS = ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "LLM_PROVIDER", "LLM_MODEL", "AI_GATEWAY_API_KEY", "VERCEL_OIDC_TOKEN", "VERCEL"];

beforeAll(() => nock.disableNetConnect());
beforeEach(() => KEYS.forEach((k) => vi.stubEnv(k, "")));
afterEach(() => {
  vi.unstubAllEnvs();
  nock.cleanAll();
});
afterAll(() => nock.enableNetConnect());

describe("modes come from the environment at runtime", () => {
  it("uses the required banner wording", () => {
    expect(MOCK_PAYPAL_BANNER).toContain("MOCK PayPal. No request was sent to PayPal.");
    expect(CANNED_MODEL_BANNER).toContain("CANNED MODEL OUTPUT");
  });

  it("chooses each integration independently", () => {
    expect(publicModes({})).toMatchObject({ paypal: "mock", llm: "canned" });
    expect(publicModes({ PAYPAL_CLIENT_ID: "a", PAYPAL_CLIENT_SECRET: "b" })).toMatchObject({ paypal: "sandbox", llm: "canned" });
    expect(publicModes({ OPENAI_API_KEY: "k" })).toMatchObject({ paypal: "mock", llm: "configured", llmModel: "openai/gpt-4o" });
  });

  it("stays mock and warns when only one PayPal key is set", () => {
    const mode = resolvePayPalMode({ PAYPAL_CLIENT_ID: "a" });
    expect(mode.mode).toBe("mock");
    expect(mode.warning).toContain("PAYPAL_CLIENT_SECRET");
  });

  it("handles provider selection", () => {
    expect(resolveLlmMode({ ANTHROPIC_API_KEY: "a", OPENAI_API_KEY: "b" })).toMatchObject({ provider: "anthropic" });
    expect(resolveLlmMode({ ANTHROPIC_API_KEY: "a", OPENAI_API_KEY: "b", LLM_PROVIDER: "openai" })).toMatchObject({ provider: "openai", apiKey: "b" });
    expect(resolveLlmMode({ LLM_PROVIDER: "openai" }).mode).toBe("canned");
  });

  it("uses the AI Gateway with a Vercel runtime, an OIDC token or a gateway key, and a direct key wins", () => {
    for (const env of [{ VERCEL: "1" }, { VERCEL_OIDC_TOKEN: "t" }, { AI_GATEWAY_API_KEY: "k" }]) {
      expect(resolveLlmMode(env)).toMatchObject({ mode: "live", provider: "gateway", model: "anthropic/claude-haiku-5.5" });
    }
    expect(resolveLlmMode({ VERCEL: "1", OPENAI_API_KEY: "k" })).toMatchObject({ provider: "openai" });
    expect(resolveLlmMode({ LLM_PROVIDER: "gateway" }).mode).toBe("canned");
  });

  it("health returns 200 with the mode and no secret", async () => {
    vi.stubEnv("PAYPAL_CLIENT_ID", "visible-id-should-not-show");
    vi.stubEnv("PAYPAL_CLIENT_SECRET", "secret-should-not-show");
    const res = health();
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(JSON.parse(text)).toMatchObject({ status: "ok", paypal: "sandbox", source: "PAYPAL_SANDBOX" });
    expect(text).not.toContain("should-not-show");
  });
});

describe("mock path, end to end through the routes", () => {
  it("runs propose, approve, send, chase, remind, record, each labelled MOCK", async () => {
    const proposed = await (await proposePost(json({ text: SAMPLE_NOTE }))).json();
    expect(proposed).toMatchObject({ source: "MOCK", llmSource: "CANNED" });
    expect(proposed.proposal.lines).toHaveLength(3);

    const created = await (await invoicesPost(json({ approved: true, draft }))).json();
    expect(created.source).toBe("MOCK");
    expect(created.invoice.id).toMatch(/^MOCK-/);
    expect(created.invoice).toMatchObject({ status: "DRAFT", total: "315.00", source: "MOCK" });
    const id = created.invoice.id;

    const sent = await (await action(id, { action: "send", approved: true })).json();
    expect(sent.invoice.status).toBe("SENT");

    const chased = await (await agentPost(json({ invoiceId: id, overdueAfterDays: 0 }))).json();
    expect(chased.decidedBy).toBe("CANNED_RULES");
    expect(chased.source).toBe("MOCK");
    expect(chased.pending.kind).toBe("remind");

    const reminded = await action(id, { action: "remind", approved: true, subject: chased.pending.subject, note: chased.pending.note, overdueAfterDays: 0 });
    expect(reminded.status).toBe(200);

    const paying = await (await agentPost(json({ invoiceId: id, userNote: "They paid cash", overdueAfterDays: 14 }))).json();
    expect(paying.pending).toMatchObject({ kind: "record_payment", method: "CASH", amount: "315.00" });

    const paid = await (await action(id, { action: "record_payment", approved: true, method: "CASH", amount: "315.00", paymentDate: "2026-11-03" })).json();
    expect(paid.invoice).toMatchObject({ status: "PAID", source: "MOCK" });
  });

  it("restores a mock invoice from the browser snapshot on a fresh instance", async () => {
    const snapshot = { id: "MOCK-FROM-BROWSER", status: "DRAFT", number: null, currency: "USD", total: "10.00", due: "10.00", invoiceDate: "2026-11-01", paymentDueDate: null, recipientEmail: "sam@example.com", recipientName: null, recipientViewUrl: null, invoicerViewUrl: null, source: "MOCK" };
    const res = await action("MOCK-FROM-BROWSER", { action: "send", approved: true, mockSnapshot: snapshot });
    expect((await res.json()).invoice.status).toBe("SENT");
  });

  it("refuses non-sample input in canned mode instead of faking output", async () => {
    const res = await proposePost(json({ text: "Fixed a tap for a neighbour, 40 dollars." }));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("CANNED_SAMPLE_ONLY");
  });

  it("returns the policy block through the route", async () => {
    const res = await invoicesPost(json({ approved: true, draft: { ...draft, lines: [{ description: "x", quantity: 1000, unitPrice: "85.00" }] } }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("POLICY_BLOCKED");
    expect(body.error.details[0]).toContain("over the 5000.00");
  });
});

describe("real path selected by environment", () => {
  it("creates through the toolkit when keys are set and never falls back to the mock on failure", async () => {
    vi.stubEnv("PAYPAL_CLIENT_ID", "stub-id");
    vi.stubEnv("PAYPAL_CLIENT_SECRET", "stub-secret-value");
    const HOST = "https://api.sandbox.paypal.com";

    nock(HOST).post("/v1/oauth2/token").reply(401, { error_description: "Client Authentication failed" });
    const failed = await invoicesPost(json({ approved: true, draft }));
    const failure = await failed.json();
    expect(failed.status).toBe(502);
    expect(failure.source).toBe("PAYPAL_SANDBOX");
    expect(failure.invoice).toBeUndefined();
    expect(JSON.stringify(failure)).not.toContain("stub-secret-value");

    nock(HOST).post("/v1/oauth2/token").reply(200, { access_token: "t" });
    nock(HOST).post("/v2/invoicing/invoices").reply(201, { href: `${HOST}/v2/invoicing/invoices/INV2-REAL-PATH` });
    nock(HOST).get("/v2/invoicing/invoices/INV2-REAL-PATH").reply(200, { id: "INV2-REAL-PATH", status: "DRAFT", detail: { currency_code: "USD" }, amount: { value: "315.00", currency_code: "USD" } });
    const ok = await (await invoicesPost(json({ approved: true, draft }))).json();
    expect(ok.invoice).toMatchObject({ id: "INV2-REAL-PATH", status: "DRAFT", source: "PAYPAL_SANDBOX" });
  });
});

describe("live model path, with a stubbed model", () => {
  const output = { cannot_parse: false, cannot_parse_reason: null, transcription: "2 hrs labour", client_name: null, client_email: null, currency: null, invoice_date: null, line_items: [], questions: [] };

  it("sends the image to the model as an image part and labels the result live", async () => {
    let prompt: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const model = new MockLanguageModelV4({
      doGenerate: async (options) => {
        prompt = options.prompt;
        return stopResult(JSON.stringify(output));
      },
    });
    const result = await extract({ text: "", image: { mimeType: "image/png", base64: "aGVsbG8=" } }, DEFAULT_RATE_CARD, model);
    expect(result).toMatchObject({ llmSource: "LIVE_MODEL", modelError: null });
    expect(result.extraction.transcription).toBe("2 hrs labour");
    const user = prompt.find((m: { role: string }) => m.role === "user");
    expect(user.content.map((p: { type: string }) => p.type)).toEqual(["text", "file"]);
  });

  const failing = () => new MockLanguageModelV4({ doGenerate: async () => { throw new Error("A payment card is required"); } });

  it("falls back to canned output for the sample when the model fails, labelled, with the error text", async () => {
    const result = await extract({ text: SAMPLE_NOTE }, DEFAULT_RATE_CARD, failing());
    expect(result.llmSource).toBe("CANNED");
    expect(result.modelError).toContain("A payment card is required");
  });

  it("refuses other input when the model fails, instead of faking it, and gives the error text", async () => {
    const error = await extract({ text: "Fixed a tap, 40 dollars." }, DEFAULT_RATE_CARD, failing()).catch((e) => e);
    expect(error.code).toBe("MODEL_UNAVAILABLE");
    expect(error.message).toContain("A payment card is required");
  });

  it("model check reports canned with no model and never claims live without a real call", async () => {
    clearModelCheckCache();
    expect(await checkModel({})).toMatchObject({ llmSource: "CANNED", modelError: null });
    // No network in tests, so a configured gateway call fails. It must come back canned.
    nock.disableNetConnect();
    const result = await checkModel({ AI_GATEWAY_API_KEY: "stub-gateway-key" }, Date.now());
    expect(result.llmSource).toBe("CANNED");
    expect(result.modelError).toBeTruthy();
    expect(result.modelError).not.toContain("stub-gateway-key");
    clearModelCheckCache();
  });
});
