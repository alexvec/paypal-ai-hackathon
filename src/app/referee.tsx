"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ClaimResult } from "@/lib/claim";
import type { ConnectionStatus } from "@/lib/config";
import type { Decision } from "@/lib/decide";
import type { CaseRecord } from "@/lib/record";

type CatalogItem = { sku: string; name: string; unitCents: number; finalSale: boolean };
type Clause = { id: string; title: string; text: string };
type Limits = { maxUnits: number; maxOrderCents: number; shippingCents: number; taxBasisPoints: number };
type ApiError = { code: string; message: string; step?: string; paypalStatus?: number | null; debugId?: string | null; issue?: string | null };
type CreatedOrder = { orderId: string; status: string; approvalUrl: string; debugId: string | null };
type ExtractOnly = { model: string; extraction: ClaimResult; unknownClauses: string[]; notice: string };
type CaseView = { message: string; record: CaseRecord; extraction: ClaimResult; decision: Decision; approvalToken: string | null; approvalExpiresAt: number | null };
type Receipt = {
  refundId: string;
  requestId: string;
  repeated: boolean;
  status: string;
  amount: string;
  currency: string;
  refundDebugId: string | null;
  readBackDebugId: string | null;
  rawRefund: unknown;
  rawReadBack: unknown;
};

const STORAGE_KEY = "refund-referee-orders";
const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const OUTCOME_LABEL: Record<Decision["outcome"], string> = {
  REFUND_FULL: "Refund in full",
  REFUND_PARTIAL: "Partial refund",
  DENY: "Deny",
  ASK_CUSTOMER: "Ask the customer",
  ESCALATE: "Escalate to the owner",
};

const FICTIONAL_EXAMPLE =
  "Fictional example, written for this demo. Hi, the mug I ordered turned up with a crack down the side. I paid $60 for the order last week and I would like my money back for it. The tea was fine.";

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: init?.body ? { "Content-Type": "application/json" } : undefined });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw (data?.error ?? { code: "NETWORK", message: `The server answered HTTP ${response.status}.` }) as ApiError;
  return data as T;
}

const asApiError = (error: unknown): ApiError => (error && typeof error === "object" && "message" in error ? (error as ApiError) : { code: "NETWORK", message: "The request did not reach the server." });

function ErrorNote({ error }: { error: ApiError | null }) {
  if (!error) return null;
  return (
    <div className="note bad" role="alert" data-testid="error">
      <p>{error.message}</p>
      {error.code === "PAYPAL_ERROR" ? (
        <p className="mono small">
          step {error.step}, HTTP {error.paypalStatus ?? "none"}
          {error.issue ? `, ${error.issue}` : ""}
          {error.debugId ? `, debug id ${error.debugId}` : ""}
        </p>
      ) : null}
    </div>
  );
}

function RawDrawer({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <details className="raw">
      <summary>{label}</summary>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}

function PayPalRecord({ record, onRefresh, busy }: { record: CaseRecord; onRefresh: () => void; busy: boolean }) {
  return (
    <div data-testid="record">
      <dl className="facts">
        <dt>Order</dt>
        <dd className="mono">{record.orderId}</dd>
        <dt>Order status</dt>
        <dd>{record.orderStatus}</dd>
        <dt>Capture</dt>
        <dd className="mono">{record.capture ? record.capture.id : "None yet"}</dd>
        {record.capture ? (
          <>
            <dt>Capture status</dt>
            <dd data-testid="capture-status">{record.capture.status}</dd>
            <dt>Captured</dt>
            <dd>
              {usd(record.capture.amountCents)} {record.currency}
              {record.capture.createTime ? ` on ${record.capture.createTime.slice(0, 10)}` : ""}
            </dd>
            <dt>Refunded so far</dt>
            <dd>{usd(record.refundedCents)}</dd>
            <dt>Left to refund</dt>
            <dd data-testid="remaining"><strong>{usd(record.remainingCents)}</strong></dd>
          </>
        ) : null}
      </dl>
      <div className="scroll">
        <table>
          <thead>
            <tr><th>Item</th><th className="num">Unit</th><th className="num">Bought</th><th className="num">Refunded</th></tr>
          </thead>
          <tbody>
            {record.lines.map((line) => (
              <tr key={line.id}>
                <td>{line.name}</td>
                <td className="num">{usd(line.unitCents)}</td>
                <td className="num">{line.quantity}</td>
                <td className="num">{line.refundedUnits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">Tax {usd(record.taxCents)}, shipping {usd(record.shippingCents)}, order total {usd(record.orderTotalCents)}.</p>
      {record.refunds.length ? (
        <ul className="hint mono small">
          {record.refunds.map((refund) => <li key={refund.id}>{refund.id}: {refund.status}, {usd(refund.amountCents)}</li>)}
        </ul>
      ) : null}
      <button type="button" onClick={onRefresh} disabled={busy}>Reload from PayPal</button>
    </div>
  );
}

function ClaimFields({ extraction }: { extraction: ClaimResult }) {
  if (extraction.status === "NEEDS_REVIEW") {
    return <div className="note warn" data-testid="needs-review"><strong>Needs review.</strong> {extraction.reason}</div>;
  }
  const { claim } = extraction;
  return (
    <>
      <dl className="facts" data-testid="claim">
        <dt>Language</dt><dd>{claim.language}</dd>
        <dt>Wants</dt><dd>{claim.outcome_wanted}</dd>
        <dt>Reason</dt><dd>{claim.reason_category}: {claim.reason_summary}</dd>
        <dt>Items named</dt>
        <dd>
          {claim.claimed_items.length === 0 ? "None named" : claim.claimed_items.map((item, index) => (
            <span className="block" key={index}>{item.line_id ?? "no matching line"}{item.quantity ? ` x ${item.quantity}` : ""}: &ldquo;{item.customer_words}&rdquo;</span>
          ))}
        </dd>
        <dt>Amount stated</dt><dd>{claim.asserted_amount ?? "None"}</dd>
        <dt>Date stated</dt><dd>{claim.asserted_date ?? "None"}</dd>
      </dl>
      <RawDrawer label="Validated JSON from the model" value={extraction} />
    </>
  );
}

export function Referee({ connection, catalog, clauses, limits, returned }: {
  connection: ConnectionStatus;
  catalog: CatalogItem[];
  clauses: Clause[];
  limits: Limits;
  returned: { order: string | null; error: string | null; cancelled: boolean };
}) {
  const paypalReady = connection.paypal.connected;
  const [quantities, setQuantities] = useState<Record<string, number>>({ MUG: 2, TEA: 1 });
  const [orders, setOrders] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(returned.order);
  const [created, setCreated] = useState<CreatedOrder | null>(null);
  const [record, setRecord] = useState<CaseRecord | null>(null);
  const [message, setMessage] = useState("");
  const [extractOnly, setExtractOnly] = useState<ExtractOnly | null>(null);
  const [caseView, setCaseView] = useState<CaseView | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<ApiError | null>(returned.error ? { code: "RETURN", message: returned.error.slice(0, 300) } : null);
  const [messageError, setMessageError] = useState<ApiError | null>(null);
  const [refundError, setRefundError] = useState<ApiError | null>(null);

  const cart = useMemo(() => {
    const items = catalog.reduce((sum, item) => sum + item.unitCents * (quantities[item.sku] ?? 0), 0);
    const tax = Math.round((items * limits.taxBasisPoints) / 10_000);
    return { items, tax, total: items ? items + tax + limits.shippingCents : 0 };
  }, [catalog, quantities, limits]);

  const loadOrder = useCallback(async (orderId: string) => {
    setBusy("record");
    setOrderError(null);
    try {
      const result = await call<{ record: CaseRecord }>(`/api/orders/${encodeURIComponent(orderId)}`);
      setRecord(result.record);
    } catch (error) {
      setRecord(null);
      setOrderError(asApiError(error));
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => {
    let saved: string[] = [];
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    } catch {
      saved = [];
    }
    const next = returned.order && !saved.includes(returned.order) ? [returned.order, ...saved] : saved;
    setOrders(next);
    if (returned.order) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.history.replaceState(null, "", "/");
      if (paypalReady && !returned.error) void loadOrder(returned.order);
    }
  }, [returned.order, returned.error, paypalReady, loadOrder]);

  async function createOrder() {
    setBusy("create");
    setOrderError(null);
    setCreated(null);
    try {
      const order = await call<CreatedOrder>("/api/orders", { method: "POST", body: JSON.stringify({ quantities }) });
      setCreated(order);
      setSelected(order.orderId);
      setRecord(null);
      const next = [order.orderId, ...orders.filter((id) => id !== order.orderId)].slice(0, 10);
      setOrders(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      setOrderError(asApiError(error));
    } finally {
      setBusy(null);
    }
  }

  async function captureSelected() {
    if (!selected) return;
    setBusy("capture");
    setOrderError(null);
    try {
      const result = await call<{ record: CaseRecord }>(`/api/orders/${encodeURIComponent(selected)}/capture`, { method: "POST" });
      setRecord(result.record);
    } catch (error) {
      setOrderError(asApiError(error));
    } finally {
      setBusy(null);
    }
  }

  function chooseOrder(orderId: string) {
    setSelected(orderId);
    setRecord(null);
    setCaseView(null);
    setReceipt(null);
    setCreated(null);
    void loadOrder(orderId);
  }

  const canOpenCase = Boolean(paypalReady && record?.capture);

  async function readMessage() {
    setBusy("message");
    setMessageError(null);
    setExtractOnly(null);
    setCaseView(null);
    setReceipt(null);
    setRefundError(null);
    try {
      if (canOpenCase && record) {
        const result = await call<Omit<CaseView, "message">>("/api/cases", { method: "POST", body: JSON.stringify({ orderId: record.orderId, message }) });
        setCaseView({ ...result, message });
        setRecord(result.record);
      } else {
        setExtractOnly(await call<ExtractOnly>("/api/extract", { method: "POST", body: JSON.stringify({ message }) }));
      }
    } catch (error) {
      setMessageError(asApiError(error));
    } finally {
      setBusy(null);
    }
  }

  async function approve() {
    if (!caseView?.approvalToken) return;
    setBusy("refund");
    setRefundError(null);
    try {
      const result = await call<{ receipt: Receipt; record: CaseRecord }>("/api/refunds", { method: "POST", body: JSON.stringify({ approvalToken: caseView.approvalToken, approved: true }) });
      setReceipt(result.receipt);
      setRecord(result.record);
      setCaseView({ ...caseView, record: result.record, approvalToken: null });
    } catch (error) {
      setRefundError(asApiError(error));
    } finally {
      setBusy(null);
    }
  }

  const decision = caseView?.decision ?? null;

  return (
    <main className="page">
      <header className="masthead">
        <h1>Refund Referee</h1>
        <p>A customer asks for money back. This checks their story against what PayPal recorded, works out what the shop owes under its policy, and refunds exactly that once the owner approves. PayPal sandbox only: no real money moves.</p>
        <ul className="status" data-testid="status">
          <li className={paypalReady ? "on" : "off"} data-testid="paypal-status">
            {paypalReady ? "PayPal sandbox: credentials set" : connection.paypal.message}
          </li>
          <li className={connection.model.connected ? "on" : "off"} data-testid="model-status">
            {connection.model.connected ? `Model: ${connection.model.id}` : connection.model.message}
          </li>
        </ul>
      </header>

      <section className="card">
        <h2><span>1</span>Test purchase</h2>
        <p className="hint">Items from a fictional shop. The app creates a real order in the PayPal sandbox, you approve it as the sandbox buyer, and the app captures it. You choose quantities. Prices are set on the server.</p>
        <div className="scroll">
          <table>
            <thead><tr><th>Item</th><th className="num">Price</th><th className="num">Quantity</th></tr></thead>
            <tbody>
              {catalog.map((item) => (
                <tr key={item.sku}>
                  <td>{item.name}</td>
                  <td className="num">{usd(item.unitCents)}</td>
                  <td className="num">
                    <input
                      aria-label={`Quantity of ${item.name}`}
                      className="qty"
                      type="number"
                      min={0}
                      max={limits.maxUnits}
                      value={quantities[item.sku] ?? 0}
                      onChange={(event) => setQuantities({ ...quantities, [item.sku]: Math.max(0, Math.min(limits.maxUnits, Math.floor(Number(event.target.value) || 0))) })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">Items {usd(cart.items)}, tax {usd(cart.tax)}, shipping {usd(limits.shippingCents)}. Total {usd(cart.total)}. Limit per order {usd(limits.maxOrderCents)}.</p>
        <div className="row">
          <button type="button" className="primary" onClick={createOrder} disabled={!paypalReady || busy !== null || cart.total === 0 || cart.total > limits.maxOrderCents} data-testid="create-order">
            {busy === "create" ? "Creating in PayPal..." : "Create sandbox order"}
          </button>
          {orders.length ? (
            <label className="inline">
              Your orders
              <select value={selected ?? ""} onChange={(event) => chooseOrder(event.target.value)} data-testid="order-select">
                <option value="" disabled>Choose</option>
                {orders.map((id) => <option key={id} value={id}>{id}</option>)}
              </select>
            </label>
          ) : null}
        </div>
        {!paypalReady ? <div className="note bad" data-testid="paypal-not-connected">{connection.paypal.message} No order can be created until then. Nothing here is simulated.</div> : null}
        {returned.cancelled ? <div className="note warn">The buyer cancelled in PayPal. Nothing was captured.</div> : null}
        <ErrorNote error={orderError} />
        {created ? (
          <div className="note good" data-testid="created-order">
            <p>Order <span className="mono">{created.orderId}</span> created in the PayPal sandbox, status {created.status}.</p>
            <p><a href={created.approvalUrl} data-testid="approval-link">Approve as the sandbox buyer</a>. PayPal sends you back here and the app captures the payment.</p>
            <button type="button" onClick={captureSelected} disabled={busy !== null}>I approved, but was not sent back: capture now</button>
          </div>
        ) : null}
        {record ? <><h3>PayPal&apos;s record</h3><PayPalRecord record={record} onRefresh={() => loadOrder(record.orderId)} busy={busy !== null} /></> : null}
        {record && !record.capture && record.orderStatus === "APPROVED" ? <button type="button" onClick={captureSelected} disabled={busy !== null}>Capture this approved order</button> : null}
      </section>

      <section className="card">
        <h2><span>2</span>Customer message</h2>
        <p className="hint">
          {canOpenCase
            ? "Write what the customer said, in any wording or language. It is checked against the order above."
            : "Write what a customer might say, in any wording or language. With no captured order selected, this runs the real model only: it shows what the model read, and makes no refund decision."}
        </p>
        <textarea rows={5} maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} aria-label="Customer message" data-testid="message" />
        <div className="row">
          <button type="button" className="primary" onClick={readMessage} disabled={busy !== null || !message.trim() || !connection.model.connected} data-testid="read-message">
            {busy === "message" ? "Reading..." : canOpenCase ? "Check against PayPal" : "Read with the model"}
          </button>
          <button type="button" onClick={() => setMessage(FICTIONAL_EXAMPLE)} data-testid="fill-example">Fill a fictional example</button>
          <span className="hint push">{message.length} / 2000</span>
        </div>
        <ErrorNote error={messageError} />
        {extractOnly ? (
          <div data-testid="extract-result">
            <div className="note warn" data-testid="extract-notice">{extractOnly.notice}</div>
            <h3>What {extractOnly.model} read</h3>
            <ClaimFields extraction={extractOnly.extraction} />
            {extractOnly.extraction.status === "VALID" ? (
              <>
                <h3>Clauses it cited</h3>
                <ul>{extractOnly.extraction.claim.clauses.map((clause, index) => <li key={index}><strong>{clause.id}</strong>: {clause.why}</li>)}</ul>
                {extractOnly.unknownClauses.length ? <div className="note warn">Not in the policy, so ignored: {extractOnly.unknownClauses.join(", ")}</div> : null}
                <h3>Drafted reply</h3>
                <p className="quote">{extractOnly.extraction.claim.draft_reply}</p>
              </>
            ) : null}
          </div>
        ) : null}
      </section>

      {caseView && decision ? (
        <section className="card" data-testid="case">
          <h2><span>3</span>The case</h2>
          <div className="columns">
            <div>
              <h3>The customer says</h3>
              <p className="quote">{caseView.message}</p>
              <ClaimFields extraction={caseView.extraction} />
            </div>
            <div>
              <h3>PayPal recorded</h3>
              <PayPalRecord record={caseView.record} onRefresh={() => loadOrder(caseView.record.orderId)} busy={busy !== null} />
            </div>
          </div>
          <h3>Where the story and the record disagree</h3>
          {decision.flags.length ? (
            <ul className="flags" data-testid="flags">
              {decision.flags.map((flag, index) => <li key={index} data-flag={flag.code}><strong>{flag.code.replaceAll("_", " ").toLowerCase()}</strong>: {flag.detail}</li>)}
            </ul>
          ) : <p className="hint" data-testid="no-flags">Nothing contradicts the record.</p>}
          <h3>Policy clauses the model cited</h3>
          {decision.citedClauses.length ? (
            <ul>{decision.citedClauses.map((clause, index) => <li key={index}><strong>{clause.id}</strong>: {clause.why}</li>)}</ul>
          ) : <p className="hint">None that exist in the policy.</p>}
          {caseView.extraction.status === "VALID" ? (<><h3>Drafted reply (for the owner to edit)</h3><p className="quote">{caseView.extraction.claim.draft_reply}</p></>) : null}
        </section>
      ) : null}

      {caseView && decision ? (
        <section className="card" data-testid="proposal">
          <h2><span>4</span>Proposed outcome</h2>
          <p className={`outcome ${decision.outcome}`} data-testid="outcome">{OUTCOME_LABEL[decision.outcome]}</p>
          <p data-testid="headline"><strong>{decision.headline}</strong></p>
          <ul>{decision.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul>
          {decision.arithmetic ? (
            <div className="scroll">
              <table data-testid="arithmetic">
                <tbody>
                  {decision.arithmetic.lines.map((line) => (
                    <tr key={line.id}><td>{line.units} x {line.name} at {usd(line.unitCents)}</td><td className="num">{usd(line.subtotalCents)}</td></tr>
                  ))}
                  <tr><td>Tax: {decision.arithmetic.taxFormula}</td><td className="num">{usd(decision.arithmetic.taxCents)}</td></tr>
                  <tr><td>Shipping. {decision.arithmetic.shippingNote}</td><td className="num">{usd(decision.arithmetic.shippingCents)}</td></tr>
                  <tr className="total"><td>Refund (capped at the {usd(decision.arithmetic.remainingBeforeCents)} PayPal shows left)</td><td className="num" data-testid="amount">{usd(decision.arithmetic.amountCents)}</td></tr>
                  <tr><td>Left on the capture afterwards</td><td className="num">{usd(decision.arithmetic.remainingAfterCents)}</td></tr>
                </tbody>
              </table>
            </div>
          ) : null}
          {caseView.approvalToken && decision.arithmetic ? (
            <div className="row">
              <button type="button" className="primary" onClick={approve} disabled={busy !== null} data-testid="approve">
                {busy === "refund" ? "Refunding in PayPal..." : `Approve: refund ${usd(decision.arithmetic.amountCents)} in the sandbox`}
              </button>
              <span className="hint">The model cannot press this. The server re-checks PayPal first.</span>
            </div>
          ) : null}
          <ErrorNote error={refundError} />
        </section>
      ) : null}

      {receipt ? (
        <section className="card" data-testid="receipt">
          <h2><span>5</span>Receipt from PayPal</h2>
          <dl className="facts">
            <dt>Refund id</dt><dd className="mono" data-testid="refund-id">{receipt.refundId}</dd>
            <dt>Status read back</dt><dd data-testid="refund-status">{receipt.status}</dd>
            <dt>Amount</dt><dd>{receipt.amount} {receipt.currency}</dd>
            <dt>Request id</dt><dd className="mono">{receipt.requestId}</dd>
            <dt>Refund debug id</dt><dd className="mono">{receipt.refundDebugId ?? "None returned"}</dd>
            <dt>Read-back debug id</dt><dd className="mono">{receipt.readBackDebugId ?? "None returned"}</dd>
          </dl>
          {receipt.repeated ? <div className="note warn">This approval had already run. PayPal&apos;s existing refund is shown, and no second refund was made.</div> : null}
          <RawDrawer label="Raw refund response (buyer and merchant identity removed)" value={receipt.rawRefund} />
          <RawDrawer label="Raw GET refund response (buyer and merchant identity removed)" value={receipt.rawReadBack} />
          <p className="hint">Find this refund in the sandbox business account&apos;s activity. Step 1 shows the record reloaded from PayPal, with less left to refund. A second claim for the same item is now blocked by that record.</p>
        </section>
      ) : null}

      <details className="card policy">
        <summary>The shop&apos;s policy (fictional)</summary>
        <ul>{clauses.map((clause) => <li key={clause.id}><strong>{clause.id}, {clause.title}.</strong> {clause.text}</li>)}</ul>
      </details>
    </main>
  );
}
