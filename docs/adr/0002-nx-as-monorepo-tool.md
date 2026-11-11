# 0002. Nx as the monorepo tool

- Status: Accepted
- Date: 2026-11-11

## Context

The repository holds several apps, services and packages in one pnpm workspace. CI should run only what a change affects, tasks must run in dependency order (a package builds before its consumers), results should be cached, and one command should start every dev server.

## Options considered

1. **Nx in package-based mode.** Tasks are inferred from each project's `package.json` scripts; `nx.json` holds caching and input rules.
2. **Turborepo.** Comparable task ordering and caching.
3. **pnpm scripts only** (`pnpm -r`). No extra tool.

## Decision

Option 1, with no Nx plugins, no generators and Nx Cloud disabled.

- `nx affected` computes what to run from the git diff and named inputs, which is what CI needs.
- `run-many` handles continuous targets, so `pnpm dev` starts the host and every remote together.
- Because targets are plain `package.json` scripts, every project can still be run without Nx (`pnpm --filter <name> <script>`).

Turborepo would also work; Nx was chosen for explicit named inputs, the affected computation and the project graph tooling. Plain pnpm scripts give no caching and no affected-only runs.

## Consequences

- Cacheable targets are `build`, `typecheck`, `lint` and `test`; `dev` is continuous and uncached. Their inputs and outputs are defined once in `nx.json`.
- The Nx version is pinned exactly. Its install script is not allowed to run in pnpm; Nx works without it.
- New projects follow one convention: a `package.json` with `lint`, `typecheck`, `test` and `build` scripts, plus `dev` where it applies. Nothing is generated.
- Replacing Nx later is cheap, because the task definitions live in the packages.
