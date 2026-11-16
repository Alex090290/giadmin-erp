import { ShieldCheck } from "lucide-react";
import { defineApplication } from "@/lib/applications/manifest";
import { usersDefinition } from "./definition";

export const usersManifest = defineApplication({ ...usersDefinition, icon: ShieldCheck });
