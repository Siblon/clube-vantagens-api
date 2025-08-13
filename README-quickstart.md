# Quickstart

## Variáveis de ambiente
| Variável | Descrição |
|---------|-----------|
| `SUPABASE_URL` | URL do projeto Supabase. |
| `SUPABASE_ANON` | Chave pública do Supabase. |
| `ADMIN_PIN` | PIN exigido em rotas administrativas (`x-admin-pin`). |
| `ALLOWED_ORIGIN` | Domínio permitido para CORS (ex.: `https://seusite.netlify.app`). |

## Como testar
1. Suba a API no Railway configurando as variáveis acima.
2. Publique a pasta `frontend/` no Netlify (não há etapa de build).
3. Acesse `https://seusite.netlify.app/testar-cadastro.html`.
4. Preencha o formulário, informe o PIN quando solicitado e envie.
5. As requisições usam o caminho `/api` que é redirecionado pelo Netlify para a API no Railway.
