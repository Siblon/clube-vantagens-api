# Quick Wins

| Ação | Arquivos | Ganho esperado | Risco | Esforço |
| --- | --- | --- | --- | --- |
| Corrigir rota `/status` usando `express.Router` | `controllers/statusController.js`, `server.js` | Evita erro de middleware e expõe endpoint de saúde completo | Baixo | M |
| Simplificar scripts de teste no `package.json` | `package.json` | Execução de testes mais previsível | Baixo | S |
| Adicionar `.editorconfig` e `.gitattributes` | `.editorconfig`, `.gitattributes` | Padroniza EOL e indentação, evitando diffs | Baixo | S |
| Criar `cycle.ps1` para Windows | `cycle.ps1` | Melhora fluxo de desenvolvimento cross-platform | Baixo | M |
| Configurar GitHub Actions para `npm test` | `.github/workflows/ci.yml` | Feedback automático em PRs | Baixo | M |
| Mock centralizado do Supabase para testes | `__mocks__/config/supabase.js` | Isola dependências externas | Médio | S |
