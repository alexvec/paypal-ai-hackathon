/** An error that is safe to show to a visitor: status, stable code, plain message. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** A credential is absent. Nothing was called and nothing is faked. */
export class NotConnectedError extends HttpError {
  constructor(
    readonly service: "PayPal sandbox" | "Model",
    readonly missing: string[],
  ) {
    super(503, "NOT_CONNECTED", `${service} not connected: ${missing.map((name) => `${name} missing`).join(", ")}.`, { missing });
    this.name = "NotConnectedError";
  }
}
