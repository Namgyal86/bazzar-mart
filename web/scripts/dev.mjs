/**
 * Custom dev launcher:
 *   1. Starts Next.js dev server (with HMR — file changes auto-recompile)
 *   2. Spawns the warmup script to pre-compile every route on startup
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const isWin = process.platform === 'win32';

// ── Start Next.js dev server ──────────────────────────────────────────────────
const server = spawn(
  isWin ? 'npx.cmd' : 'npx',
  ['next', 'dev'],
  {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, npm_config_workspaces: 'false' },
  },
);

server.on('error', (err) => {
  console.error('[dev] Failed to start Next.js:', err.message);
  process.exit(1);
});

// ── Start warmup concurrently ─────────────────────────────────────────────────
const warmup = spawn(
  process.execPath,
  [path.join(__dirname, 'warmup.mjs')],
  {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env },
  },
);

warmup.on('error', (err) => {
  console.warn('[warmup] Could not start warmup:', err.message);
});

// ── Signal forwarding ─────────────────────────────────────────────────────────
function cleanup() {
  try { warmup.kill(); } catch {}
  try { server.kill(); } catch {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

server.on('exit', (code) => {
  try { warmup.kill(); } catch {}
  process.exit(code ?? 0);
});
