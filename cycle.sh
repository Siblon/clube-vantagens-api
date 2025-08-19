#!/usr/bin/env bash
set -euo pipefail

# ================================
# cycle.sh – Clube de Vantagens API
# Pull → (Install se preciso) → Test → Commit → Push
# Uso:
#   ./cycle.sh                       # fluxo padrão
#   ./cycle.sh "minha msg"           # usa uma mensagem custom de commit
#   ./cycle.sh --no-test             # pula testes (não recomendado)
#   ./cycle.sh --no-push             # não faz push
#   ./cycle.sh --migrate             # roda npm run migrate se DATABASE_URL existir
# ================================

log()  { printf "\033[1;34m[cycle]\033[0m %s\n" "$*"; }
ok()   { printf "\033[1;32m[ok]\033[0m %s\n" "$*"; }
fail() { printf "\033[1;31m[fail]\033[0m %s\n" "$*" >&2; }

# ---- Flags ----
NO_TEST=false
NO_PUSH=false
DO_MIGRATE=false
COMMIT_MSG=""

for arg in "$@"; do
  case "$arg" in
    --no-test)   NO_TEST=true ;;
    --no-push)   NO_PUSH=true ;;
    --migrate)   DO_MIGRATE=true ;;
    --*)         fail "argumento desconhecido: $arg"; exit 2 ;;
    *)           COMMIT_MSG="$arg" ;;  # primeira string sem -- vira commit msg
  esac
done

# Ir pra raiz do repo
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -n "${REPO_ROOT}" ]]; then cd "$REPO_ROOT"; fi
if [[ ! -f package.json ]]; then fail "não achei package.json aqui"; exit 1; fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
TS="$(date '+%Y-%m-%d %H:%M:%S')"
DEFAULT_MSG="chore(cycle): update on ${BRANCH} @ ${TS}"
[[ -z "$COMMIT_MSG" ]] && COMMIT_MSG="$DEFAULT_MSG"

log "branch atual: $BRANCH"

# 1) Pull --rebase
log "git pull --rebase origin/$BRANCH..."
git fetch origin "$BRANCH" --quiet || true
git pull --rebase origin "$BRANCH" || { fail "git pull --rebase falhou"; exit 1; }
ok "pull ok"

# 2) Instalar dependências somente se necessário
INSTALL_NEEDED=false
if [[ ! -d node_modules ]]; then
  INSTALL_NEEDED=true
fi
# Se package.json ou package-lock.json mudaram no working tree, instala
if git status --porcelain | grep -qE '(^\s*M|\?\?)\s+(package\.json|package-lock\.json)'; then
  INSTALL_NEEDED=true
fi

# Se existir package-lock, preferir npm ci (se falhar, cai pro npm install)
if [[ "$INSTALL_NEEDED" == true ]]; then
  if [[ -f package-lock.json ]]; then
    log "instalando deps (npm ci)..."
    if npm ci --no-audit --no-fund; then
      ok "deps ok (ci)"
    else
      log "npm ci falhou → tentando npm install..."
      npm install --no-audit --no-fund
      ok "deps ok (install)"
    fi
  else
    log "instalando deps (npm install)..."
    npm install --no-audit --no-fund
    ok "deps ok"
  fi
else
  log "pulando instalação: sem mudanças detectadas"
fi

# 3) Migrações (opcional)
if [[ "$DO_MIGRATE" == true ]]; then
  if [[ -n "${DATABASE_URL:-}" ]]; then
    log "rodando migrações (npm run migrate)..."
    npm run migrate
    ok "migrations ok"
  else
    log "DATABASE_URL ausente → pulando migrações"
  fi
fi

# 4) Testes (usando .env.test + DISABLE_MP=true)
if [[ "$NO_TEST" == false ]]; then
  log "executando testes..."
  # Scripts já estão configurados no package.json para .env.test e DISABLE_MP=true
  npm test
  ok "testes ok"
else
  log "pulado: testes (--no-test)"
fi

# 5) Commit & Push
log "adicionando alterações..."
git add -A

if git diff --cached --quiet; then
  log "nada para commitar"
else
  log "commitando: $COMMIT_MSG"
  git commit -m "$COMMIT_MSG" || true
fi

if [[ "$NO_PUSH" == false ]]; then
  log "fazendo push para origin/$BRANCH..."
  git push origin "$BRANCH"
  ok "push ok"
else
  log "pulado: push (--no-push)"
fi

ok "ciclo concluído 🎯"
