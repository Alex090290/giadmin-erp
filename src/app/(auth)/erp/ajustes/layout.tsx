import type { ReactNode } from "react";
import ApplicationLayout from "@/components/ui/ApplicationLayout";
import { settingsManifest } from "./manifest";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <ApplicationLayout applicationId={settingsManifest.id}>{children}</ApplicationLayout>;
}
