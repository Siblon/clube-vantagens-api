#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function git(args) {
  return spawnSync('git', args, { encoding: 'utf8' });
}

const ls = git(['ls-files', 'src']);
const files = ls.stdout.trim().split('\n').filter(Boolean);

const byBase = new Map();
const byHash = new Map();
const byNames = [];

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  const hash = crypto.createHash('sha1').update(content).digest('hex');
  const base = path.basename(file);
  const names = new Set();
  const regex = /function\s+(\w+)/g;
  let m;
  while ((m = regex.exec(content))) {
    names.add(m[1]);
  }
  byNames.push({ file, names });
  if (!byBase.has(base)) byBase.set(base, []);
  byBase.get(base).push(file);
  if (!byHash.has(hash)) byHash.set(hash, []);
  byHash.get(hash).push(file);
}

let problems = false;

console.log('== Duplicate basenames ==');
for (const [base, list] of byBase) {
  if (list.length > 1) {
    problems = true;
    console.log(`${base}: ${list.join(', ')}`);
  }
}

console.log('== Identical files ==');
for (const [hash, list] of byHash) {
  if (list.length > 1) {
    problems = true;
    console.log(`${hash}: ${list.join(', ')}`);
  }
}

console.log('== Similar exports (>=3 common functions) ==');
for (let i = 0; i < byNames.length; i++) {
  for (let j = i + 1; j < byNames.length; j++) {
    const a = byNames[i];
    const b = byNames[j];
    const common = [...a.names].filter((n) => b.names.has(n));
    if (common.length >= 3) {
      problems = true;
      console.log(`${a.file} ~ ${b.file}: ${common.join(', ')}`);
    }
  }
}

function runGrep(pattern) {
  const res = git(['grep', '-n', pattern, '--', 'src']);
  const out = res.stdout.trim();
  if (out) {
    console.log(`== git grep ${pattern} ==\n${out}`);
  } else {
    console.log(`== git grep ${pattern} ==\n(no results)`);
  }
}

runGrep('createPlano');
runGrep('updatePlano');
runGrep('module\\.exports');

process.exit(problems ? 1 : 0);
