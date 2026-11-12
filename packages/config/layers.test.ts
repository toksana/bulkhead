import { faker } from '@faker-js/faker';
import { describe, expect, it } from 'vitest';

import {
  HOST_LAYER,
  LAYER_ORDER,
  REMOTES_LAYER,
  UI_LAYER,
  layerPolicy,
  remoteLayer,
} from './layers.ts';
import type { AppTarget } from './layers.ts';

const buildRemoteName = (): string => faker.helpers.fromRegExp(/[a-z][a-z0-9-]{0,11}/);

const isUnderPageOrder = (layer: string): boolean =>
  LAYER_ORDER.some((top) => layer === top || layer.startsWith(`${top}.`));

describe('layerPolicy', () => {
  it('lets the host write every page layer except remotes, and checks the page order', () => {
    // Arrange
    const host: AppTarget = { kind: 'host' };

    // Act
    const policy = layerPolicy(host);

    // Assert
    expect(policy.allowedLayers).toEqual(LAYER_ORDER.filter((layer) => layer !== REMOTES_LAYER));
    expect(policy.allowedLayers).toContain(HOST_LAYER);
    expect(policy.forbidRootSelectors).toBe(false);
    expect(policy.layerOrder).toEqual(LAYER_ORDER);
  });

  it('limits a remote to ui and its own layer, and forbids root selectors', () => {
    // Arrange
    const name = buildRemoteName();

    // Act
    const policy = layerPolicy({ kind: 'remote', name });

    // Assert
    expect(policy.allowedLayers).toEqual([UI_LAYER, `${REMOTES_LAYER}.${name}`]);
    expect(policy.forbidRootSelectors).toBe(true);
    expect(policy.layerOrder).toBeUndefined();
  });

  it('keeps every allowed layer of any app inside the page order', () => {
    // Arrange
    const apps: AppTarget[] = [
      { kind: 'host' },
      ...faker.helpers.multiple(() => ({ kind: 'remote' as const, name: buildRemoteName() }), {
        count: 20,
      }),
    ];

    // Act
    const allowed = apps.flatMap((app) => layerPolicy(app).allowedLayers);

    // Assert
    expect(allowed.filter((layer) => !isUnderPageOrder(layer))).toEqual([]);
  });

  it('never lets a remote write to another remote, the host or the document layers', () => {
    // Arrange
    const [name, other] = faker.helpers.uniqueArray(buildRemoteName, 2);

    // Act
    const policy = layerPolicy({ kind: 'remote', name: name ?? 'a' });

    // Assert
    expect(policy.allowedLayers).not.toContain(remoteLayer(other ?? 'b'));
    expect(policy.allowedLayers).not.toContain(HOST_LAYER);
    expect(policy.allowedLayers).not.toContain('reset');
    expect(policy.allowedLayers).not.toContain('tokens');
  });

  it.each(['', 'Telemetry', 'a.b', 'a,b', 'a b', '1st', '-x'])(
    'rejects the remote name "%s"',
    (name) => {
      // Arrange
      const remote: AppTarget = { kind: 'remote', name };

      // Act
      const run = (): unknown => layerPolicy(remote);

      // Assert
      expect(run).toThrow(/Invalid remote name/);
    },
  );
});
