import { KeyRound } from "lucide-react";
import { defineApplication } from "@/lib/applications/manifest";
import { accessDefinition } from "./definition";

export const accessManifest = defineApplication({ ...accessDefinition, icon: KeyRound });
