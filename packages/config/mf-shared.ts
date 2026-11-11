/**
 * The only place where Module Federation shared dependencies are declared.
 * Every host and remote imports this object, so each singleton is resolved once at runtime
 * and its version is negotiated in one place.
 */
export interface SharedDependency {
  readonly singleton: true;
}

export const sharedSingletons = {
  react: { singleton: true },
  'react-dom': { singleton: true },
} as const satisfies Record<string, SharedDependency>;
