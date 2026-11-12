import { defineConfig } from '@rsbuild/core';

import { createRemoteConfig } from '@bulkhead/config/rsbuild';

export default defineConfig(
  createRemoteConfig({ name: 'response', port: 3002, exposes: { './App': './src/App.tsx' } }),
);
