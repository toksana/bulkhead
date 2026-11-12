import type { AtRule, ChildNode, Plugin, Root } from 'postcss';

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

const isAtRule = (node: ChildNode, name: string): node is AtRule =>
  node.type === 'atrule' && node.name === name;

const rejectImports = (root: Root): void => {
  const imported = root.nodes.find((node) => isAtRule(node, 'import'));
  if (imported) {
    throw imported.error(
      '@import is not allowed in CSS Modules; import the stylesheet from JavaScript instead',
    );
  }
};

const isOwnLayer = (name: string, layer: string): boolean =>
  name === layer || name.startsWith(`${layer}.`);

/**
 * A hand-written top-level `@layer` stays where it is, so it may only name the file's own layer or
 * a sublayer of it. Otherwise a remote could write into `ui` or `host`, and the built-CSS check
 * could not tell it apart from real shared styles. An anonymous top-level layer is rejected too:
 * it would sit after every named layer and beat them all.
 */
const rejectForeignLayers = (root: Root, layer: string): void => {
  const foreign = root.nodes
    .filter((node) => isAtRule(node, 'layer'))
    .find((node) =>
      node.params
        .split(',')
        .map((name) => name.trim())
        .some((name) => !isOwnLayer(name, layer)),
    );
  if (foreign) {
    const params = foreign.params.trim();
    const label = params === '' ? '(anonymous)' : params;
    throw foreign.error(
      `@layer ${label} is outside this file's layer; use "${layer}" or "${layer}.<name>"`,
    );
  }
};

/**
 * Wraps the unlayered part of a stylesheet in `@layer <name> { ... }`, where the name comes from
 * the resolver. `@charset`, `@namespace`, ICSS `:export`/`:import` and `@layer` statements or
 * blocks stay where they are, so they keep working and a file that already declares its layer is
 * not wrapped twice. A top-level `@layer` must name the file's own layer or a sublayer of it.
 * `@import` is rejected: it cannot be moved into a layer block, and CSS Modules should be imported
 * from JavaScript instead.
 *
 * The wrapping block is appended after any `@layer` nodes the file already has. Moving it does not
 * change the cascade: those nodes can only be the file's own layer or its sublayers, and rules
 * directly in a layer beat its sublayers' rules whatever the source order.
 */
export const cssLayersPlugin = (resolveLayer: LayerResolver): Plugin => ({
  postcssPlugin: 'bulkhead-css-layers',
  Once(root, { AtRule }) {
    const layer = resolveLayer(root.source?.input.file);
    if (layer === undefined) return;

    rejectImports(root);
    rejectForeignLayers(root, layer);

    const unlayered = root.nodes.filter((node) => !mustStayTopLevel(node));
    if (unlayered.every((node) => node.type === 'comment')) return;

    const block = new AtRule({ name: 'layer', params: layer });
    block.append(unlayered);
    root.append(block);
  },
});
