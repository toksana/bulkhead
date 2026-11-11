import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

import { sharedSingletons } from '@bulkhead/config/mf-shared';

// Assets are addressed relative to the page origin, so the remote works behind the edge
// (see the single-origin proxy) and its workers resolve to the same origin as the host.
const assetPrefix = '/remotes/response/';

export default defineConfig({
  // Only the host origin may fetch the remote directly; everything else goes through its proxy.
  server: { port: 3002, cors: { origin: 'http://localhost:3000' } },
  dev: { assetPrefix },
  output: { assetPrefix },
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'response',
      exposes: { './App': './src/App.tsx' },
      shared: sharedSingletons,
      dts: false,
    }),
  ],
});
