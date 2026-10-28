// PreToolUse guard for the docs repo (data/docs): Claude may only read it and update it with
// clone / pull / fetch. Any git write (commit, branch, checkout, reset, push, config…), any file
// edit inside it and any shell command that writes into it is denied. See CLAUDE.md "Forbidden".

import path from 'node:path';

const DOCS_DIR_PATTERN = /data[\\/]+docs(?![\w-])/i;

/** git subcommands that only read the repo or update it from the remote. */
const READ_ONLY_GIT = new Set([
  'clone',
  'pull',
  'fetch',
  'status',
  'log',
  'diff',
  'show',
  'ls-files',
  'ls-tree',
  'ls-remote',
  'rev-parse',
  'rev-list',
  'describe',
  'blame',
  'grep',
  'shortlog',
  'cat-file',
  'show-ref',
  'for-each-ref',
  'count-objects',
  'check-ignore',
  'check-attr',
  'merge-base',
  'name-rev',
  'whatchanged',
  'help',
  'version',
]);

/** Subcommands that are read-only only with these listing flags (or no arguments at all). */
const LIST_ONLY_GIT = {
  branch: /^(-a|-r|-v|-vv|--all|--remotes|--list|--show-current|--verbose|--no-color)$/,
  remote: /^(-v|--verbose|show|get-url)$/,
  tag: /^(-l|--list)$/,
  config: /^(--get|--get-all|--get-regexp|-l|--list|--show-origin)$/,
  'sparse-checkout': /^list$/,
  stash: /^list$/,
};

/** git options that come before the subcommand and take a separate value. */
const GIT_OPTIONS_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace']);

/** Commands that change files — denied when they run against data/docs (lower-case). */
const FILE_WRITE_COMMANDS = new Set([
  'rm',
  'rmdir',
  'mv',
  'cp',
  'touch',
  'mkdir',
  'ln',
  'chmod',
  'truncate',
  'tee',
  'dd',
  'rsync',
  'remove-item',
  'move-item',
  'copy-item',
  'new-item',
  'set-content',
  'add-content',
  'clear-content',
  'out-file',
  'rename-item',
  'del',
  'erase',
  'rd',
  'move',
  'copy',
  'ren',
]);

const CHANGE_DIRECTORY_COMMANDS = new Set(['cd', 'pushd', 'set-location', 'sl']);
/** `sed -i`, `perl -i`, `find … -delete` edit or delete in place. */
const IN_PLACE_WRITE_PATTERN = /^(sed|perl)\b.*\s-i|\s-delete\b/i;
/** `>`/`>>` into a file; `2>&1` and redirects to /dev/null, $null or NUL write nothing. */
const FILE_REDIRECT_PATTERN = /\d?>{1,2}(?!&)\s*(?!["']?(\/dev\/null|\$null|nul)\b)\S/i;
const REDIRECT_INTO_DOCS_PATTERN = /\d?>{1,2}(?!&)\s*["']?[^\s"'|;&]*data[\\/]+docs/i;

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `Docs repo guard: ${reason} data/docs is read-only — only clone, pull, fetch and read commands are allowed (CLAUDE.md "Forbidden").`,
      },
    }),
  );
  process.exit(0);
}

function isInsideDocs(filePath, projectDir) {
  const docsDir = path.resolve(projectDir, 'data', 'docs');
  const relative = path.relative(docsDir, path.resolve(projectDir, filePath));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

/** The first git subcommand in one shell segment, with its arguments; null if no git call. */
function parseGitCall(segment) {
  const tokens = segment.trim().split(/\s+/);
  const gitIndex = tokens.findIndex((token) =>
    /^(git|git\.exe)$/i.test(token.replace(/^["']|["']$/g, '')),
  );
  if (gitIndex === -1) return null;

  let index = gitIndex + 1;
  while (index < tokens.length && tokens[index].startsWith('-')) {
    index += GIT_OPTIONS_WITH_VALUE.has(tokens[index]) ? 2 : 1;
  }
  return { subcommand: tokens[index] ?? '', args: tokens.slice(index + 1) };
}

function isReadOnlyGit({ subcommand, args }) {
  if (!subcommand) return true; // `git` / `git --version`
  if (READ_ONLY_GIT.has(subcommand)) return true;
  const listFlags = LIST_ONLY_GIT[subcommand];
  return Boolean(listFlags) && args.every((arg) => listFlags.test(arg));
}

/** Checks each `&&`/`||`/`;`/`|` segment; a segment counts if it names data/docs or runs inside it. */
function checkShellCommand(command, cwd, projectDir) {
  let isInDocs = isInsideDocs(cwd, projectDir);
  if (!isInDocs && !DOCS_DIR_PATTERN.test(command)) return;

  for (const segment of command.split(/&&|\|\||[;|\n]/)) {
    // Skip `VAR=value` prefixes to reach the command name
    const words = segment.trim().split(/\s+/).filter((word) => !/^\w+=/.test(word));
    const commandName = (words[0] ?? '').replace(/^["']|["']$/g, '').toLowerCase();

    if (CHANGE_DIRECTORY_COMMANDS.has(commandName)) {
      isInDocs = DOCS_DIR_PATTERN.test(segment);
      continue;
    }
    if (!isInDocs && !DOCS_DIR_PATTERN.test(segment)) continue;

    const gitCall = parseGitCall(segment);
    if (gitCall && !isReadOnlyGit(gitCall)) {
      deny(`\`git ${gitCall.subcommand}\` is a write operation.`);
    }
    if (FILE_WRITE_COMMANDS.has(commandName) || IN_PLACE_WRITE_PATTERN.test(segment.trim())) {
      deny(`\`${commandName}\` would change files in the docs repo.`);
    }
    const writesFile = isInDocs
      ? FILE_REDIRECT_PATTERN.test(segment)
      : REDIRECT_INTO_DOCS_PATTERN.test(segment);
    if (writesFile) deny('this redirect would write a file into the docs repo.');
  }
}

const input = JSON.parse(
  await new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data || '{}'));
  }),
);

const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const toolInput = input.tool_input ?? {};

if (['Edit', 'Write', 'NotebookEdit', 'MultiEdit'].includes(input.tool_name)) {
  const filePath = toolInput.file_path ?? toolInput.notebook_path;
  if (filePath && isInsideDocs(filePath, projectDir)) deny('editing files is not allowed.');
}

if (['Bash', 'PowerShell'].includes(input.tool_name) && toolInput.command) {
  checkShellCommand(toolInput.command, input.cwd ?? projectDir, projectDir);
}
