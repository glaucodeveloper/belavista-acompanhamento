import readline from 'node:readline';
import { Writable } from 'node:stream';
export async function prompt(question, { secret = false } = {}) {
  let muted = false;
  const output = new Writable({ write(chunk, encoding, callback) { if (!muted) process.stdout.write(chunk, encoding); callback(); } });
  const rl = readline.createInterface({ input: process.stdin, output, terminal: Boolean(process.stdin.isTTY) });
  return new Promise(resolve => {
    rl.question(question, answer => { rl.close(); if (secret && process.stdin.isTTY) process.stdout.write('\n'); resolve(answer); });
    if (secret && process.stdin.isTTY) muted = true;
  });
}
