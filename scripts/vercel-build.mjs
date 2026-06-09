// Vercel build entry (see vercel.json).
//
// Vercel's database integrations set different env var names depending on
// provider and vintage (DATABASE_URL for Neon, POSTGRES_URL/POSTGRES_PRISMA_URL
// for Vercel Postgres). Resolve whichever exists, expose it as DATABASE_URL,
// then run: prisma generate → prisma db push → next build.

import { spawnSync } from "node:child_process";

const candidates = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "DATABASE_POSTGRES_URL",
];

const found = candidates.find(
  (name) => process.env[name] && /^postgres(ql)?:\/\//.test(process.env[name]),
);

if (!found) {
  console.error(
    "\n[invrt] No Postgres connection string found.\n" +
      `Checked: ${candidates.join(", ")}.\n\n` +
      "Fix: in your Vercel project, open the Storage tab and create/connect a\n" +
      "Postgres database (Neon), then redeploy. The integration sets the env\n" +
      "var automatically.\n",
  );
  process.exit(1);
}

const dbUrl = process.env[found];
console.log(`[invrt] Using Postgres URL from ${found}`);

// db push prefers a direct (non-pooled) connection when one is available.
const directUrl =
  process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || dbUrl;

const steps = [
  ["npx prisma generate --schema=prisma/schema.postgres.prisma", dbUrl],
  ["npx prisma db push --schema=prisma/schema.postgres.prisma --skip-generate", directUrl],
  ["npx next build", dbUrl],
];

for (const [cmd, url] of steps) {
  console.log(`[invrt] ${cmd}`);
  const res = spawnSync(cmd, {
    shell: true,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}
