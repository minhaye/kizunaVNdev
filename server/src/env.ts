import "dotenv/config";

const required = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SMTP_USER", "SMTP_PASS"] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing env var: ${key}`);
  }
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  supabaseUrl: process.env.SUPABASE_URL as string,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY as string,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  authTokenSecret: process.env.AUTH_TOKEN_SECRET ?? "dev-local-secret-change-me",
  smtpHost: process.env.SMTP_HOST ?? "smtp.gmail.com",
  smtpPort: Number(process.env.SMTP_PORT ?? 465),
  smtpUser: process.env.SMTP_USER as string,
  smtpPass: process.env.SMTP_PASS as string,
  smtpFromEmail: process.env.SMTP_FROM_EMAIL ?? (process.env.SMTP_USER as string),
  smtpFromName: process.env.SMTP_FROM_NAME ?? "KizunaVN",
};
