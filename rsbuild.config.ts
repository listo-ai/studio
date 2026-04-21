import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { createSharedSingletons } from "@listo/ui-core/mf";

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

    // Disable rsbuild's default `dev.lazyCompilation: { imports: true }`.
    // Lazy-compilation proxies are incompatible with Module Federation
    // shared singletons: the share-scope factory fetches chunks but the
    // lazy proxy defers actual module evaluation until the proxy's own
    // XHR callback fires, which doesn't happen inside an MF consume
    // path — chunks return 200 yet factories never run, leaving
    // `@listo/ui-core` / `@listo/ui-kit` stuck at `loaded: false` and
    // the React app never mounting (silent — no console errors).
    dev: {
      lazyCompilation: false,
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
            shared: createSharedSingletons(),
            // MF DTS type-zip generation is OFF: it's intended for remotes
            // published as npm packages where consumers fetch types at
            // build time. Inside this monorepo, types flow through
            // workspace:* symlinks — MF DTS just spawns tsc via `npx`,
            // which on some environments isn't on PATH and spams
            // #TYPE-001 on every HMR rebuild.
            dts: false,
          }),
        );

        if (isTauri) {
          config.devtool = "source-map";
        }
      },
    },
  };
});
