import { faker } from '@faker-js/faker';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

import { cssLayersPlugin } from './css-layers.ts';

const buildLayer = (): string => `${faker.word.noun()}.${faker.word.noun()}`;

const process = (css: string, layer: string | undefined): string =>
  postcss([cssLayersPlugin(() => layer)]).process(css, { from: '/app/src/x.module.css' }).css;

/** Drops formatting whitespace so assertions compare structure, not spacing. */
const compact = (css: string): string =>
  css
    .replace(/\s*([{};])\s*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

describe('cssLayersPlugin', () => {
  it('wraps unlayered rules in the resolved layer', () => {
    // Arrange
    const layer = buildLayer();
    const css = '.panel { display: grid; } @media (width > 40rem) { .panel { gap: 1rem; } }';

    // Act
    const output = process(css, layer);

    // Assert
    expect(compact(output)).toBe(
      compact(
        `@layer ${layer} { .panel { display: grid; } @media (width > 40rem) { .panel { gap: 1rem; } } }`,
      ),
    );
  });

  it('keeps @charset at the top level', () => {
    // Arrange
    const layer = buildLayer();
    const css = '@charset "utf-8"; .panel { display: grid; }';

    // Act
    const output = process(css, layer);

    // Assert
    expect(compact(output)).toBe(
      compact(`@charset "utf-8"; @layer ${layer} { .panel { display: grid; } }`),
    );
  });

  it.each([
    [':export', ':export { gap: 8px; }'],
    [':import', ':import("./tokens.module.css") { tokenGap: gap; }'],
    ['@namespace', '@namespace svg url(http://www.w3.org/2000/svg);'],
  ])('keeps %s at the top level and wraps the rest', (_name, topLevel) => {
    // Arrange
    const layer = buildLayer();
    const css = `${topLevel} .panel { display: grid; }`;

    // Act
    const output = process(css, layer);

    // Assert
    expect(compact(output)).toBe(
      compact(`${topLevel} @layer ${layer} { .panel { display: grid; } }`),
    );
  });

  it('does not add an empty layer block to a file with only ICSS exports', () => {
    // Arrange
    const css = ':export { gap: 8px; }';

    // Act
    const output = process(css, buildLayer());

    // Assert
    expect(compact(output)).toBe(compact(css));
  });

  it('wraps a rule that only mentions :export inside a larger selector', () => {
    // Arrange
    const layer = buildLayer();
    const css = '.panel:export-like { display: grid; }';

    // Act
    const output = process(css, layer);

    // Assert
    expect(compact(output)).toBe(compact(`@layer ${layer} { ${css} }`));
  });

  it('does not wrap a file that already declares its layer', () => {
    // Arrange
    const css = '@layer custom { .panel { display: grid; } }';

    // Act
    const output = process(css, buildLayer());

    // Assert
    expect(compact(output)).toBe(compact(css));
  });

  it('wraps only the unlayered part of a partly layered file', () => {
    // Arrange
    const layer = buildLayer();
    const css = '@layer custom { .a { color: inherit; } } .b { display: grid; }';

    // Act
    const output = process(css, layer);

    // Assert
    expect(compact(output)).toBe(
      compact(`@layer custom { .a { color: inherit; } } @layer ${layer} { .b { display: grid; } }`),
    );
  });

  it('rejects @import with a message that says what to do instead', () => {
    // Arrange
    const css = '@import "./other.css"; .panel { display: grid; }';

    // Act
    const run = (): string => process(css, buildLayer());

    // Assert
    expect(run).toThrow(/import the stylesheet from JavaScript/);
  });

  it('leaves the file untouched when no layer is resolved', () => {
    // Arrange
    const css = '.panel { display: grid; }';

    // Act
    const output = process(css, undefined);

    // Assert
    expect(output).toBe(css);
  });

  it('leaves an empty file empty', () => {
    // Arrange
    const css = '';

    // Act
    const output = process(css, buildLayer());

    // Assert
    expect(output).toBe('');
  });
});
