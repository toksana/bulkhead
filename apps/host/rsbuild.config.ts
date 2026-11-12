import { defineConfig } from '@rsbuild/core';

import { createHostConfig } from '@bulkhead/config/rsbuild';

export default defineConfig(
  createHostConfig({
    remotes: [
      { name: 'telemetry', port: 3001 },
      { name: 'response', port: 3002 },
    ],
  }),
);
