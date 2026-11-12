import { isAbsolute, relative } from 'node:path';

import { UI_LAYER } from '../layers.ts';

/** Returns the cascade layer a stylesheet belongs to, or `undefined` to leave it untouched. */
export type LayerResolver = (file: string | undefined) => string | undefined;

export interface LayerRules {
  /** Absolute path of the app being built; its CSS Modules go into `appLayer`. */
  readonly appRoot: string;
  readonly appLayer: string;
  /** Absolute path of the shared UI package; its CSS Modules always go into `ui`. */
  readonly uiRoot: string;
}

const CSS_MODULE_SUFFIX = '.module.css';

const isInside = (file: string, directory: string): boolean => {
  const path = relative(directory, file);
  return path !== '' && !path.startsWith('..') && !isAbsolute(path);
};

/**
 * Only CSS Modules are layered automatically. Global stylesheets (reset, tokens) declare their
 * layer explicitly, and CSS from anywhere else is left alone so the built-CSS check flags it.
 */
export const createLayerResolver =
  ({ appRoot, appLayer, uiRoot }: LayerRules): LayerResolver =>
  (file) => {
    if (!file?.endsWith(CSS_MODULE_SUFFIX)) return undefined;
    if (isInside(file, uiRoot)) return UI_LAYER;
    if (isInside(file, appRoot)) return appLayer;
    return undefined;
  };
