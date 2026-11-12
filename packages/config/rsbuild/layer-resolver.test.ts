import { join } from 'node:path';

import { faker } from '@faker-js/faker';
import { describe, expect, it } from 'vitest';

import { UI_LAYER } from '../layers.ts';
import { createLayerResolver } from './layer-resolver.ts';

const buildRules = (): { appRoot: string; uiRoot: string; appLayer: string } => {
  const workspace = join('/', faker.system.directoryPath().slice(1), 'workspace');
  return {
    appRoot: join(workspace, 'apps', faker.word.noun()),
    uiRoot: join(workspace, 'packages', 'ui'),
    appLayer: `remotes.${faker.word.noun()}`,
  };
};

const moduleFile = (directory: string): string =>
  join(directory, 'src', `${faker.word.noun()}.module.css`);

describe('createLayerResolver', () => {
  it('puts CSS Modules of the app into the app layer', () => {
    // Arrange
    const rules = buildRules();
    const resolve = createLayerResolver(rules);

    // Act
    const layer = resolve(moduleFile(rules.appRoot));

    // Assert
    expect(layer).toBe(rules.appLayer);
  });

  it('puts CSS Modules of the UI package into the ui layer', () => {
    // Arrange
    const rules = buildRules();
    const resolve = createLayerResolver(rules);

    // Act
    const layer = resolve(moduleFile(rules.uiRoot));

    // Assert
    expect(layer).toBe(UI_LAYER);
  });

  it('leaves global stylesheets alone', () => {
    // Arrange
    const rules = buildRules();
    const resolve = createLayerResolver(rules);

    // Act
    const layer = resolve(join(rules.appRoot, 'src', 'global.css'));

    // Assert
    expect(layer).toBeUndefined();
  });

  it('leaves CSS Modules from outside the app and the UI package alone', () => {
    // Arrange
    const rules = buildRules();
    const resolve = createLayerResolver(rules);
    const thirdParty = join(rules.appRoot, '..', '..', 'node_modules', 'lib', 'x.module.css');

    // Act
    const layer = resolve(thirdParty);

    // Assert
    expect(layer).toBeUndefined();
  });

  it('does not treat a sibling directory with the same prefix as part of the app', () => {
    // Arrange
    const rules = buildRules();
    const resolve = createLayerResolver(rules);

    // Act
    const layer = resolve(moduleFile(`${rules.appRoot}-legacy`));

    // Assert
    expect(layer).toBeUndefined();
  });

  it('leaves stylesheets without a file name alone', () => {
    // Arrange
    const resolve = createLayerResolver(buildRules());

    // Act
    const layer = resolve(undefined);

    // Assert
    expect(layer).toBeUndefined();
  });
});
