import { publicModes } from "@/lib/config";
import { resolvePolicy } from "@/lib/policy";
import { DEFAULT_RATE_CARD, SAMPLE_NOTE } from "@/lib/samples";
import { Desk } from "./desk";

// Modes come from the environment on each request, so adding keys needs no code change.
export const dynamic = "force-dynamic";

export default function Page() {
  return <Desk modes={publicModes()} policy={resolvePolicy()} sampleNote={SAMPLE_NOTE} defaultRateCard={DEFAULT_RATE_CARD} />;
}
