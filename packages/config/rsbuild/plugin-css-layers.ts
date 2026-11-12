import type { RsbuildPlugin } from '@rsbuild/core';

import { cssLayersPlugin } from './css-layers.ts';
import { createLayerResolver } from './layer-resolver.ts';

export interface CssLayersOptions {
  /** Layer for the app's own CSS Modules, for example `host` or `remotes.telemetry`. */
  readonly layer: string;
  /** Absolute path of the shared UI package; its CSS Modules go into `ui`. */
  readonly uiRoot: string;
}

/**
 * Registers the layer-wrapping PostCSS plugin. The app root comes from Rsbuild, so apps do not
 * pass file paths (and their config needs no Node types).
 */
export const pluginCssLayers = ({ layer, uiRoot }: CssLayersOptions): RsbuildPlugin => ({
  name: 'bulkhead:css-layers',
  setup(api) {
    const resolveLayer = createLayerResolver({
      appRoot: api.context.rootPath,
      appLayer: layer,
      uiRoot,
    });
    api.modifyRsbuildConfig((config, { mergeRsbuildConfig }) =>
      mergeRsbuildConfig(config, {
        tools: {
          postcss: (_postcssConfig, { addPlugins }) => {
            addPlugins(cssLayersPlugin(resolveLayer));
          },
        },
      }),
    );
  },
});
