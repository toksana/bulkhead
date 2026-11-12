import type { ChildNode, Plugin } from 'postcss';

import type { LayerResolver } from './layer-resolver.ts';

/** At-rules that must stay at the top level of a stylesheet. */
const isTopLevelOnly = (node: ChildNode): boolean =>
  node.type === 'atrule' && (node.name === 'charset' || node.name === 'layer');

/**
 * Wraps the unlayered part of a stylesheet in `@layer <name> { ... }`, where the name comes from
 * the resolver. `@charset` and `@layer` statements or blocks stay where they are, so a file that
 * already declares its layer is not wrapped twice. `@import` is rejected: it cannot be moved
 * into a layer block, and CSS Modules should be imported from JavaScript instead.
 */
export const cssLayersPlugin = (resolveLayer: LayerResolver): Plugin => ({
  postcssPlugin: 'bulkhead-css-layers',
  Once(root, { AtRule }) {
    const layer = resolveLayer(root.source?.input.file);
    if (layer === undefined) return;

    const imported = root.nodes.find((node) => node.type === 'atrule' && node.name === 'import');
    if (imported) {
      throw imported.error(
        '@import is not allowed in CSS Modules; import the stylesheet from JavaScript instead',
      );
    }

    const unlayered = root.nodes.filter((node) => !isTopLevelOnly(node));
    if (unlayered.length === 0) return;

    const block = new AtRule({ name: 'layer', params: layer });
    block.append(unlayered);
    root.append(block);
  },
});
