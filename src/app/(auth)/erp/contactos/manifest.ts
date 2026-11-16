import { UsersRound } from "lucide-react";
import { defineApplication } from "@/lib/applications/manifest";
import { contactsDefinition } from "./definition";

export const contactsManifest = defineApplication({ ...contactsDefinition, icon: UsersRound });
