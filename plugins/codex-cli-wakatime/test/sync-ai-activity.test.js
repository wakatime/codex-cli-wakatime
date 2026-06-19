const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

test('user prompt hook syncs AI activity with the current wakatime-cli flag', { skip: process.platform === 'win32' }, async () => {
  const pluginRoot = path.resolve(__dirname, '..');
  const wakatimeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-cli-wakatime-'));
  const wakatimeDir = path.join(wakatimeHome, '.wakatime');
  const argsFile = path.join(wakatimeHome, 'args.jsonl');
  const cliPath = path.join(wakatimeDir, `wakatime-cli-${osName()}-${architecture()}`);

  fs.mkdirSync(wakatimeDir, { recursive: true });
  fs.writeFileSync(
    cliPath,
    `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.WAKATIME_TEST_ARGS_FILE, JSON.stringify(args) + '\\n');
if (args.includes('--version')) {
  console.log('v2.19.0');
}
if (args.includes('--sync-ai-heartbeats')) {
  console.error('unknown flag: --sync-ai-heartbeats');
  process.exit(1);
}
`,
  );
  fs.chmodSync(cliPath, 0o755);

  await runPlugin(pluginRoot, {
    eventName: 'userPromptSubmitted',
    cwd: pluginRoot,
  }, {
    ...process.env,
    CODEX_CLI_VERSION: '0.136.0',
    WAKATIME_HOME: wakatimeHome,
    WAKATIME_TEST_ARGS_FILE: argsFile,
  });

  const capturedCalls = fs
    .readFileSync(argsFile, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  const syncCall = capturedCalls.find((args) => args.includes('--sync-ai-activity') || args.includes('--sync-ai-heartbeats'));

  assert.ok(syncCall, 'expected plugin to invoke wakatime-cli for AI activity sync');
  assert.ok(syncCall.includes('--sync-ai-activity'), 'expected current wakatime-cli AI activity flag');
  assert.equal(syncCall.includes('--sync-ai-heartbeats'), false, 'legacy AI heartbeat flag is no longer supported');
  assert.deepEqual(syncCall.slice(0, 3), ['--sync-ai-activity', '--plugin', 'codex-cli/0.136.0 codex-cli-wakatime/1.0.0']);
  assert.deepEqual(syncCall.slice(3), ['--project-folder', pluginRoot]);
});

function runPlugin(pluginRoot, input, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(pluginRoot, 'bin', 'codex-cli-wakatime.js')], {
      cwd: pluginRoot,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`plugin exited with ${code}\nstdout:\n${stdout}\nstderr:\n${stderr}`));
    });

    child.stdin.end(JSON.stringify(input));
  });
}

function osName() {
  return process.platform === 'win32' ? 'windows' : process.platform;
}

function architecture() {
  if (process.arch === 'ia32' || process.arch.includes('32')) return '386';
  if (process.arch === 'x64') return 'amd64';
  return process.arch;
}
