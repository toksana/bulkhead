import type { ChildNode, Plugin } from 'postcss';

import type { LayerResolver } from './layer-resolver.ts';

/**
 * At-rules that stop working inside a layer block: `@charset` and `@namespace` are only valid at
 * the top level, and `@layer` statements or blocks already say where they belong.
 */
const TOP_LEVEL_AT_RULES: ReadonlySet<string> = new Set(['charset', 'namespace', 'layer']);

/** ICSS rules: css-loader reads `:export` and `:import(...)` only from the top level. */
const ICSS_SELECTOR = /^:(export|import\()/;

const mustStayTopLevel = (node: ChildNode): boolean =>
  (node.type === 'atrule' && TOP_LEVEL_AT_RULES.has(node.name)) ||
  (node.type === 'rule' && ICSS_SELECTOR.test(node.selector.trim()));

/**
 * Wraps the unlayered part of a stylesheet in `@layer <name> { ... }`, where the name comes from
 * the resolver. `@charset`, `@namespace`, ICSS `:export`/`:import` and `@layer` statements or
 * blocks stay where they are, so they keep working and a file that already declares its layer is
 * not wrapped twice. `@import` is rejected: it cannot be moved
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

    const unlayered = root.nodes.filter((node) => !mustStayTopLevel(node));
    if (unlayered.length === 0) return;

    const block = new AtRule({ name: 'layer', params: layer });
    block.append(unlayered);
    root.append(block);
  },
});
