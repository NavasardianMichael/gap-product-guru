#!/usr/bin/env node
/**
 * Downloads Prisma's schema engine (needed by `prisma migrate deploy`) into the release's
 * node_modules. Shipped inside the release as server/scripts/ and run by the deploy right
 * after `pnpm install --prod --frozen-lockfile --ignore-scripts`.
 *
 * Why not let pnpm run the install scripts: pnpm 11 crashes with "readStream must be
 * readable" while running Prisma's lifecycle scripts from a non-interactive shell — which is
 * exactly what the deploy's `ssh … bash -s` is. Of all the release's install scripts only one
 * matters: @prisma/engines' postinstall fetches the engine binary for THIS host's platform.
 * (The Prisma client needs none — it is compiled into dist/generated.) So that one runs here,
 * with plain node.
 *
 * Usage (from the release's server/ folder): node scripts/fetch-prisma-engines.cjs
 */
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const prismaManifest = require.resolve('prisma/package.json', { paths: [process.cwd()] });
const enginesManifest = require.resolve('@prisma/engines/package.json', {
  paths: [path.dirname(prismaManifest)],
});
const enginesDir = path.dirname(enginesManifest);
const postinstall = require(enginesManifest).scripts?.postinstall;

if (!postinstall?.startsWith('node ')) {
  console.error(`Unexpected @prisma/engines postinstall: ${JSON.stringify(postinstall)}`);
  process.exit(1);
}

execFileSync(process.execPath, [postinstall.slice('node '.length)], {
  cwd: enginesDir,
  stdio: 'inherit',
});
console.log(`prisma engines ready in ${enginesDir}`);
