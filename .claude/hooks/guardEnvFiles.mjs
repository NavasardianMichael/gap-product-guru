// PreToolUse guard for secrets: Claude may not read or write any file whose name starts with `.env`
// (`.env`, `.env.local`, `.env.production.local`, `.envrc`…), except the committed `.env.example`.
// Covers the file tools, Grep and any shell command that names such a file. See CLAUDE.md "Forbidden".

import path from 'node:path';

const ALLOWED_NAME = '.env.example';

/**
 * A `.env…` file name in a shell command. The preceding character must not be a word character,
 * `$` or `.`, so `process.env.X`, `import.meta.env` and PowerShell's `$env:X` don't match.
 * Glob characters are kept in the name so `.env*` counts as an env file.
 */
const SHELL_ENV_NAME_PATTERN = /(?:^|[^\w$.])(\.env[\w.*?[\]-]*)/gi;

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `Env file guard: ${reason} Reading or writing .env* files is forbidden — only ${ALLOWED_NAME} is allowed (CLAUDE.md "Forbidden").`,
      },
    }),
  );
  process.exit(0);
}

function isEnvFileName(name) {
  const lowerName = name.toLowerCase();
  return lowerName.startsWith('.env') && lowerName !== ALLOWED_NAME;
}

/** The first `.env…` name a shell command or glob refers to, or null. */
function findEnvName(text) {
  for (const match of text.matchAll(SHELL_ENV_NAME_PATTERN)) {
    const name = match[1].replace(/\.+$/, '');
    if (isEnvFileName(name)) return name;
  }
  return null;
}

const input = JSON.parse(
  await new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data || '{}'));
  }),
);

const toolInput = input.tool_input ?? {};

if (['Read', 'Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(input.tool_name)) {
  const filePath = toolInput.file_path ?? toolInput.notebook_path;
  if (filePath && isEnvFileName(path.basename(filePath))) {
    deny(`\`${path.basename(filePath)}\` is an env file.`);
  }
}

if (input.tool_name === 'Grep') {
  if (toolInput.path && isEnvFileName(path.basename(toolInput.path))) {
    deny(`\`${path.basename(toolInput.path)}\` is an env file.`);
  }
  const globName = toolInput.glob && findEnvName(toolInput.glob);
  if (globName) deny(`the glob \`${toolInput.glob}\` matches env files.`);
}

if (['Bash', 'PowerShell'].includes(input.tool_name) && toolInput.command) {
  const envName = findEnvName(toolInput.command);
  if (envName) deny(`the command refers to \`${envName}\`.`);
}
