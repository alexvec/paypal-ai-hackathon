import type { NextConfig } from "next";

const config: NextConfig = {
  // The toolkit is a large CommonJS bundle. Load it from node_modules at runtime.
  serverExternalPackages: ["@paypal/agent-toolkit"],
};

export default config;
