const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const CSS_COMMENT = /\/\*[\s\S]*?\*\//g;
const STYLE_ELEMENT = /<style\b[^>]*>([\s\S]*?)<\/style>/i;
const ORDER_STATEMENT = /^\s*@layer\s+([^;{]+);/i;

/**
 * Only scripts and stylesheets can put a layer on the page before the order statement does.
 * Icons, preconnects, manifests and preloads apply no CSS, so they may come first.
 */
const RESOURCES: readonly (readonly [tag: string, pattern: RegExp])[] = [
  ['script', /<script\b/i],
  [
    'link',
    /<link\b[^>]*?\brel\s*=\s*(?:"[^"]*\bstylesheet\b[^"]*"|'[^']*\bstylesheet\b[^']*'|stylesheet\b)/i,
  ],
];

interface Found {
  readonly tag: string;
  readonly index: number;
}

const parseNames = (list: string): string[] => list.split(',').map((name) => name.trim());

const firstResource = (html: string): Found | undefined =>
  RESOURCES.map(([tag, pattern]) => ({ tag, index: pattern.exec(html)?.index }))
    .filter((found): found is Found => found.index !== undefined)
    .reduce<Found | undefined>(
      (first, found) => (first === undefined || found.index < first.index ? found : first),
      undefined,
    );

/** Layer names from the order statement at the start of a `<style>` body, ignoring CSS comments. */
const orderStatement = (css: string): string[] | undefined => {
  const names = ORDER_STATEMENT.exec(css.replace(CSS_COMMENT, ''))?.[1];
  return names === undefined ? undefined : parseNames(names);
};

const compareOrder = (
  actual: readonly string[],
  expected: readonly string[],
): string | undefined =>
  actual.join(',') === expected.join(',')
    ? undefined
    : `layer order is "${actual.join(', ')}", expected "${expected.join(', ')}"`;

/**
 * The page's layer order must be declared in its first inline `<style>`, before any script or
 * stylesheet loads: CSS chunks arrive asynchronously, and the first appearance of a layer fixes its
 * position. HTML comments are ignored. Returns a description of the problem, or `undefined` when
 * the HTML is correct.
 */
export const checkLayerOrder = (html: string, expected: readonly string[]): string | undefined => {
  const page = html.replace(HTML_COMMENT, '');
  const style = STYLE_ELEMENT.exec(page);
  if (!style) return 'no inline <style> with an @layer order statement';

  const actual = orderStatement(style[1] ?? '');
  if (actual === undefined)
    return 'the first inline <style> must start with the @layer order statement';

  const resource = firstResource(page);
  if (resource && resource.index < style.index) {
    return `the @layer order statement comes after the first <${resource.tag}>`;
  }
  return compareOrder(actual, expected);
};
