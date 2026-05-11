import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  INTERNAL_SECRET_ENCRYPTION_KEY: z.string().min(1),
  OPENOCTOPUS_API_KEY_SALT: z.string().min(1),
  GATEWAY_PUBLIC_BASE_URL: z.string().url().optional(),
  GENERATED_ASSETS_BUCKET: z.string().min(1).default("generated-assets"),
});

export const env = envSchema.parse(process.env);
