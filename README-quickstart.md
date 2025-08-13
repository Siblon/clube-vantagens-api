# Quickstart

## Environment variables
| Variable | Description |
|---------|-------------|
| `DATABASE_URL` | PostgreSQL connection string used for migrations (`dbmate`). |
| `SUPABASE_URL` | URL of the Supabase project. |
| `SUPABASE_ANON` | Supabase anon/public key. |
| `ADMIN_PIN` | PIN required on admin routes (`x-admin-pin` header). |
| `ALLOWED_ORIGIN` | Comma-separated list of origins allowed for CORS. |
| `PORT` | Port the API listens on (default 3000). |
| `RECAPTCHA_SECRET` | reCAPTCHA secret for lead capture. |
| `MP_ACCESS_TOKEN` | Mercado Pago access token. |
| `MP_COLLECTOR_ID` | Mercado Pago collector ID. |
| `MP_WEBHOOK_SECRET` | Secret to validate Mercado Pago webhooks. |
| `APP_BASE_URL` | Public base URL used for payment redirects. |
| `RAILWAY_URL` | URL used by `scripts/patch-vercel.js` during deploy. |

## Run locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure the environment variables (e.g. in a `.env` file).
3. Start the API:
   ```bash
   npm start
   ```
4. Check the health endpoint:
   ```bash
   curl http://localhost:3000/health
   ```
5. For manual form testing, serve the frontend and open the test page:
   ```bash
   npx netlify dev
   ```
   Then visit [http://localhost:8888/testar-cadastro.html](http://localhost:8888/testar-cadastro.html).

## Netlify proxy
`netlify.toml` includes a redirect to proxy API requests:
```toml
[[redirects]]
  from = "/api/*"
  to = "https://SEU-APP-RAILWAY.up.railway.app/:splat"
  status = 200
  force = true
```
Update the `to` value with your API URL if you use a different backend before running `netlify dev`.
