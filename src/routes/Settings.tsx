import { PageHeader } from "@/components/layout/PageHeader";
import { StageManager } from "@/components/settings/StageManager";
import { RequirementTypeManager } from "@/components/settings/RequirementTypeManager";
import { TemplateManager } from "@/components/settings/TemplateManager";
import { RoleManager } from "@/components/settings/RoleManager";
import { RecruiterManager } from "@/components/settings/RecruiterManager";
import { DataManager } from "@/components/settings/DataManager";

export default function Settings() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Settings"
        description="Configure stages, roles, recruiters, requirements, templates, and manage your data"
      />
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-10">
          <StageManager />
          <RoleManager />
          <RecruiterManager />
          <TemplateManager />
          <RequirementTypeManager />
          <DataManager />
        </div>
      </div>
    </div>
  );
}
