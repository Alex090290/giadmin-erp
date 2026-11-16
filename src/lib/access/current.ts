import "server-only";
import { cache } from "react";
import { getCurrentUser } from "../auth/access";
import { prisma } from "../prisma";
import { readAccessCapabilities } from "./engine";
import { AccessError } from "../auth/policy";

/**
 * Session user plus effective access groups, once per request. Presentation only
 * (drawer, menus, application layout): every operation is authorized again on the server.
 */
export const getCurrentAccessUser = cache(async () => {
  const user = await getCurrentUser();
  if (!user?.id) return null;
  try {
    const access = await prisma.$transaction(tx => readAccessCapabilities(tx, user), { isolationLevel: "RepeatableRead" });
    return { ...user, ...access };
  } catch (error) {
    if (error instanceof AccessError && error.code === "UNAUTHENTICATED") return null;
    throw error;
  }
});
