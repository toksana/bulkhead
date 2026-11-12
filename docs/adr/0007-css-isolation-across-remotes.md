# 0007. CSS isolation across remotes

- Status: Accepted
- Date: 2026-11-11

## Context

The host and each remote are built independently and their stylesheets end up on one page. Two problems follow:

- **Class name collisions.** Two apps can each have `src/components/Panel.module.css`. With the default production naming (`[local]-[hash]`, hashed on the relative path), both produce the same class name.
- **Unpredictable precedence.** CSS chunks load asynchronously, in whatever order the remotes arrive. Without an explicit cascade order, which rule wins depends on load timing and selector specificity.

The design tokens and shared components in `packages/ui` must sit below app styles, and the reset below everything.

## Options considered

1. **Tailwind with a per-remote prefix.** Fast to write. Each remote ships its own utilities and preflight, so duplication and preflight conflicts have to be managed, and the tokens move into Tailwind's theme.
2. **CSS Modules only.** Class names are scoped, but precedence between the reset, the UI package and apps still depends on load order.
3. **CSS Modules plus cascade layers.** Class names are scoped and prefixed with the app name, and every stylesheet sits in a named layer with a fixed order.

## Decision

Option 3.

### Class names

The shared Rsbuild config (`packages/config/rsbuild`) sets `localIdentName` to `<app>__[local]--[hash:base64:5]`, for example `telemetry__panel--a1b2c`. Apps cannot override it.

### Layer order

```css
@layer reset, tokens, ui, host, remotes;
```

- `reset` and `tokens` come first, then the shared components (`ui`), then the host shell, then remote content.
- Remotes use nested layers: `remotes.telemetry`, `remotes.response`. DevTools shows where a rule comes from, and the order between remotes can be set later if it is ever needed.
- `host` comes **before** `remotes`. Host and remote styles normally never meet: the host styles only its own elements, and remote class names are hashed. They meet only when something leaks, for example a host element selector or a `:global` rule reaching into a remote. In that case the remote should win, because it owns its content. With `host` last, a stray host rule would silently override a remote.
- The order is declared in an inline `<style>` in the host's `index.html`, before any script or stylesheet. A layer's position is fixed by its first appearance, and CSS chunks load asynchronously, so a statement inside a bundled stylesheet is not enough. This was found in practice: when the host's global stylesheet was imported after its own modules, the minified bundle started with `@layer host{…}`, which put `host` before `reset`.

### Ownership

- The host styles only its own elements, including the slot a remote renders into. It never styles anything inside a remote.
- A remote stays inside its root: no `:global` rules on `html`, `body` or `:root`. Only the host owns the document.
- If a remote needs to affect something outside its root, for example the height of its slot, that goes through the host contract or a CSS custom property on the slot element, not through selectors.

### Enforcement

- **Automatic layering at build time.** A PostCSS plugin in the shared config wraps every CSS Module in its layer. The layer name is a parameter: the app's own modules go into `host` or `remotes.<name>`, and modules from `packages/ui` go into `ui`.
  - `@charset` and `@layer` statements stay at the top level.
  - A file that already declares a layer block is not wrapped again; only its unlayered part is.
  - `@import` in a CSS Module is a build error, because it cannot be moved into a layer block. Stylesheets are imported from JavaScript instead.
- **Explicit global CSS.** The host's global stylesheets (reset, later tokens) are few and declare their layer by hand, where it is visible.
- **A check on the build output, not the sources.** `bulkhead-css-check` runs as the `css-check` target after `build`, locally and in CI. It catches mistakes the plugin cannot see, such as a wrong path match or CSS from a third-party library.
  - Every style rule must sit in a layer the app owns: `ui` plus its own layer for remotes, and `reset`, `tokens`, `ui`, `host` for the host.
  - Remotes must not contain `html`, `body` or `:root` selectors.
  - The host's `index.html` must declare exactly `reset, tokens, ui, host, remotes` before any script or stylesheet.

Each guard was checked against a deliberately broken build: a remote with `:global(body)`, a remote built with the plugin disabled, and a host template with `host` and `remotes` swapped all fail the check with the file and rule named.

## Consequences

- No `@import` in CSS Modules.
- Third-party CSS is not layered automatically. It has to be imported into a layer explicitly, for example with `@import url(...) layer(ui)` in a global stylesheet, or the build check fails.
- `noPropertyAccessFromIndexSignature` is off in the bundler TypeScript preset, because CSS Modules are typed as an index signature. `noUncheckedIndexedAccess` stays on, so each class is `string | undefined`. Typed CSS Modules can be added later if misspelled class names become a problem.
- The page's layer order lives in `apps/host/index.html`. A future Content Security Policy needs a hash or nonce for that inline `<style>`.
- A remote opened on its own dev server (outside the host) has no reset and no layer order. It is for isolated development only.
