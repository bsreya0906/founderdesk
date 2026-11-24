import "dotenv/config";

const required = (name: string): string => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
};

export const config = {
  port: Number(process.env.PORT ?? 4000),
  // "memory" (or unset) starts a throwaway in-memory MongoDB seeded with demo data.
  mongoUri: process.env.MONGODB_URI || "memory",
  apiKey: required("API_KEY"),
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:3000").split(",").map((s) => s.trim()),
  llm: {
    provider: (process.env.LLM_PROVIDER ?? "mock") as "anthropic" | "openai" | "mock",
    anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
    anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
    openaiKey: process.env.OPENAI_API_KEY ?? "",
    openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  },
};
