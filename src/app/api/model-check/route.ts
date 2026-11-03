import { NextResponse } from "next/server";
import { checkModel } from "@/lib/llm";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Makes one small real model call, cached per instance. The banner on the page uses this. */
export async function GET() {
  return NextResponse.json(await checkModel());
}
