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
  WAVESPEED_BASE_URL: z.string().url().default("https://api.wavespeed.ai"),
  WAVESPEED_IMAGE_SUBMIT_PATH: z.string().min(1).default("/v1/images/generations"),
  WAVESPEED_IMAGE_STATUS_PATH: z.string().min(1).default("/v1/predictions/{taskId}"),
  WAVESPEED_IMAGE_API_KEY_HEADER: z.string().min(1).default("Authorization"),
  WAVESPEED_IMAGE_API_KEY_PREFIX: z.string().default("Bearer"),
  WAVESPEED_IMAGE_RESULT_URL_FIELD: z.string().default("output.image_url"),
  WAVESPEED_IMAGE_STATUS_FIELD: z.string().default("status"),
  WAVESPEED_IMAGE_TASK_ID_FIELD: z.string().default("id"),
  WAVESPEED_IMAGE_REQUEST_ID_FIELD: z.string().default("id"),
  GATEWAY_PUBLIC_BASE_URL: z.string().url().optional(),
  GENERATED_ASSETS_BUCKET: z.string().min(1).default("generated-assets"),
});

export const env = envSchema.parse(process.env);
