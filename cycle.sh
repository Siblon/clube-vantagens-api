#!/usr/bin/env bash
set -euo pipefail

git pull --rebase

npm ci || npm install

npm test

git add -A
git commit -m "chore(cycle): auto" || true
git push
