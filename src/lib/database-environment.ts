export type DatabaseEnvironment = "development" | "production";
export type DatabaseCommand = "check" | "status" | "deploy" | "build" | "start";

/** A local checkout guard, not a replacement for database roles or deployment authorization. */
export function assertDatabaseCommand(environment: DatabaseEnvironment, command: DatabaseCommand, branch: string | null) {
  if (environment === "production" && !["check", "status"].includes(command) && branch !== "main") {
    throw new Error("Este comando de producción requiere la rama main. Las ramas de trabajo deben usar desarrollo.");
  }
}

export function databaseTarget(connection: string) {
  const url = new URL(connection);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || url.pathname === "/" || !url.pathname) throw new Error("Configura una URL PostgreSQL con nombre de base de datos.");
  return { host: url.hostname, port: url.port || "5432", database: decodeURIComponent(url.pathname.slice(1)), schema: url.searchParams.get("schema") || "public" };
}
