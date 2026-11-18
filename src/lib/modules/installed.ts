import "server-only";
import { modules as declared } from "@/modules";
import core from "../core/manifest";
import { composeModules } from "./compose";
import type { ModuleDefinition } from "./define";

/**
 * Every registered module: the native `core` (always present, never in src/modules) plus the
 * declared ones, with extensions composed onto their base models once, at load.
 */
export const registeredModules: readonly ModuleDefinition[] = composeModules([core, ...declared]);
