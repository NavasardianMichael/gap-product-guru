#!/usr/bin/env node
/**
 * Assembles the deployable release directory (default `out/app`) after `pnpm build`.
 *
 *   out/app/
 *     server/   dist · prisma (schema + migrations) · prisma.config.ts · scripts/fetch-prisma-engines.cjs
 *               package.json · pnpm-workspace.yaml   (CI adds pnpm-lock.yaml)
 *     shared/   dist · package.json            ← the workspace package, as `file:../shared`
 *     client/   dist                           ← served by Express (src/web/serveClient.ts: ../client/dist)
 *
 * Why not ship the workspace (crossword's scripts/build-api-release.mjs has the long version):
 * a filtered workspace install still pulls every root and client dev dependency, and a
 * prebuilt node_modules breaks Prisma's self-references. So `server/` becomes a standalone
 * package whose runtime dependencies are pinned to the EXACT versions the workspace lockfile
 * resolved, and the host runs a plain `pnpm install --prod --frozen-lockfile` against the
 * lockfile CI resolves for it — native pieces (Prisma's schema engine) are fetched for the
 * host's own platform.
 *
 * Usage: node scripts/build-release.mjs [outDir]
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.resolve(rootDir, process.argv[2] ?? 'out/app');
const pkgDir = (name) => path.join(rootDir, name);

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const writeJson = (file, value) => writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

const rootPkg = readJson(path.join(rootDir, 'package.json'));
const serverPkg = readJson(path.join(pkgDir('server'), 'package.json'));
const sharedPkg = readJson(path.join(pkgDir('shared'), 'package.json'));

/** The version installed for `pkg`, so production runs exactly what CI tested. */
function resolvedVersion(pkg, name) {
  const manifest = path.join(pkgDir(pkg), 'node_modules', name, 'package.json');
  if (!existsSync(manifest)) {
    throw new Error(
      `${name} is not installed under ${pkg}/node_modules — run \`pnpm install\` first.`,
    );
  }
  return readJson(manifest).version;
}

/** Workspace links become the sibling directory in the release; everything else is pinned. */
function pinDependencies(pkg, names) {
  return Object.fromEntries(
    [...names]
      .sort()
      .map((name) => [
        name,
        name === sharedPkg.name ? 'file:../shared' : resolvedVersion(pkg, name),
      ]),
  );
}

for (const required of ['server/dist/index.js', 'shared/dist/index.js', 'client/dist/index.html']) {
  if (!existsSync(path.join(rootDir, required))) {
    throw new Error(`${required} is missing — run \`pnpm build\` first.`);
  }
}

rmSync(outDir, { recursive: true, force: true });

// ─── server ───
const serverOut = path.join(outDir, 'server');
mkdirSync(path.join(serverOut, 'prisma'), { recursive: true });
mkdirSync(path.join(serverOut, 'scripts'), { recursive: true });
cpSync(path.join(pkgDir('server'), 'dist'), path.join(serverOut, 'dist'), { recursive: true });
// `prisma migrate deploy` runs on the host: it needs the schema, the migrations and the config
// (Prisma 7 reads the datasource URL from prisma.config.ts, which reads DATABASE_URL).
cpSync(
  path.join(pkgDir('server'), 'prisma', 'schema.prisma'),
  path.join(serverOut, 'prisma', 'schema.prisma'),
);
cpSync(
  path.join(pkgDir('server'), 'prisma', 'migrations'),
  path.join(serverOut, 'prisma', 'migrations'),
  { recursive: true },
);
cpSync(path.join(pkgDir('server'), 'prisma.config.ts'), path.join(serverOut, 'prisma.config.ts'));
// The host installs with --ignore-scripts, then fetches Prisma's engine with this (see its header).
cpSync(
  path.join(rootDir, 'scripts', 'fetch-prisma-engines.cjs'),
  path.join(serverOut, 'scripts', 'fetch-prisma-engines.cjs'),
);

writeJson(path.join(serverOut, 'package.json'), {
  name: serverPkg.name,
  version: serverPkg.version,
  private: true,
  type: 'module',
  // Pins the host install to the pnpm that resolved the lockfile (corepack reads it).
  packageManager: rootPkg.packageManager,
  // No postinstall: the host install must not generate or migrate — the deploy does both,
  // in order. The Prisma client is already compiled into dist/generated.
  scripts: {
    start: 'node dist/index.js',
    'docs:pull': 'node dist/ingest/pullDocs.js',
    ingest: 'node dist/ingest/index.js',
    'docs:sync': 'node dist/ingest/pullDocs.js && node dist/ingest/index.js',
  },
  // The `prisma` CLI is a dev dependency in the repo but a runtime one here: it applies migrations.
  dependencies: pinDependencies('server', [...Object.keys(serverPkg.dependencies), 'prisma']),
});

// `packages: []` makes server/ its own workspace root — otherwise pnpm walks up into the
// repo's workspace in CI and produces no standalone lockfile. `allowBuilds` mirrors the
// repo's pnpm-workspace.yaml: pnpm blocks install scripts by default, and Prisma's engines
// (needed by `migrate deploy`) are fetched by one.
writeFileSync(
  path.join(serverOut, 'pnpm-workspace.yaml'),
  [
    'packages: []',
    '',
    'allowBuilds:',
    "  '@prisma/client': true",
    "  '@prisma/engines': true",
    '  prisma: true',
    '',
  ].join('\n'),
);

// ─── shared ───
const sharedOut = path.join(outDir, 'shared');
mkdirSync(sharedOut, { recursive: true });
cpSync(path.join(pkgDir('shared'), 'dist'), path.join(sharedOut, 'dist'), { recursive: true });
writeJson(path.join(sharedOut, 'package.json'), {
  name: sharedPkg.name,
  version: sharedPkg.version,
  private: true,
  type: 'module',
  exports: sharedPkg.exports,
  dependencies: pinDependencies('shared', Object.keys(sharedPkg.dependencies ?? {})),
});

// ─── client ───
cpSync(path.join(pkgDir('client'), 'dist'), path.join(outDir, 'client', 'dist'), {
  recursive: true,
});

const serverDeps = Object.keys(readJson(path.join(serverOut, 'package.json')).dependencies);
console.log(`Release assembled at ${path.relative(rootDir, outDir)}`);
console.log(`  server: ${serverDeps.length} runtime dependencies, pinned exactly`);
