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

  it.each([
    '<link rel="icon" href="/favicon.svg" />',
    '<link rel="preconnect" href="https://example.test" />',
    '<link rel="manifest" href="/app.webmanifest" />',
    '<link rel="preload" href="/a.css" as="style" />',
  ])('accepts %s before the order statement', (resource) => {
    // Arrange
    const order = buildOrder();
    const html = page(`${resource}<style>@layer ${order.join(', ')};</style>`);

    // Act
    const problem = checkLayerOrder(html, order);

    // Assert
    expect(problem).toBeUndefined();
  });

  it.each([
    '<link rel="alternate stylesheet" href="/a.css" />',
    "<link href='/a.css' rel='stylesheet'>",
    '<link rel=stylesheet href=/a.css>',
  ])('reports %s before the order statement', (resource) => {
    // Arrange
    const order = buildOrder();
    const html = page(`${resource}<style>@layer ${order.join(', ')};</style>`);

    // Act
    const problem = checkLayerOrder(html, order);

    // Assert
    expect(problem).toContain('after the first <link>');
  });

  it('ignores resources mentioned in an HTML comment', () => {
    // Arrange
    const order = buildOrder();
    const html = page(
      `<!-- keep this before any <script> or <link rel="stylesheet"> --><style>@layer ${order.join(', ')};</style>`,
    );

    // Act
    const problem = checkLayerOrder(html, order);

    // Assert
    expect(problem).toBeUndefined();
  });

  it('accepts a CSS comment before the order statement', () => {
    // Arrange
    const order = buildOrder();
    const html = page(`<style>/* page order */ @layer ${order.join(', ')};</style>`);

    // Act
    const problem = checkLayerOrder(html, order);

    // Assert
    expect(problem).toBeUndefined();
  });

  it('reports an order statement that exists only inside an HTML comment', () => {
    // Arrange
    const order = buildOrder();
    const html = page(`<!-- <style>@layer ${order.join(', ')};</style> -->`);

    // Act
    const problem = checkLayerOrder(html, order);

    // Assert
    expect(problem).toContain('no inline <style>');
  });

  it('reports an earlier <style> that is not the order statement', () => {
    // Arrange
    const order = buildOrder();
    const [first = 'host'] = order;
    const html = page(
      `<style>@layer ${first} { .a { gap: 0; } }</style><style>@layer ${order.join(', ')};</style>`,
    );

    // Act
    const problem = checkLayerOrder(html, order);

    // Assert
    expect(problem).toBe('the first inline <style> must start with the @layer order statement');
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
