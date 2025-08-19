#!/usr/bin/env bash
set -euo pipefail

# ================================
# cycle.sh – Clube de Vantagens API
# Pull → (Install se preciso) → Test → Commit → Push
# Uso:
#   ./scripts/cycle.sh                # fluxo padrão
#   ./scripts/cycle.sh --no-test      # pula testes (não recomendado)
#   ./scripts/cycle.sh --no-push      # não faz push
#   ./scripts/cycle.sh --migrate      # roda npm run migrate se DATABASE_URL existir
# ================================

# --- Helpers ---
log()  { printf "\033[1;34m[cycle]\033[0m %s\n" "$*"; }
ok()   { printf "\033[1;32m[ok]\033[0m %s\n" "$*"; }
fail() { printf "\033[1;31m[fail]\033[0m %s\n" "$*" >&2; }

NO_TEST=false
NO_PUSH=false
DO_MIGRATE=false

for arg in "$@"; do
  case "$arg" in
    --no-test)   NO_TEST=true ;;
    --no-push)   NO_PUSH=true ;;
    --migrate)   DO_MIGRATE=true ;;
    *) fail "arg desconhecido: $arg"; exit 2 ;;
  esac
done

# Garante que estamos na raiz do repo (onde está package.json)
if [ ! -f package.json ]; then
  if [ -f "./scripts/cycle.sh" ]; then
    cd "$(git rev-parse --show-toplevel)"
  fi
fi

# Info de branch
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
TS="$(date '+%Y-%m-%d %H:%M:%S')"
COMMIT_MSG="chore(cycle): update on $BRANCH @ $TS"

log "branch atual: $BRANCH"

# 1) Atualizar a base
log "pull --rebase origin/$BRANCH..."
git fetch origin "$BRANCH" --quiet || true
git pull --rebase origin "$BRANCH" || { fail "git pull --rebase falhou"; exit 1; }
ok "pull ok"

# 2) Instalar deps somente se necessário
INSTALL_NEEDED=false
if git diff --name-only HEAD~1..HEAD -- package.json package-lock.json >/dev/null 2>&1; then
  :
fi
# Também checa se node_modules está ausente
if [ ! -d node_modules ]; then
  INSTALL_NEEDED=true
fi
# Ou se package-lock estiver desatualizado em relação ao package.json
if ! jq -e . < package.json >/dev/null 2>&1; then
  :
fi

# Regra simples: se node_modules não existe OU se package-lock.json mudou localmente, instalamos
if [ "$INSTALL_NEEDED" = true ] || git status --porcelain | grep -qE '(^ M |^\?\? )package-lock\.json'; then
  log "instalando dependências (npm install)..."
  npm install --no-audit --no-fund
  ok "deps ok"
else
  log "pulando npm install (sem mudanças detectadas)"
fi

# 3) Migrações (opcional)
if [ "$DO_MIGRATE" = true ]; then
  if [ -n "${DATABASE_URL:-}" ]; then
    log "rodando migrações (npm run migrate)..."
    npm run migrate
    ok "migrations ok"
  else
    log "DATABASE_URL ausente → pulando migrações"
  fi
fi

# 4) Testes (com .env.test + DISABLE_MP=true)
if [ "$NO_TEST" = false ]; then
  log "executando testes..."
  cross_env_cmd="npx cross-env"
  if ! command -v npx >/dev/null 2>&1; then
    fail "npx não encontrado. Instale Node.js/NPM."
    exit 1
  fi
  # Usa os scripts já definidos no package.json
  NODE_ENV=test DISABLE_MP=true dotenv_config_path=.env.test npm test
  ok "testes ok"
else
  log "pulado: testes (--no-test)"
fi

# 5) Commit & push
log "adicionando alterações..."
git add -A
if git diff --cached --quiet; then
  log "nada para commitar"
else
  log "commitando: $COMMIT_MSG"
  git commit -m "$COMMIT_MSG" || true
fi

if [ "$NO_PUSH" = false ]; then
  log "dando push para origin/$BRANCH..."
  git push origin "$BRANCH"
  ok "push ok"
else
  log "pulado: push (--no-push)"
fi

ok "ciclo concluído 🎯"

