import { LayoutGrid } from "lucide-react";
import { defineApplication } from "@/lib/applications/manifest";
import { modulesDefinition } from "./definition";

export const modulesManifest = defineApplication({ ...modulesDefinition, icon: LayoutGrid });
