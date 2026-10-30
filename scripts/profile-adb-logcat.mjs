#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { once } from 'node:events';
import { basename, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

const DEFAULT_DURATION_SECONDS = 15;

function usage() {
  console.log(`Profile Android log reading through ADB logcat.

Usage:
  node scripts/profile-adb-logcat.mjs [options]

Options:
  -s, --serial <id>       ADB device serial (required when multiple devices are connected)
  -p, --package <name>    Limit logs to the running process for this package
  -d, --duration <secs>   Capture duration; 0 keeps reading until Ctrl+C (default: ${DEFAULT_DURATION_SECONDS})
  -o, --out <file>        Also save raw logcat lines to this file
  -h, --help              Show this help

Example:
  npm run profile:adb:logs -- --serial emulator-5554 --package com.aliancapark.app --duration 30 --out /tmp/alianca-logcat.txt`);
}

function parseArgs(argv) {
  const options = { serial: process.env.ANDROID_SERIAL, packageName: '', duration: DEFAULT_DURATION_SECONDS, out: '' };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') { options.help = true; continue; }
    const aliases = { '-s': 'serial', '--serial': 'serial', '-p': 'packageName', '--package': 'packageName', '-d': 'duration', '--duration': 'duration', '-o': 'out', '--out': 'out' };
    const key = aliases[arg];
    if (!key) throw new Error(`Opção desconhecida: ${arg}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Informe o valor de ${arg}.`);
    options[key] = value;
    index += 1;
  }
  options.duration = Number(options.duration);
  if (!Number.isFinite(options.duration) || options.duration < 0) throw new Error('--duration deve ser zero ou um número positivo.');
  if (options.duration > 3600) throw new Error('--duration aceita no máximo 3600 segundos.');
  return options;
}

function runAdb(adb, serial, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(adb, ['-s', serial, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', code => code === 0 ? resolvePromise(stdout.trim()) : reject(new Error(stderr.trim() || `adb terminou com código ${code}.`)));
  });
}

async function selectDevice(adb, preferredSerial) {
  const child = spawn(adb, ['devices', '-l'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  const [code] = await once(child, 'close');
  if (code !== 0) throw new Error(stderr.trim() || 'Não foi possível consultar dispositivos ADB.');
  const devices = stdout.split(/\r?\n/).slice(1).map(line => line.trim()).filter(Boolean)
    .filter(line => /\sdevice(?:\s|$)/.test(line)).map(line => line.split(/\s+/)[0]);
  if (preferredSerial) {
    if (!devices.includes(preferredSerial)) throw new Error(`Dispositivo ${preferredSerial} não está conectado ou não está autorizado no ADB.`);
    return preferredSerial;
  }
  if (devices.length === 1) return devices[0];
  if (devices.length === 0) throw new Error('Nenhum dispositivo ADB autorizado foi encontrado.');
  throw new Error(`Há vários dispositivos ADB (${devices.join(', ')}). Informe --serial.`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { usage(); return; }
  const adb = process.env.ADB || 'adb';
  const serial = await selectDevice(adb, options.serial);
  const pid = options.packageName ? await runAdb(adb, serial, ['shell', 'pidof', '-s', options.packageName]) : '';
  if (options.packageName && !/^\d+$/.test(pid)) throw new Error(`O pacote ${options.packageName} não está em execução no dispositivo ${serial}.`);

  const args = ['logcat', '-b', 'all', '-v', 'epoch', '-T', '1'];
  if (pid) args.push('--pid', pid);
  const child = spawn(adb, ['-s', serial, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
  const startedAt = performance.now();
  let bytes = 0;
  let lines = 0;
  let partial = Buffer.alloc(0);
  let stderr = '';
  let timedOut = false;
  const outputPath = options.out ? resolve(options.out) : '';
  const output = outputPath ? createWriteStream(outputPath, { flags: 'w' }) : null;
  const timer = options.duration ? setTimeout(() => { timedOut = true; child.kill('SIGINT'); }, options.duration * 1000) : null;
  const forceStop = setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); }, (options.duration || 3600) * 1000 + 3000);

  child.stdout.on('data', chunk => {
    bytes += chunk.length;
    if (output && !output.write(chunk)) {
      child.stdout.pause();
      output.once('drain', () => child.stdout.resume());
    }
    const combined = Buffer.concat([partial, chunk]);
    let start = 0;
    for (let index = 0; index < combined.length; index += 1) {
      if (combined[index] === 10) { lines += 1; start = index + 1; }
    }
    partial = combined.subarray(start);
  });
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-4000); });
  let exitCode;
  let signal;
  try {
    [exitCode, signal] = await once(child, 'close');
  } catch (error) {
    clearTimeout(timer);
    clearTimeout(forceStop);
    output?.destroy();
    throw error;
  }
  clearTimeout(timer);
  clearTimeout(forceStop);
  if (partial.length) lines += 1;
  if (output) await new Promise((resolvePromise, reject) => output.end(error => error ? reject(error) : resolvePromise()));
  const elapsedSeconds = Math.max((performance.now() - startedAt) / 1000, 0.001);
  const result = {
    device: serial,
    package: options.packageName || null,
    pid: pid || null,
    durationSeconds: Number(elapsedSeconds.toFixed(3)),
    requestedDurationSeconds: options.duration,
    stoppedByDuration: timedOut,
    exitCode,
    signal,
    linesRead: lines,
    bytesRead: bytes,
    linesPerSecond: Number((lines / elapsedSeconds).toFixed(2)),
    bytesPerSecond: Number((bytes / elapsedSeconds).toFixed(2)),
    outputFile: outputPath ? { path: outputPath, name: basename(outputPath) } : null,
    stderr: stderr.trim() || null,
  };
  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
