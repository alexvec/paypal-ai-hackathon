import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { getModel } from "../src/lib/llm";
import { runProof } from "./proof-run";

// Same precedence as Next: real environment first, then .env.local, then .env.
for (const file of [".env.local", ".env"]) {
  const path = resolve(process.cwd(), file);
  if (existsSync(path)) process.loadEnvFile(path);
}

void runProof({
  env: process.env,
  print: (line) => console.log(line),
  getModel: () => getModel(process.env),
  logDir: resolve(process.cwd(), "proof-logs"),
  sleep: (ms) => new Promise((done) => setTimeout(done, ms)),
  pollEveryMs: 5_000,
  approvalTimeoutMs: 10 * 60 * 1000,
}).then((code) => process.exit(code));
