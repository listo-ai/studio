import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { MF_SHARED_SINGLETONS } from "@listo/ui-core/mf";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ envMode }) => {
  const isTauri = envMode === "tauri";

  return {
    plugins: [pluginReact()],

    source: {
      entry: { index: "./src/index.ts" },
      // Explicitly forward PUBLIC_AGENT_URL from the shell environment so
      // `make dev` (dev/run.sh) can point each Studio at a different agent.
      // Falls back to the default standalone bind address.
      define: {
        "import.meta.env.PUBLIC_AGENT_URL": JSON.stringify(
          process.env.PUBLIC_AGENT_URL ?? "http://localhost:8080"
        ),
      },
    },

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    output: {
      target: "web",
      distPath: { root: isTauri ? "dist-tauri" : "dist-web" },
    },

    html: {
      template: "./index.html",
    },

    server: {
      port: 3000,
    },

    tools: {
      postcss: {
        postcssOptions: {
          plugins: [require("@tailwindcss/postcss")],
        },
      },
      rspack: (config, { appendPlugins }) => {
        const { ModuleFederationPlugin } = require("@module-federation/enhanced/rspack");

        appendPlugins(
          new ModuleFederationPlugin({
            name: "studio_host",
            // The host exposes the service registry so in-tree remote packages
            // can import it without bundling their own copy.
            exposes: {
              "./registry": "./src/providers/registry.tsx",
            },
            shared: MF_SHARED_SINGLETONS,
            // Point the DTS plugin at the actual output dir so type zips land
            // in the right place and don't throw ENOENT on the default dist/.
            dts: {
              generateTypes: { tsConfigPath: "./tsconfig.json" },
              outputDir: isTauri ? "dist-tauri" : "dist-web",
            },
          }),
        );

        if (isTauri) {
          config.devtool = "source-map";
        }
      },
    },
  };
});
