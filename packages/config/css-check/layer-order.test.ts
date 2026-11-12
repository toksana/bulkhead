import { faker } from '@faker-js/faker';
import { describe, expect, it } from 'vitest';

import { checkLayerOrder } from './layer-order.ts';

const buildOrder = (): string[] =>
  faker.helpers.uniqueArray(() => faker.word.noun().toLowerCase(), 5);

const page = (head: string): string =>
  `<!doctype html><html><head><meta charset="UTF-8" />${head}</head><body></body></html>`;

describe('checkLayerOrder', () => {
  it('accepts the expected order declared before any resource', () => {
    // Arrange
    const order = buildOrder();
    const html = page(
      `<style>@layer ${order.join(', ')};</style><script defer src="/a.js"></script>`,
    );

    // Act
    const problem = checkLayerOrder(html, order);

    // Assert
    expect(problem).toBeUndefined();
  });

  it('reports a page without an order statement', () => {
    // Arrange
    const html = page('<script defer src="/a.js"></script>');

    // Act
    const problem = checkLayerOrder(html, buildOrder());

    // Assert
    expect(problem).toContain('no inline <style>');
  });

  it.each(['script', 'link'])('reports an order statement that comes after a <%s>', (tag) => {
    // Arrange
    const order = buildOrder();
    const resource =
      tag === 'script'
        ? '<script src="/a.js"></script>'
        : '<link rel="stylesheet" href="/a.css" />';
    const html = page(`${resource}<style>@layer ${order.join(', ')};</style>`);

    // Act
    const problem = checkLayerOrder(html, order);

    // Assert
    expect(problem).toContain(`after the first <${tag}>`);
  });

  it('reports a different order', () => {
    // Arrange
    const order = buildOrder();
    const swapped = [...order].reverse();
    const html = page(`<style>@layer ${swapped.join(', ')};</style>`);

    // Act
    const problem = checkLayerOrder(html, order);

    // Assert
    expect(problem).toBe(`layer order is "${swapped.join(', ')}", expected "${order.join(', ')}"`);
  });

  it('tolerates whitespace and attributes on the style tag', () => {
    // Arrange
    const order = buildOrder();
    const html = page(`<style nonce="x">\n  @layer ${order.join(' ,\n  ')};\n</style>`);

    // Act
    const problem = checkLayerOrder(html, order);

    // Assert
    expect(problem).toBeUndefined();
  });
});
