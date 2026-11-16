import { contactsDefinition } from "@/app/(auth)/erp/contactos/definition";
import { usersDefinition } from "@/app/(auth)/erp/usuarios/definition";
import { accessDefinition } from "@/app/(auth)/erp/accesos/definition";
import { modulesDefinition } from "@/app/(auth)/erp/modulos/definition";

/** Same metadata consumed by the native manifests, without React/icon imports. */
export const coreApplicationDefinitions = [contactsDefinition, usersDefinition, accessDefinition, modulesDefinition];
