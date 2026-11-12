const ORDER_STATEMENT = /<style[^>]*>\s*@layer\s+([^;{]+);/i;
const FIRST_RESOURCE = /<(script|link)\b/i;

const parseNames = (list: string): string[] => list.split(',').map((name) => name.trim());

/**
 * The page's layer order must be declared in an inline `<style>` before any script or stylesheet
 * loads: CSS chunks arrive asynchronously, and the first appearance of a layer fixes its position.
 * Returns a description of the problem, or `undefined` when the HTML is correct.
 */
export const checkLayerOrder = (html: string, expected: readonly string[]): string | undefined => {
  const statement = ORDER_STATEMENT.exec(html);
  if (!statement?.[1]) return 'no inline <style> with an @layer order statement';

  const firstResource = FIRST_RESOURCE.exec(html);
  if (firstResource && firstResource.index < statement.index) {
    return `the @layer order statement comes after the first <${firstResource[1] ?? 'resource'}>`;
  }

  const actual = parseNames(statement[1]);
  if (actual.join(',') !== expected.join(',')) {
    return `layer order is "${actual.join(', ')}", expected "${expected.join(', ')}"`;
  }
  return undefined;
};
