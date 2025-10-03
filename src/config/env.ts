import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables
dotenv.config();

// Validation schema for environment variables
const envSchema = z.object({
  // Server

  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default("4400"),

  // Database
  DATABASE_URL: z.string(),

  // Auth
  JWT_SECRET: z.string().min(10),
  JWT_EXPIRES_IN: z.string().default("90d"),

  SMT_EMAIL: z.string(),
  SOURCE_EMAIL: z.string(),
  SMT_PASSWORD: z.string(),

  FRONTEND_URL: z.string(),
  SERVER_URL: z.string(),

  ENVIRONMENT: z.enum(["development", "production"]),

  // AWS S3 configuration
  AWS_S3_BUCKET_NAME: z.string(),
  AWS_S3_BUCKET_REGION: z.string(),
  AWS_ACCESS_KEY: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
});

// Parse and validate environment variables
const env = envSchema.safeParse(process.env);

if (!env.success) {
  console.error("❌ Invalid environment variables:", env.error.format());
  throw new Error("Invalid environment variables");
}

// Export validated environment variables
export default env.data;
