import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { z } from "zod";

const currentDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(currentDir, "../../../.env.local"), override: false });
loadEnv({ path: resolve(currentDir, "../.env.local"), override: false });
loadEnv();

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(8080),
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    INTERNAL_SECRET_ENCRYPTION_KEY: z.string().min(1),
    OPENOCTOPUS_API_KEY_SALT: z.string().min(1),
    GATEWAY_PUBLIC_BASE_URL: z.string().url().optional(),
    GENERATED_ASSETS_BUCKET: z.string().min(1).default("generated-assets"),
  })
  .superRefine((input, ctx) => {
    if (input.NODE_ENV === "production" && !input.GATEWAY_PUBLIC_BASE_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["GATEWAY_PUBLIC_BASE_URL"],
        message:
          "GATEWAY_PUBLIC_BASE_URL is required in production so generated asset URLs are absolute.",
      });
    }
  });

export const env = envSchema.parse(process.env);
