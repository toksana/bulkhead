#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { layerPolicy } from '../layers.ts';
import type { AppTarget } from '../layers.ts';
import { findViolations } from './find-violations.ts';
import type { CssCheckOptions, CssViolation } from './find-violations.ts';
import { checkLayerOrder } from './layer-order.ts';

const USAGE = 'Usage: bulkhead-css-check --dir <build dir> (--host | --remote <name>)';

interface CliOptions {
  readonly dir: string;
  readonly check: CssCheckOptions;
  /** When set, `<dir>/index.html` must declare exactly this layer order first. */
  readonly layerOrder: readonly string[] | undefined;
}

/** Exactly one of `--host` and `--remote <name>`; the layer policy follows from it. */
const readTarget = (host: boolean, remote: string | undefined): AppTarget => {
  if (host === (remote !== undefined)) throw new Error(USAGE);
  return remote === undefined ? { kind: 'host' } : { kind: 'remote', name: remote };
};

const readOptions = (): CliOptions => {
  const { values } = parseArgs({
    options: {
      dir: { type: 'string' },
      host: { type: 'boolean', default: false },
      remote: { type: 'string' },
    },
  });
  if (values.dir === undefined) throw new Error(USAGE);
  const { layerOrder, ...check } = layerPolicy(readTarget(values.host, values.remote));
  return { dir: values.dir, check, layerOrder };
};

const listCssFiles = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { recursive: true });
  return entries.filter((entry) => entry.endsWith('.css')).map((entry) => join(dir, entry));
};

const describeViolation = (file: string, violation: CssViolation): string =>
  `${file}: ${violation.kind} rule "${violation.subject}"${violation.layer === undefined ? '' : ` in layer "${violation.layer}"`}`;

const checkCssFile = async (file: string, options: CssCheckOptions): Promise<string[]> => {
  const css = await readFile(file, 'utf8');
  return findViolations(css, options).map((violation) => describeViolation(file, violation));
};

const checkHtml = async (dir: string, order: readonly string[]): Promise<string[]> => {
  const file = join(dir, 'index.html');
  const problem = checkLayerOrder(await readFile(file, 'utf8'), order);
  return problem === undefined ? [] : [`${file}: ${problem}`];
};

const main = async (): Promise<number> => {
  const { dir, check, layerOrder } = readOptions();
  const files = await listCssFiles(dir);
  const cssProblems = await Promise.all(files.map((file) => checkCssFile(file, check)));
  const htmlProblems = layerOrder === undefined ? [] : await checkHtml(dir, layerOrder);
  const problems = [...cssProblems.flat(), ...htmlProblems];

  problems.forEach((problem) => {
    console.error(problem);
  });
  console.log(
    `CSS layer check: ${String(files.length)} file(s), ${String(problems.length)} problem(s); allowed layers: ${check.allowedLayers.join(', ')}`,
  );
  return problems.length === 0 ? 0 : 1;
};

try {
  process.exitCode = await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 2;
}
