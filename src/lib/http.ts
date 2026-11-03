import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { redactSecrets } from "./config";
import { HttpError } from "./errors";

export const OWNER_COOKIE = "rr_owner";

export function readCookie(request: Request, name: string): string | null {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=") || null;
  }
  return null;
}

export function setOwnerCookie(response: NextResponse, value: string, request: Request) {
  response.cookies.set(OWNER_COOKIE, value, { httpOnly: true, sameSite: "lax", secure: new URL(request.url).protocol === "https:", path: "/", maxAge: 30 * 24 * 60 * 60 });
}

/** Browsers send Origin on POST. A cross-site page cannot spend the model budget through a visitor. */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host;
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    originHost = "";
  }
  if (originHost !== host) throw new HttpError(403, "CROSS_ORIGIN", "This route only accepts requests from this site.");
}

const MAX_BODY_CHARS = 16_000;

export async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) throw new HttpError(413, "TOO_LARGE", "The request is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "BAD_JSON", "The request body is not valid JSON.");
  }
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: { code: error.code, message: error.message, ...error.extra } }, { status: error.status, headers: { "Cache-Control": "no-store" } });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: error.issues[0]?.message ?? "The request is not valid." } }, { status: 400 });
  }
  console.error("Unhandled route error", redactSecrets(error instanceof Error ? error.message : String(error)));
  return NextResponse.json({ error: { code: "SERVER_ERROR", message: "The request failed before finishing. Nothing was faked." } }, { status: 500 });
}

/** Wraps a route: same-origin check, JSON body handling and safe errors. */
export async function handle(request: Request, run: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    return await run();
  } catch (error) {
    return errorResponse(error);
  }
}
