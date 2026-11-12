import { parse } from 'postcss';
import type { AtRule, Node, Rule } from 'postcss';

export interface CssViolation {
  readonly kind: 'unlayered' | 'foreign-layer' | 'root-selector';
  /** What breaks the rule: a selector, or an at-rule such as `@font-face` or `@keyframes spin`. */
  readonly subject: string;
  /** Full layer path of the subject, for example `remotes.telemetry`. */
  readonly layer?: string;
}

export interface CssCheckOptions {
  /** Layers the app may write to. A rule in a nested layer counts as part of its parent. */
  readonly allowedLayers: readonly string[];
  /** Remotes must not style `html`, `body` or `:root`; only the host owns the document. */
  readonly forbidRootSelectors: boolean;
}

const ROOT_SELECTOR = /(^|[\s>+~(,])(html|body|:root)(?=$|[\s>+~.:#[,)])/;

/** At-rules that only group or condition what is inside them; their contents are checked instead. */
const GROUPING_AT_RULES: ReadonlySet<string> = new Set([
  'layer',
  'media',
  'supports',
  'container',
  'scope',
  'starting-style',
  'document',
]);

/** Top-level statements that hold no declarations and do not take part in layering. */
const STATEMENT_AT_RULES: ReadonlySet<string> = new Set(['charset', 'import', 'namespace']);

const isAtRule = (node: Node): node is AtRule => node.type === 'atrule';

const isRule = (node: Node): node is Rule => node.type === 'rule';

const isGrouping = (node: AtRule): boolean => GROUPING_AT_RULES.has(node.name);

/**
 * Any other at-rule is checked, so an unknown one fails closed. Name-defining at-rules
 * (`@font-face`, `@keyframes`, `@property`, `@counter-style`) and `@page` are layer-aware:
 * an unlayered one beats every layered one.
 */
const isCheckedAtRule = (node: AtRule): boolean =>
  !isGrouping(node) && !STATEMENT_AT_RULES.has(node.name);

/** Enclosing nodes from the outside in. Recursion depth is the nesting depth, a handful at most. */
const ancestors = (node: Node): Node[] =>
  node.parent ? [...ancestors(node.parent), node.parent] : [];

/** Rules and checked at-rules; declarations, comments and grouping at-rules are not subjects. */
const isSubject = (node: Node): node is Rule | AtRule =>
  isRule(node) || (isAtRule(node) && isCheckedAtRule(node));

/**
 * Only nodes wrapped in nothing but grouping at-rules are checked. This skips keyframe
 * selectors (`from`, `50%`) and at-rules nested in a checked one (`@top-left` in `@page`).
 */
const isOutermost = (enclosing: readonly AtRule[]): boolean => enclosing.every(isGrouping);

/** Joins enclosing `@layer` names from the outside in; `undefined` when the node is unlayered. */
const layerPath = (enclosing: readonly AtRule[]): string | undefined => {
  const names = enclosing
    .filter((parent) => parent.name === 'layer')
    .map((parent) => parent.params.trim());
  return names.length > 0 ? names.join('.') : undefined;
};

const isAllowed = (layer: string, allowed: readonly string[]): boolean =>
  allowed.some((name) => layer === name || layer.startsWith(`${name}.`));

const checkLayer = (
  subject: string,
  layer: string | undefined,
  options: CssCheckOptions,
): CssViolation[] => {
  if (layer === undefined) return [{ kind: 'unlayered', subject }];
  if (!isAllowed(layer, options.allowedLayers)) return [{ kind: 'foreign-layer', subject, layer }];
  return [];
};

const checkRule = (
  rule: Rule,
  layer: string | undefined,
  options: CssCheckOptions,
): CssViolation[] => {
  const violations = checkLayer(rule.selector, layer, options);
  if (options.forbidRootSelectors && rule.selectors.some((s) => ROOT_SELECTOR.test(s))) {
    violations.push({ kind: 'root-selector', subject: rule.selector, ...(layer && { layer }) });
  }
  return violations;
};

const describeAtRule = (node: AtRule): string => {
  const params = node.params.trim();
  return params === '' ? `@${node.name}` : `@${node.name} ${params}`;
};

const checkNode = (node: Node, options: CssCheckOptions): CssViolation[] => {
  if (!isSubject(node)) return [];
  const enclosing = ancestors(node).filter(isAtRule);
  if (!isOutermost(enclosing)) return [];
  const layer = layerPath(enclosing);
  return isRule(node)
    ? checkRule(node, layer, options)
    : checkLayer(describeAtRule(node), layer, options);
};

/**
 * Checks built CSS: every style rule and every layer-aware at-rule sits in an allowed layer,
 * and remotes stay off the document root.
 */
export const findViolations = (css: string, options: CssCheckOptions): CssViolation[] => {
  const violations: CssViolation[] = [];
  parse(css).walk((node) => {
    violations.push(...checkNode(node, options));
  });
  return violations;
};
