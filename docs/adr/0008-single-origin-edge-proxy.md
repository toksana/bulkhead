# 0008. Single-origin edge proxy

- Status: Accepted
- Date: 2026-11-11

## Context

The browser loads the host, two remotes, an HTTP API, server-sent events and a WebSocket. The telemetry remote starts a module worker, and browsers only allow a worker script to be loaded from the same origin as the page. If the remotes were served from their own origins, the worker URL (derived from the remote's public path) would be cross-origin. Authentication also relies on a cookie and a same-site policy, and the event stream and socket are simpler when they share the page's origin.

## Options considered

1. **One origin in front of everything.** A proxy maps path prefixes to the host, each remote, the BFF and the gateway.
2. **Each app on its own origin**, with CORS and a worker bootstrap that loads the real worker through a same-origin blob or wrapper.

## Decision

Option 1. The browser talks to a single origin.

- **Development:** the host's dev server is the origin and proxies `/remotes/telemetry` and `/remotes/response` to the remotes' dev servers.
- **Compose and production-like runs:** an `nginx` container serves the same path map.

| Path                                          | Target                             |
| --------------------------------------------- | ---------------------------------- |
| `/`                                           | host                               |
| `/remotes/telemetry/*`, `/remotes/response/*` | remote static assets and manifests |
| `/api/*`                                      | BFF (including the event stream)   |
| `/ws`                                         | telemetry gateway                  |

Each remote sets an explicit root-relative `assetPrefix` (`/remotes/<name>/`). The manifest then records a root-relative public path, so every chunk and worker script resolves against the page origin.

## Verification

Checked in a browser on the current shell:

- **Dev server:** the render worker script loaded from `http://localhost:3000/remotes/telemetry/static/js/async/...` (the host origin, not the remote's port) and ran at 60 fps.
- **Production build:** the same worker loaded from the page origin when the built apps were served under the path map above.
- **Main thread independence:** with the main thread blocked for 1.5 s, the worker kept drawing. It produced 120 frames over the block plus a 0.6 s recovery wait, in line with 60 fps. No long task appeared in 3 s of idle running.
- `transferControlToOffscreen()` works inside a federated remote. It can run only once per canvas, so the canvas is created inside the effect that starts the worker (React re-runs effects in development).

## Requirements for the proxy

These are not implemented yet and are tracked in the roadmap:

- **Event streams:** disable response buffering and caching, use HTTP/1.1 upstream, and set a long read timeout. Services send `X-Accel-Buffering: no` and `Cache-Control: no-cache` on `text/event-stream`. The dev proxy must not compress `text/event-stream`, or events arrive in batches.
- **WebSocket:** forward the `Upgrade` and `Connection` headers and use a long read timeout.
- **Static remotes:** serve each remote's build output under its prefix.

## Consequences

- Remotes must be deployed under their prefix. A remote served elsewhere needs its own build with a different `assetPrefix`.
- The remotes' dev servers allow CORS only from the host origin, for direct access during development. Normal traffic does not need CORS.
- The edge is on the path of every request, so it is a single point of failure for the UI. The trust and failure boundary around it is covered in a separate ADR.
- Cross-origin isolation headers (COOP/COEP), needed later for `SharedArrayBuffer`, are set in one place and apply to every remote.
