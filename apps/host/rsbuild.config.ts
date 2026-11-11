import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

import { sharedSingletons } from '@bulkhead/config/mf-shared';

// In development the host is the single origin: it proxies each remote under its own prefix,
// so the browser never talks to a second origin and module workers stay same-origin.
const remoteProxy = (port: number): { target: string; changeOrigin: boolean } => ({
  target: `http://localhost:${String(port)}`,
  changeOrigin: true,
});

export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/remotes/telemetry': remoteProxy(3001),
      '/remotes/response': remoteProxy(3002),
    },
  },
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'host',
      remotes: {
        telemetry: 'telemetry@/remotes/telemetry/mf-manifest.json',
        response: 'response@/remotes/response/mf-manifest.json',
      },
      shared: sharedSingletons,
      dts: false,
    }),
  ],
});
