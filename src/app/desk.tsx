"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { fromCents, lineTotalCents } from "@/lib/money";
import type { Policy } from "@/lib/policy";
import type { InvoiceView, Proposal, RateCardItem } from "@/lib/schemas";

const MOCK_BANNER = "MOCK PayPal. No request was sent to PayPal. Invoice ids are fake.";
const CANNED_BANNER = "CANNED MODEL OUTPUT, not live AI.";

type Modes = { paypal: "mock" | "sandbox"; llm: "canned" | "configured"; llmModel: string | null; warnings: string[] };
type ApiError = { code: string; message: string; details?: string[] };
type ModelState = { source: "CHECKING" | "LIVE_MODEL" | "CANNED"; model: string | null; error: string | null };
type EditLine = { description: string; quantity: string; unitPrice: string; unit: string | null; match: string; sourceSpan: [number, number] | null; sourcePhrase: string | null; flags: string[] };
type Draft = { clientName: string; clientEmail: string; currency: string; invoiceDate: string; lines: EditLine[] };
type Pending =
  | { kind: "remind"; subject: string; note: string }
  | { kind: "record_payment"; method: string; amount: string; note: string };
type Transcript = { tool: string; args: unknown; result: unknown; ok: boolean; source: string };
type AgentRun = { summary: string; pending: Pending | null; question: string | null; transcript: Transcript[]; decidedBy: string; modelError: string | null };

async function post<T>(url: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw { code: "NETWORK", message: "The request did not reach the server." } satisfies ApiError;
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw (data?.error ?? { code: `HTTP_${response.status}`, message: `The server answered ${response.status}.` }) as ApiError;
  return data as T;
}

const asApiError = (e: unknown): ApiError => (e && typeof e === "object" && "message" in e ? (e as ApiError) : { code: "ERROR", message: String(e) });

function ErrorBox({ error }: { error: ApiError | null }) {
  if (!error) return null;
  return (
    <div className="error" role="alert" data-testid="error">
      <strong>{error.message}</strong>
      {error.details?.length ? <ul>{error.details.map((d) => <li key={d}>{d}</li>)}</ul> : null}
    </div>
  );
}

function Highlighted({ text, lines }: { text: string; lines: EditLine[] }) {
  const spans = lines
    .map((line, index) => ({ span: line.sourceSpan, index }))
    .filter((s): s is { span: [number, number]; index: number } => Boolean(s.span))
    .sort((a, b) => a.span[0] - b.span[0]);
  const parts: ReactNode[] = [];
  let at = 0;
  for (const { span, index } of spans) {
    if (span[0] < at) continue; // Overlaps with the phrase before it.
    parts.push(text.slice(at, span[0]));
    parts.push(
      <mark key={index} data-testid="source-highlight">
        {text.slice(span[0], span[1])}
        <sup>{index + 1}</sup>
      </mark>,
    );
    at = span[1];
  }
  parts.push(text.slice(at));
  return <p className="source" data-testid="source-text">{parts}</p>;
}

function linePrice(line: EditLine): number | null {
  const quantity = Number(line.quantity);
  if (!(quantity > 0) || !/^\d+(\.\d{1,2})?$/.test(line.unitPrice)) return null;
  return lineTotalCents(quantity, line.unitPrice);
}

function RateCard({ card, setCard }: { card: RateCardItem[]; setCard: (c: RateCardItem[]) => void }) {
  const update = (i: number, patch: Partial<RateCardItem>) => setCard(card.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  return (
    <details className="ratecard">
      <summary>Rate card: example prices, edit to match yours</summary>
      <p className="hint">The agent matches work to this list. Prices come only from here, never from the model.</p>
      <table>
        <thead><tr><th>Item</th><th>Unit</th><th>Price</th><th>Currency</th><th /></tr></thead>
        <tbody>
          {card.map((item, i) => (
            <tr key={item.id}>
              <td><input aria-label="Item name" value={item.name} onChange={(e) => update(i, { name: e.target.value })} /></td>
              <td><input aria-label="Unit" value={item.unit} onChange={(e) => update(i, { unit: e.target.value })} /></td>
              <td><input aria-label="Price" inputMode="decimal" value={item.unitPrice} onChange={(e) => update(i, { unitPrice: e.target.value })} /></td>
              <td><input aria-label="Currency" maxLength={3} value={item.currency} onChange={(e) => update(i, { currency: e.target.value.toUpperCase() })} /></td>
              <td><button type="button" className="link" onClick={() => setCard(card.filter((_, j) => j !== i))}>Remove</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="link" onClick={() => setCard([...card, { id: `item-${Date.now()}`, name: "New item", unit: "each", unitPrice: "0.00", currency: card[0]?.currency ?? "USD" }])}>Add an item</button>
    </details>
  );
}

function InvoiceCard({ initial, mock }: { initial: InvoiceView; mock: boolean }) {
  const [invoice, setInvoice] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [days, setDays] = useState(14);
  const [note, setNote] = useState("");
  const [run, setRun] = useState<AgentRun | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const snapshot = mock ? { mockSnapshot: invoice } : {};
  async function action(label: string, body: Record<string, unknown>, doneText?: string) {
    setBusy(label);
    setError(null);
    setDone(null);
    try {
      const data = await post<{ invoice: InvoiceView }>(`/api/invoices/${encodeURIComponent(invoice.id)}/actions`, { ...body, ...snapshot });
      setInvoice(data.invoice);
      if (doneText) setDone(doneText);
      return true;
    } catch (e) {
      setError(asApiError(e));
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function chase() {
    setBusy("chase");
    setError(null);
    setDone(null);
    setRun(null);
    setPending(null);
    try {
      const data = await post<AgentRun & { invoice: InvoiceView | null }>("/api/agent", { invoiceId: invoice.id, userNote: note, overdueAfterDays: days, ...snapshot });
      setRun(data);
      setPending(data.pending);
      if (data.invoice) setInvoice(data.invoice);
    } catch (e) {
      setError(asApiError(e));
    } finally {
      setBusy(null);
    }
  }

  async function approvePending() {
    if (!pending) return;
    const today = new Date().toISOString().slice(0, 10);
    const ok =
      pending.kind === "remind"
        ? await action("approve", { action: "remind", approved: true, subject: pending.subject, note: pending.note, overdueAfterDays: days }, "Reminder call returned without an error. Status below is what was read back.")
        : await action("approve", { action: "record_payment", approved: true, method: pending.method, amount: pending.amount, paymentDate: today, ...(pending.note ? { note: pending.note } : {}) }, "Payment recorded. Status below is what was read back.");
    if (ok) setPending(null);
  }

  return (
    <article className="card invoice" data-testid="invoice-card">
      <header>
        <div>
          <span className="eyebrow">{invoice.source === "MOCK" ? "Mock invoice, fake id" : "PayPal sandbox invoice"}</span>
          <h3 data-testid="invoice-id">{invoice.id}</h3>
        </div>
        <span className={`status status-${(invoice.status ?? "unknown").toLowerCase()}`} data-testid="invoice-status">{invoice.status ?? "UNKNOWN"}</span>
      </header>
      <dl>
        <div><dt>Total</dt><dd>{invoice.total ?? "?"} {invoice.currency ?? ""}</dd></div>
        <div><dt>Still owed</dt><dd>{invoice.due ?? "not reported"}</dd></div>
        <div><dt>Invoice date</dt><dd>{invoice.invoiceDate ?? "?"}</dd></div>
        <div><dt>Recipient</dt><dd>{invoice.recipientEmail ?? "none"}</dd></div>
      </dl>
      {invoice.recipientViewUrl || invoice.invoicerViewUrl ? (
        <p className="links">
          {invoice.recipientViewUrl ? <a href={invoice.recipientViewUrl} target="_blank" rel="noreferrer">Payer view</a> : null}
          {invoice.invoicerViewUrl ? <a href={invoice.invoicerViewUrl} target="_blank" rel="noreferrer">Business view</a> : null}
        </p>
      ) : null}
      <div className="row">
        <button type="button" onClick={() => action("refresh", { action: "get" })} disabled={Boolean(busy)}>{busy === "refresh" ? "Reading..." : "Refresh status"}</button>
        {invoice.status === "DRAFT" ? (
          <button type="button" className="primary" onClick={() => action("send", { action: "send", approved: true }, "Send call returned without an error. Status below is what was read back.")} disabled={Boolean(busy)}>
            {busy === "send" ? "Sending..." : "Approve and send"}
          </button>
        ) : null}
      </div>
      {done ? <p className="done" data-testid="action-done">{done}</p> : null}
      <ErrorBox error={error} />
      {invoice.status !== "DRAFT" ? (
        <section className="chase">
          <h4>Chase this invoice</h4>
          <div className="row">
            <label>Overdue after <input type="number" min={0} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} data-testid="overdue-days" /> days</label>
          </div>
          <label>Anything the agent should know? (for example, "they paid cash yesterday")
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} data-testid="owner-note" />
          </label>
          <button type="button" onClick={chase} disabled={Boolean(busy)} data-testid="ask-agent">{busy === "chase" ? "Agent is working..." : "Ask the agent what to do next"}</button>
          {run ? (
            <div className="agent" data-testid="agent-result">
              <p className="summary" data-testid="agent-summary">{run.summary}</p>
              {run.decidedBy === "CANNED_RULES" ? <p className="labelled">Decided by canned rules, not live AI.{run.modelError ? ` Model error: ${run.modelError}` : ""}</p> : null}
              {run.question ? <p className="question">{run.question}</p> : null}
              <details>
                <summary>Tool calls ({run.transcript.length})</summary>
                <ol className="transcript" data-testid="transcript">
                  {run.transcript.map((t, i) => (
                    <li key={i} className={t.ok ? "" : "bad"}><code>{t.tool}</code> <span>{t.source}</span> {t.ok ? "ok" : "blocked or failed"}<pre>{JSON.stringify(t.ok ? t.args : t.result, null, 1)}</pre></li>
                  ))}
                </ol>
              </details>
            </div>
          ) : null}
          {pending?.kind === "remind" ? (
            <div className="gate" data-testid="pending">
              <h4>Reminder, waiting for your approval</h4>
              <label>Subject<input value={pending.subject} onChange={(e) => setPending({ ...pending, subject: e.target.value })} /></label>
              <label>Message<textarea rows={3} value={pending.note} onChange={(e) => setPending({ ...pending, note: e.target.value })} /></label>
              <button type="button" className="primary" onClick={approvePending} disabled={Boolean(busy)} data-testid="approve-pending">Approve and send reminder</button>
            </div>
          ) : null}
          {pending?.kind === "record_payment" ? (
            <div className="gate" data-testid="pending">
              <h4>Payment, waiting for your approval</h4>
              <p>Record <strong>{pending.amount} {invoice.currency}</strong> received by <strong>{pending.method}</strong>.</p>
              <button type="button" className="primary" onClick={approvePending} disabled={Boolean(busy)} data-testid="approve-pending">Approve and record payment</button>
            </div>
          ) : null}
        </section>
      ) : null}
    </article>
  );
}

export function Desk({ modes, policy, sampleNote, defaultRateCard }: { modes: Modes; policy: Policy; sampleNote: string; defaultRateCard: RateCardItem[] }) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<{ name: string; mimeType: string; base64: string } | null>(null);
  const [rateCard, setRateCard] = useState(defaultRateCard);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [createError, setCreateError] = useState<ApiError | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [invoices, setInvoices] = useState<InvoiceView[]>([]);
  const [model, setModel] = useState<ModelState>(modes.llm === "canned" ? { source: "CANNED", model: null, error: null } : { source: "CHECKING", model: modes.llmModel, error: null });

  const mock = modes.paypal === "mock";

  useEffect(() => {
    if (modes.llm === "canned") return;
    fetch("/api/model-check")
      .then((r) => r.json())
      .then((c) => setModel({ source: c.llmSource, model: c.llmModel, error: c.modelError }))
      .catch(() => setModel({ source: "CANNED", model: modes.llmModel, error: "The model check did not finish." }));
  }, [modes.llm, modes.llmModel]);

  async function pickImage(file: File | undefined) {
    if (!file) return setImage(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return setError({ code: "IMAGE", message: "Use a PNG, JPEG or WebP image." });
    if (file.size > 3_000_000) return setError({ code: "IMAGE", message: "Image is too large. The limit is about 3 MB." });
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    setError(null);
    setImage({ name: file.name, mimeType: file.type, base64: btoa(binary) });
  }

  async function propose() {
    setBusy(true);
    setError(null);
    setCreateError(null);
    setProposal(null);
    setDraft(null);
    try {
      const data = await post<{ proposal: Proposal; llmSource: "LIVE_MODEL" | "CANNED"; modelError: string | null }>("/api/propose", {
        text,
        rateCard,
        ...(image ? { image: { mimeType: image.mimeType, base64: image.base64 } } : {}),
      });
      setModel((m) => ({ source: data.llmSource, model: m.model, error: data.modelError }));
      setProposal(data.proposal);
      setDraft({
        clientName: data.proposal.clientName ?? "",
        clientEmail: data.proposal.clientEmail ?? "",
        currency: data.proposal.currency,
        invoiceDate: data.proposal.invoiceDate,
        lines: data.proposal.lines.map((l) => ({
          description: l.description,
          quantity: l.quantity === null ? "" : String(l.quantity),
          unitPrice: l.unitPrice ?? "",
          unit: l.unit,
          match: l.match,
          sourceSpan: l.sourceSpan,
          sourcePhrase: l.sourcePhrase,
          flags: l.flags,
        })),
      });
    } catch (e) {
      const err = asApiError(e);
      if (err.code === "MODEL_UNAVAILABLE") setModel((m) => ({ ...m, source: "CANNED", error: err.message }));
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const updateLine = (i: number, patch: Partial<EditLine>) => setDraft((d) => (d ? { ...d, lines: d.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) } : d));

  const review = useMemo(() => {
    if (!draft) return { total: null as string | null, problems: [] as string[] };
    const problems: string[] = [];
    if (!draft.lines.length) problems.push("Add at least one line.");
    let cents = 0;
    draft.lines.forEach((line, i) => {
      const lineCents = linePrice(line);
      if (lineCents === null) problems.push(`Line ${i + 1} needs a quantity and a price.`);
      else cents += lineCents;
    });
    const total = fromCents(cents);
    if (!policy.allowedCurrencies.includes(draft.currency.toUpperCase())) problems.push(`Policy: ${draft.currency} is not an allowed currency.`);
    if (cents > Number(policy.maxInvoiceAmount) * 100) problems.push(`Policy: total is over the ${policy.maxInvoiceAmount} per-invoice limit.`);
    return { total, problems };
  }, [draft, policy]);

  async function createDraft() {
    if (!draft) return;
    setCreating(true);
    setCreateError(null);
    try {
      const data = await post<{ invoice: InvoiceView }>("/api/invoices", {
        approved: true,
        draft: {
          clientName: draft.clientName || undefined,
          clientEmail: draft.clientEmail,
          currency: draft.currency.toUpperCase(),
          invoiceDate: draft.invoiceDate,
          lines: draft.lines.map((l) => ({ description: l.description, quantity: Number(l.quantity), unitPrice: l.unitPrice })),
        },
      });
      setInvoices((list) => [data.invoice, ...list]);
    } catch (e) {
      setCreateError(asApiError(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="page">
      <div className="banners" data-testid="banners">
        {mock ? <div className="banner red" data-testid="banner-mock">{MOCK_BANNER}</div> : <div className="banner sandbox" data-testid="banner-sandbox">PayPal SANDBOX</div>}
        {model.source === "CANNED" ? (
          <div className="banner red" data-testid="banner-canned">{CANNED_BANNER}{model.error ? ` Model error: ${model.error}` : ""}</div>
        ) : model.source === "LIVE_MODEL" ? (
          <div className="banner live" data-testid="banner-live-model">Live AI: {model.model}</div>
        ) : (
          <div className="banner neutral" data-testid="banner-checking">Checking the AI model...</div>
        )}
        {modes.warnings.map((w) => <div className="banner neutral" key={w}>{w}</div>)}
      </div>

      <header className="masthead">
        <h1>Billing Desk Agent</h1>
        <p>Paste the messy thing that means you are owed money. The agent drafts the PayPal invoice, and nothing goes out without your click.</p>
      </header>

      <main>
        <section className="card" aria-labelledby="step-input">
          <h2 id="step-input"><span>1</span> What happened?</h2>
          <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="An email thread, a chat message, a voice-memo transcript..." aria-label="Job note" data-testid="note" />
          <div className="row">
            <button type="button" onClick={() => setText(sampleNote)} data-testid="load-sample">Load sample</button>
            <label className="file">Add a photo
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => pickImage(e.target.files?.[0])} data-testid="image" />
            </label>
            {image ? <span className="hint">{image.name} <button type="button" className="link" onClick={() => setImage(null)}>Remove</button></span> : null}
            <button type="button" className="primary push" onClick={propose} disabled={busy || (!text.trim() && !image)} data-testid="propose">{busy ? "Reading..." : "Propose invoice"}</button>
          </div>
          <RateCard card={rateCard} setCard={setRateCard} />
          <ErrorBox error={error} />
        </section>

        {proposal?.status === "cannot_parse" ? (
          <section className="card" data-testid="cannot-parse">
            <h2><span>2</span> The agent could not make an invoice from this</h2>
            <p>{proposal.reason}</p>
          </section>
        ) : null}

        {proposal?.status === "proposed" && draft ? (
          <section className="card" aria-labelledby="step-review" data-testid="proposal">
            <h2 id="step-review"><span>2</span> Check the proposal</h2>
            {proposal.sourceText ? <><h3 className="sub">Where each line came from</h3><Highlighted text={proposal.sourceText} lines={draft.lines} /></> : null}

            {proposal.questions.length ? (
              <div className="questions" data-testid="questions">
                <h3 className="sub">The agent needs you to answer</h3>
                <ul>{proposal.questions.map((q) => <li key={q}>{q}</li>)}</ul>
              </div>
            ) : null}

            <div className="fields">
              <label>Client<input value={draft.clientName} onChange={(e) => setDraft({ ...draft, clientName: e.target.value })} data-testid="client-name" /></label>
              <label>Email<input type="email" value={draft.clientEmail} onChange={(e) => setDraft({ ...draft, clientEmail: e.target.value })} data-testid="client-email" /></label>
              <label>Currency<input maxLength={3} value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })} data-testid="currency" /></label>
              <label>Invoice date<input type="date" value={draft.invoiceDate} onChange={(e) => setDraft({ ...draft, invoiceDate: e.target.value })} data-testid="invoice-date" /></label>
            </div>

            <table className="lines">
              <thead><tr><th>#</th><th>Line</th><th>Qty</th><th>Unit price</th><th className="num">Amount</th><th /></tr></thead>
              <tbody>
                {draft.lines.map((line, i) => {
                  const cents = linePrice(line);
                  return (
                    <tr key={i} data-testid="line" className={line.flags.length ? "flagged" : ""}>
                      <td>{i + 1}</td>
                      <td>
                        <input aria-label={`Line ${i + 1} description`} value={line.description} onChange={(e) => updateLine(i, { description: e.target.value })} />
                        <span className={`match ${line.match}`}>{line.match === "matched" ? `Rate card${line.unit ? `, per ${line.unit}` : ""}` : "Not on the rate card"}</span>
                        {line.flags.map((f) => <span className="flag" key={f} data-testid="line-flag">{f}</span>)}
                      </td>
                      <td><input aria-label={`Line ${i + 1} quantity`} inputMode="decimal" value={line.quantity} onChange={(e) => updateLine(i, { quantity: e.target.value })} data-testid="line-qty" /></td>
                      <td><input aria-label={`Line ${i + 1} unit price`} inputMode="decimal" value={line.unitPrice} onChange={(e) => updateLine(i, { unitPrice: e.target.value })} data-testid="line-price" /></td>
                      <td className="num">{cents === null ? "-" : fromCents(cents)}</td>
                      <td><button type="button" className="link" onClick={() => setDraft({ ...draft, lines: draft.lines.filter((_, j) => j !== i) })}>Remove</button></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot><tr><td colSpan={4}>Total</td><td className="num" data-testid="draft-total">{review.total} {draft.currency}</td><td /></tr></tfoot>
            </table>

            <div className="gate">
              <h3 className="sub">Approval</h3>
              <p className="hint">Limit: {policy.maxInvoiceAmount} per invoice. Currencies: {policy.allowedCurrencies.join(", ")}. The server enforces these whatever this page says.</p>
              {review.problems.length ? <ul className="problems" data-testid="problems">{review.problems.map((p) => <li key={p}>{p}</li>)}</ul> : null}
              <button type="button" className="primary" onClick={createDraft} disabled={creating || review.problems.some((p) => !p.startsWith("Policy:"))} data-testid="create-draft">
                {creating ? "Creating..." : mock ? "Approve: create MOCK draft" : "Approve: create draft in PayPal sandbox"}
              </button>
              <ErrorBox error={createError} />
            </div>
          </section>
        ) : null}

        {invoices.length ? (
          <section aria-labelledby="step-invoices">
            <h2 id="step-invoices" className="outside"><span>3</span> Invoices this session</h2>
            {invoices.map((invoice) => <InvoiceCard key={invoice.id} initial={invoice} mock={mock} />)}
          </section>
        ) : null}
      </main>
      <footer>Fictional sample data. This app only ever talks to the PayPal sandbox. <a href="https://github.com/alexvec/paypal-ai-hackathon">Source</a></footer>
    </div>
  );
}
