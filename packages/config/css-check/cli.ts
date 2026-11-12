#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { findViolations } from './find-violations.ts';
import type { CssCheckOptions, CssViolation } from './find-violations.ts';
import { checkLayerOrder } from './layer-order.ts';

const USAGE =
  'Usage: bulkhead-css-check --dir <build dir> --allow <layer>[,<layer>...] [--forbid-root-selectors] [--layer-order <layer>[,<layer>...]]';

interface CliOptions {
  readonly dir: string;
  readonly check: CssCheckOptions;
  /** When set, `<dir>/index.html` must declare exactly this layer order first. */
  readonly layerOrder: readonly string[] | undefined;
}

const splitList = (value: string): string[] => value.split(',').map((item) => item.trim());

const readOptions = (): CliOptions => {
  const { values } = parseArgs({
    options: {
      dir: { type: 'string' },
      allow: { type: 'string' },
      'forbid-root-selectors': { type: 'boolean', default: false },
      'layer-order': { type: 'string' },
    },
  });
  if (values.dir === undefined || values.allow === undefined) throw new Error(USAGE);
  const order = values['layer-order'];
  return {
    dir: values.dir,
    check: {
      allowedLayers: splitList(values.allow),
      forbidRootSelectors: values['forbid-root-selectors'],
    },
    layerOrder: order === undefined ? undefined : splitList(order),
  };
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
