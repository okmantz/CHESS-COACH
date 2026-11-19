// Node transport for the same Engine class (used by content generators & tests).
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Engine } from '../js/engine.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const ENGINE = path.join(here, '..', 'engine', 'stockfish-19-lite-single.js');

export function nodeEngine() {
  const child = spawn(process.execPath, [ENGINE], { stdio: ['pipe', 'pipe', 'ignore'] });
  const t = {
    onmessage: null,
    post: (c) => child.stdin.write(c + '\n'),
    terminate: () => { try { child.stdin.end(); child.kill(); } catch (e) { /* noop */ } },
  };
  let buf = '';
  child.stdout.on('data', (d) => {
    buf += d.toString();
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 1);
      t.onmessage && t.onmessage(line);
    }
  });
  return new Engine(t);
}
