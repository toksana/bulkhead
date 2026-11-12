import { defineConfig } from '@rsbuild/core';

import { createRemoteConfig } from '@bulkhead/config/rsbuild';

export default defineConfig(
  createRemoteConfig({ name: 'telemetry', port: 3001, exposes: { './App': './src/App.tsx' } }),
);
