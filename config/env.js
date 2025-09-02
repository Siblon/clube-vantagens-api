const z = require('zod');
require('dotenv').config({
  path: process.env.DOTENV_CONFIG_PATH || process.env.dotenv_config_path || '.env',
});

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON: z.string().min(10),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
  DATABASE_URL: z.string().min(10),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
  ADMIN_PIN: z.string().optional(),
  MP_ACCESS_TOKEN: z.string().optional(),
  MP_COLLECTOR_ID: z.string().optional(),
  MP_WEBHOOK_SECRET: z.string().optional(),
  APP_BASE_URL: z.string().url().optional(),
  ALLOWED_ORIGIN: z.string().optional(),
  RECAPTCHA_SECRET: z.string().optional(),
  PORT: z.string().optional(),
});

module.exports = envSchema.parse(process.env);
