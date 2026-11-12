/**
 * Cascade layer names and per-app layer policy (ADR 0007). The build config and the built-CSS
 * check both read from here, so an app's policy cannot drift between them.
 */

export const UI_LAYER = 'ui';
export const HOST_LAYER = 'host';
export const REMOTES_LAYER = 'remotes';

/** The page's layer order. The host's `index.html` declares it by hand; the check compares. */
export const LAYER_ORDER: readonly string[] = [
  'reset',
  'tokens',
  UI_LAYER,
  HOST_LAYER,
  REMOTES_LAYER,
];

/** A remote name becomes a layer name, so it must be a single lowercase CSS identifier. */
const REMOTE_NAME = /^[a-z][a-z0-9-]*$/;

export const remoteLayer = (name: string): string => `${REMOTES_LAYER}.${name}`;

export type AppTarget =
  { readonly kind: 'host' } | { readonly kind: 'remote'; readonly name: string };

export interface LayerPolicy {
  /** Layers the app may write to. A rule in a nested layer counts as part of its parent. */
  readonly allowedLayers: readonly string[];
  /** Only the host owns the document; remotes must not style `html`, `body` or `:root`. */
  readonly forbidRootSelectors: boolean;
  /** The order the app's `index.html` must declare, or `undefined` when it serves no page. */
  readonly layerOrder: readonly string[] | undefined;
}

const HOST_POLICY: LayerPolicy = {
  allowedLayers: LAYER_ORDER.filter((layer) => layer !== REMOTES_LAYER),
  forbidRootSelectors: false,
  layerOrder: LAYER_ORDER,
};

export const layerPolicy = (app: AppTarget): LayerPolicy => {
  if (app.kind === 'host') return HOST_POLICY;
  if (!REMOTE_NAME.test(app.name)) {
    throw new Error(`Invalid remote name "${app.name}": use lowercase letters, digits and "-"`);
  }
  return {
    allowedLayers: [UI_LAYER, remoteLayer(app.name)],
    forbidRootSelectors: true,
    layerOrder: undefined,
  };
};
