Param()
$ErrorActionPreference = 'Stop'

git pull --rebase

try {
  npm ci
} catch {
  npm install
}

npm test

git add -A
if (-not (git diff --cached --quiet)) {
  git commit -m "chore(cycle): auto"
}

git push
