#!/usr/bin/env bash
set -euo pipefail

# ================================
# cycle.sh – Clube de Vantagens API
# Fluxos suportados:
#   ./cycle.sh                     # fluxo padrão (pull → install se preciso → test → commit → push)
#   ./cycle.sh --git-only          # **somente git** (pull rebase com autostash → commit → push)  ← recomendado p/ Codex
#   ./cycle.sh "msg do commit"     # define mensagem de commit
#   ./cycle.sh --no-test           # pula testes (modo padrão)
#   ./cycle.sh --no-push           # não faz push
#   ./cycle.sh --migrate           # roda npm run migrate se DATABASE_URL existir
# ================================

log()  { printf "\033[1;34m[cycle]\033[0m %s\n" "$*"; }
ok()   { printf "\033[1;32m[ok]\033[0m %s\n" "$*"; }
fail() { printf "\033[1;31m[fail]\033[0m %s\n" "$*" >&2; }

# ---- Flags ----
NO_TEST=false
NO_PUSH=false
DO_MIGRATE=false
GIT_ONLY=false
COMMIT_MSG=""

for arg in "$@"; do
  case "$arg" in
    --no-test)   NO_TEST=true ;;
    --no-push)   NO_PUSH=true ;;
    --migrate)   DO_MIGRATE=true ;;
    --git-only)  GIT_ONLY=true; NO_TEST=true ;;
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

# --- Funções utilitárias ---
have_changes() { ! git diff --quiet || ! git diff --cached --quiet; }

safe_pull_rebase() {
  log "git fetch origin $BRANCH..."
  git fetch origin "$BRANCH" --quiet || true

  log "git pull --rebase origin/$BRANCH (autostash se preciso)..."
  if ! git pull --rebase --autostash origin "$BRANCH"; then
    # fallback manual de autostash
    STASH_MSG="cycle.sh autostash $(date '+%Y-%m-%d %H:%M:%S')"
    log "pull falhou por alterações locais → aplicando stash temporário"
    git stash push -u -m "$STASH_MSG" || true
    git pull --rebase origin "$BRANCH"
    # tentar aplicar de volta
    if git stash list | grep -q "$STASH_MSG"; then
      log "restaurando alterações do stash..."
      git stash pop || true
    fi
  fi
  ok "pull ok"
}

# ================================
# MODO GIT ONLY (sem npm install/test)
# ================================
if [[ "$GIT_ONLY" == true ]]; then
  log "modo: --git-only (sem npm ci/test)"

  safe_pull_rebase

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

  ok "ciclo concluído (git-only) 🎯"
  exit 0
fi

# ================================
# FLUXO PADRÃO
# ================================
safe_pull_rebase

# 2) Instalar dependências somente se necessário
INSTALL_NEEDED=false
if [[ ! -d node_modules ]]; then
  INSTALL_NEEDED=true
fi
# Se package.json ou package-lock.json mudaram no working tree, instala
if git status --porcelain | grep -qE '(^\s*M|\?\?)\s+(package\.json|package-lock\.json)'; then
  INSTALL_NEEDED=true
fi

if [[ "$INSTALL_NEEDED" == true ]]; then
  if command -v npm >/dev/null 2>&1; then
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
    log "npm indisponível → pulando instalação"
  fi
else
  log "pulando instalação: sem mudanças detectadas"
fi

# 3) Migrações (opcional)
if [[ "$DO_MIGRATE" == true ]]; then
  if [[ -n "${DATABASE_URL:-}" ]] && npm run | grep -q '^  migrate'; then
    log "rodando migrações (npm run migrate)..."
    npm run migrate
    ok "migrations ok"
  else
    log "DATABASE_URL ausente ou script migrate não encontrado → pulando migrações"
  fi
fi

# 4) Testes
if [[ "$NO_TEST" == false ]]; then
  if npm run | grep -q '^  test'; then
    log "executando testes..."
    npm test
    ok "testes ok"
  else
    log "script de teste não encontrado → pulando"
  fi
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
