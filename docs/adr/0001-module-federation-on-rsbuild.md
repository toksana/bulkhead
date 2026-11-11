# 0001. Module Federation 2.0 on Rsbuild

- Status: Accepted
- Date: 2026-11-11

## Context

The frontend is split into a host and independently built remotes (`telemetry`, `response`, later `history`). The host owns routing and auth; remotes are loaded at runtime. The remotes must share a single instance of React, and a remote must be able to start a module worker that renders to an `OffscreenCanvas`. The response remote must keep working when another remote fails to load, so the loading mechanism needs a manifest and a way to observe and recover from load failures.

## Options considered

1. **Module Federation 2.0 on Rsbuild** (`@module-federation/rsbuild-plugin`). Rspack-based builds, a generated `mf-manifest.json` per remote, a runtime with hooks for load failures and shared-scope inspection.
2. **Module Federation on Vite** (`@module-federation/vite`). Same federation model on a different build pipeline.
3. **Native Federation.** Bundler-agnostic, based on ES modules and import maps.

## Decision

Option 1.

The deciding factor was the combination that carries the most risk in this project: a federated remote that spawns a module worker. That combination was built and checked on Rsbuild (see ADR 0008): the worker script URL is derived from the remote's public path and resolves against the page origin, in both the dev server and a production build. It has not been evaluated on the other options.

Other reasons:

- The manifest records each remote's public path and shared dependencies, and the runtime exposes the negotiated share scope. In the current shell, `__FEDERATION__` shows React 19.3.1 provided by the host and used by the host and both remotes.
- The runtime hook for failed remote loads gives the host a place to render a fallback without taking down the response remote.
- Rsbuild and the Federation plugin are used together, so there is one build configuration style across the host and every remote.

## Consequences

- Every app has an async boundary at its entry (`index.ts` imports `bootstrap.tsx`), because shared dependencies must be negotiated before use.
- Shared singletons are declared once in `packages/config/mf-shared.ts`. Adding a shared dependency anywhere else is a violation of the architecture rules.
- Type generation by the plugin is turned off (`dts: false`). Contract types live in `packages/protocol` and are imported directly by both sides.
- A remote's `assetPrefix` is a root-relative path (`/remotes/<name>/`), so whatever serves the remotes must map that prefix. See ADR 0008.
- The plugin and `@rsbuild/core` versions are coupled by the plugin's peer range, so upgrades are checked together.
- Switching to another bundler later means redoing the build configuration of every app, but not the application code or the contracts between host and remotes.
