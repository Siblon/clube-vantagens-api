const { z } = require('zod');
require('dotenv').config({
  path: process.env.DOTENV_CONFIG_PATH || process.env.dotenv_config_path || '.env',
});

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ADMIN_PIN: z.string().min(1),
  MP_ACCESS_TOKEN: z.string().optional(),
  MP_COLLECTOR_ID: z.string().optional(),
  MP_WEBHOOK_SECRET: z.string().optional(),
  APP_BASE_URL: z.string().url().optional(),
  ALLOWED_ORIGIN: z.string().optional(),
  RECAPTCHA_SECRET: z.string().optional(),
  PORT: z.string().optional(),
  NODE_ENV: z.string().optional(),
});

const env = envSchema.safeParse(process.env);
if (!env.success) {
  console.error('❌ Invalid environment variables', env.error.format());
  throw new Error('Invalid environment variables');
}

module.exports = env.data;
