const parseCorsOrigin = (raw: string | undefined): string | string[] => {
  if (!raw || raw === '*') return '*';
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length <= 1 ? parts[0] : parts;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000,
  corsOrigin: parseCorsOrigin(process.env.CORS_ORIGIN),
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/library?schema=public',
};
