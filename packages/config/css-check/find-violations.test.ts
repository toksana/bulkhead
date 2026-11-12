import { faker } from '@faker-js/faker';
import { describe, expect, it } from 'vitest';

import { findViolations } from './find-violations.ts';
import type { CssCheckOptions } from './find-violations.ts';

const buildAppLayer = (): string => `remotes.${faker.word.noun()}`;

const remoteOptions = (appLayer: string): CssCheckOptions => ({
  allowedLayers: ['ui', appLayer],
  forbidRootSelectors: true,
});

describe('findViolations', () => {
  it('accepts rules that are all inside allowed layers', () => {
    // Arrange
    const appLayer = buildAppLayer();
    const css = `@layer ui{.button{display:flex}}@layer ${appLayer}{.panel{display:grid}@media (width>40rem){.panel{gap:1rem}}}`;

    // Act
    const violations = findViolations(css, remoteOptions(appLayer));

    // Assert
    expect(violations).toEqual([]);
  });

  it('reports a top-level rule as unlayered', () => {
    // Arrange
    const appLayer = buildAppLayer();
    const css = `@layer ${appLayer}{.panel{display:grid}}.leak{color:inherit}`;

    // Act
    const violations = findViolations(css, remoteOptions(appLayer));

    // Assert
    expect(violations).toEqual([{ kind: 'unlayered', selector: '.leak' }]);
  });

  it('reports a rule inside an unlayered media query as unlayered', () => {
    // Arrange
    const appLayer = buildAppLayer();
    const css = '@media (width>40rem){.leak{gap:1rem}}';

    // Act
    const violations = findViolations(css, remoteOptions(appLayer));

    // Assert
    expect(violations).toEqual([{ kind: 'unlayered', selector: '.leak' }]);
  });

  it('joins nested layer blocks into one path', () => {
    // Arrange
    const app = faker.word.noun();
    const css = `@layer remotes{@layer ${app}{.panel{display:grid}}}`;

    // Act
    const violations = findViolations(css, remoteOptions(`remotes.${app}`));

    // Assert
    expect(violations).toEqual([]);
  });

  it('reports a rule in a layer the app does not own', () => {
    // Arrange
    const appLayer = buildAppLayer();
    const css = '@layer remotes.other{.panel{display:grid}}';

    // Act
    const violations = findViolations(css, remoteOptions(appLayer));

    // Assert
    expect(violations).toEqual([
      { kind: 'foreign-layer', selector: '.panel', layer: 'remotes.other' },
    ]);
  });

  it('does not accept a layer that only shares a prefix with an allowed one', () => {
    // Arrange
    const css = '@layer uikit{.button{display:flex}}';

    // Act
    const violations = findViolations(css, { allowedLayers: ['ui'], forbidRootSelectors: false });

    // Assert
    expect(violations).toEqual([{ kind: 'foreign-layer', selector: '.button', layer: 'uikit' }]);
  });

  it('ignores keyframe selectors', () => {
    // Arrange
    const appLayer = buildAppLayer();
    const css = `@keyframes pulse{from{opacity:0}to{opacity:1}}@layer ${appLayer}{.panel{animation:pulse 1s}}`;

    // Act
    const violations = findViolations(css, remoteOptions(appLayer));

    // Assert
    expect(violations).toEqual([]);
  });

  it.each(['html', 'body', ':root', 'body > main', '.panel, html .x'])(
    'reports %s as a root selector in a remote',
    (selector) => {
      // Arrange
      const appLayer = buildAppLayer();
      const css = `@layer ${appLayer}{${selector}{margin:0}}`;

      // Act
      const violations = findViolations(css, remoteOptions(appLayer));

      // Assert
      expect(violations).toEqual([{ kind: 'root-selector', selector, layer: appLayer }]);
    },
  );

  it.each(['.body', '.html-view', '.panel_body', '[data-body]'])(
    'does not mistake %s for a root selector',
    (selector) => {
      // Arrange
      const appLayer = buildAppLayer();
      const css = `@layer ${appLayer}{${selector}{margin:0}}`;

      // Act
      const violations = findViolations(css, remoteOptions(appLayer));

      // Assert
      expect(violations).toEqual([]);
    },
  );

  it('allows root selectors when the app owns the document', () => {
    // Arrange
    const css = '@layer reset{html,body{margin:0}}';

    // Act
    const violations = findViolations(css, {
      allowedLayers: ['reset'],
      forbidRootSelectors: false,
    });

    // Assert
    expect(violations).toEqual([]);
  });
});
