import { parse } from 'postcss';
import type { AtRule, Node, Rule } from 'postcss';

export interface CssViolation {
  readonly kind: 'unlayered' | 'foreign-layer' | 'root-selector';
  readonly selector: string;
  /** Full layer path of the rule, for example `remotes.telemetry`. */
  readonly layer?: string;
}

export interface CssCheckOptions {
  /** Layers the app may write to. A rule in a nested layer counts as part of its parent. */
  readonly allowedLayers: readonly string[];
  /** Remotes must not style `html`, `body` or `:root`; only the host owns the document. */
  readonly forbidRootSelectors: boolean;
}

const ROOT_SELECTOR = /(^|[\s>+~(,])(html|body|:root)(?=$|[\s>+~.:#[,)])/;

const isAtRule = (node: Node): node is AtRule => node.type === 'atrule';

const ancestors = (rule: Rule): Node[] => {
  const chain: Node[] = [];
  for (let node: Node | undefined = rule.parent; node; node = node.parent) chain.unshift(node);
  return chain;
};

/** Joins enclosing `@layer` names from the outside in; `undefined` when the rule is unlayered. */
const layerPath = (rule: Rule): string | undefined => {
  const names = ancestors(rule)
    .filter(isAtRule)
    .filter((node) => node.name === 'layer')
    .map((node) => node.params.trim());
  return names.length > 0 ? names.join('.') : undefined;
};

/** Keyframe selectors (`from`, `50%`) are not style rules and do not take part in layering. */
const isKeyframe = (rule: Rule): boolean =>
  ancestors(rule)
    .filter(isAtRule)
    .some((node) => node.name.endsWith('keyframes'));

const isAllowed = (layer: string, allowed: readonly string[]): boolean =>
  allowed.some((name) => layer === name || layer.startsWith(`${name}.`));

const checkRule = (rule: Rule, options: CssCheckOptions): CssViolation[] => {
  const layer = layerPath(rule);
  const violations: CssViolation[] = [];
  if (layer === undefined) {
    violations.push({ kind: 'unlayered', selector: rule.selector });
  } else if (!isAllowed(layer, options.allowedLayers)) {
    violations.push({ kind: 'foreign-layer', selector: rule.selector, layer });
  }
  if (options.forbidRootSelectors && rule.selectors.some((s) => ROOT_SELECTOR.test(s))) {
    violations.push({ kind: 'root-selector', selector: rule.selector, ...(layer && { layer }) });
  }
  return violations;
};

/** Checks built CSS: every style rule sits in an allowed layer, and remotes stay off the document root. */
export const findViolations = (css: string, options: CssCheckOptions): CssViolation[] => {
  const violations: CssViolation[] = [];
  parse(css).walkRules((rule) => {
    if (!isKeyframe(rule)) violations.push(...checkRule(rule, options));
  });
  return violations;
};
