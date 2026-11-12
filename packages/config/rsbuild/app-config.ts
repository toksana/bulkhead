import { resolve } from 'node:path';

import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import type { RsbuildConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

import { sharedSingletons } from '../mf-shared.ts';
import { pluginCssLayers } from './plugin-css-layers.ts';

export const HOST_PORT = 3000;
export const HOST_LAYER = 'host';

const HOST_ORIGIN = `http://localhost:${String(HOST_PORT)}`;
const UI_ROOT = resolve(import.meta.dirname, '../../ui');

type CssModulesConfig = NonNullable<NonNullable<RsbuildConfig['output']>['cssModules']>;

export const remoteLayer = (name: string): string => `remotes.${name}`;
export const remoteAssetPrefix = (name: string): string => `/remotes/${name}/`;

/** Prefixes class names with the app name; independently built apps cannot collide. */
const cssModules = (name: string): CssModulesConfig => ({
  localIdentName: `${name}__[local]--[hash:base64:5]`,
});

export interface RemoteOptions {
  readonly name: string;
  readonly port: number;
  readonly exposes: Record<string, string>;
}

/**
 * A remote serves its assets under `/remotes/<name>/`, so chunks and workers resolve against the
 * page origin behind the edge proxy (ADR 0008). Its CSS Modules go into `@layer remotes.<name>`.
 */
export const createRemoteConfig = ({ name, port, exposes }: RemoteOptions): RsbuildConfig => {
  const assetPrefix = remoteAssetPrefix(name);
  return {
    server: { port, cors: { origin: HOST_ORIGIN } },
    dev: { assetPrefix },
    output: { assetPrefix, cssModules: cssModules(name) },
    plugins: [
      pluginReact(),
      pluginCssLayers({ layer: remoteLayer(name), uiRoot: UI_ROOT }),
      pluginModuleFederation({ name, exposes, shared: sharedSingletons, dts: false }),
    ],
  };
};

export interface HostRemote {
  readonly name: string;
  readonly port: number;
}

export interface HostOptions {
  readonly remotes: readonly HostRemote[];
}

interface ProxyTarget {
  readonly target: string;
  readonly changeOrigin: boolean;
}

const remoteProxies = (remotes: readonly HostRemote[]): Record<string, ProxyTarget> =>
  Object.fromEntries(
    remotes.map(({ name, port }) => [
      remoteAssetPrefix(name).slice(0, -1),
      { target: `http://localhost:${String(port)}`, changeOrigin: true },
    ]),
  );

const remoteManifests = (remotes: readonly HostRemote[]): Record<string, string> =>
  Object.fromEntries(
    remotes.map(({ name }) => [name, `${name}@${remoteAssetPrefix(name)}mf-manifest.json`]),
  );

/**
 * The host is the single origin in development: it proxies each remote under its prefix and loads
 * it from that prefix. Its own CSS Modules go into `@layer host`; its global stylesheet declares
 * the layer order explicitly.
 */
export const createHostConfig = ({ remotes }: HostOptions): RsbuildConfig => ({
  server: { port: HOST_PORT, proxy: remoteProxies(remotes) },
  html: { template: './index.html' },
  output: { cssModules: cssModules('host') },
  plugins: [
    pluginReact(),
    pluginCssLayers({ layer: HOST_LAYER, uiRoot: UI_ROOT }),
    pluginModuleFederation({
      name: 'host',
      remotes: remoteManifests(remotes),
      shared: sharedSingletons,
      dts: false,
    }),
  ],
});
