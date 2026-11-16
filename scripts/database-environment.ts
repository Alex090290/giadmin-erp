import { readFileSync, existsSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { parse } from "dotenv";
import { assertDatabaseCommand, databaseTarget, type DatabaseCommand, type DatabaseEnvironment } from "../src/lib/database-environment";

async function main() {
  const [environment, command] = process.argv.slice(2) as [DatabaseEnvironment, DatabaseCommand];
  if (!["development", "production"].includes(environment) || !["check", "status", "deploy", "build", "start"].includes(command) || process.argv.length !== 4) throw new Error("Uso: database-environment.ts development|production check|status|deploy|build|start");
  let branch: string | null = null;
  try { branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || null; } catch { /* A deployment without Git needs its own explicit CI workflow. */ }
  assertDatabaseCommand(environment, command, branch);
  const file = `.env.${environment}.local`;
  const fileUrl = existsSync(file) ? parse(readFileSync(file)).DATABASE_URL : undefined;
  if (process.env.DATABASE_URL && fileUrl && process.env.DATABASE_URL !== fileUrl) throw new Error("DATABASE_URL está exportada con un valor distinto al archivo del ambiente. Retírala de la terminal o revisa la configuración antes de continuar.");
  const connection = process.env.DATABASE_URL || fileUrl;
  if (!connection) throw new Error(`Configura DATABASE_URL en ${file} o en el entorno de despliegue.`);
  const target = databaseTarget(connection);
  console.log(JSON.stringify({ environment, branch, file: fileUrl ? file : "entorno del proceso", ...target }));
  if (command === "check") {
    const { createPrismaClient } = await import("../src/lib/prisma-client");
    const prisma = createPrismaClient(connection);
    try {
      const rows = await prisma.$queryRaw<{ database: string; role: string; tables: number }[]>`SELECT current_database() AS database, current_user AS role, (SELECT count(*)::int FROM information_schema.tables WHERE table_schema = 'public') AS tables`;
      if (rows[0]?.database !== target.database) throw new Error("La conexión no corresponde a la base configurada.");
      console.log(JSON.stringify({ connected: true, ...rows[0] }));
    } finally { await prisma.$disconnect(); }
    return;
  }
  const require = createRequire(import.meta.url);
  const env = { ...process.env, NODE_ENV: environment, DATABASE_URL: connection };
  const run = (entry: string, args: string[]) => {
    const result = spawnSync(process.execPath, [require.resolve(entry), ...args], { env, stdio: "inherit" });
    if (result.error) throw new Error("No se pudo iniciar el comando solicitado.");
    if (result.status !== 0) { process.exitCode = result.status ?? 1; return false; }
    return true;
  };
  if (command === "build") { if (run("prisma/build/index.js", ["generate", "--config", "prisma7.config.ts"])) run("next/dist/bin/next", ["build"]); }
  else if (command === "start") run("next/dist/bin/next", ["start"]);
  else run("prisma/build/index.js", ["migrate", command, "--config", "prisma7.config.ts"]);
}
main().catch(error => {
  // Configuration errors above are safe; connection errors may contain private connection details.
  const message = error instanceof Error && !Reflect.has(error, "code") && !Reflect.has(error, "clientVersion") ? error.message : "No se pudo completar la comprobación. Revisa el contenedor, puerto y credenciales del ambiente.";
  console.error(message);
  process.exitCode = 1;
});
