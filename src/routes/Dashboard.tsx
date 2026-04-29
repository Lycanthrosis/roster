import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { query } from "@/lib/db";
import { SQL_PIPELINE_COUNTS } from "@/lib/queries";
import { PageHeader } from "@/components/layout/PageHeader";
import { KanbanBoard } from "@/components/dashboard/KanbanBoard";
import { AddCandidateDialog } from "@/components/candidate/AddCandidateDialog";
import { Button } from "@/components/ui/button";

interface PipelineRow {
  stage_id: number;
  stage_name: string;
  stage_color: string;
  display_order: number;
  is_terminal: 0 | 1;
  count: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["pipeline-counts"],
    queryFn: () => query<PipelineRow>(SQL_PIPELINE_COUNTS),
  });

  const active = (data ?? []).filter((r) => !r.is_terminal);
  const terminal = (data ?? []).filter((r) => r.is_terminal);
  const totalActive = active.reduce((acc, r) => acc + r.count, 0);
  const totalAnywhere =
    totalActive + terminal.reduce((acc, r) => acc + r.count, 0);

  const totalHired =
    terminal.find((r) => r.stage_name.toLowerCase() === "hired")?.count ?? 0;

  const isEmpty = !isLoading && totalAnywhere === 0;

  const description = isLoading
    ? "Loading…"
    : isEmpty
      ? "Your hiring pipeline starts here."
      : `${totalActive} active · ${totalHired} hired${
          terminal.length > 0
            ? ` · ${terminal.reduce((a, r) => a + r.count, 0) - totalHired} closed`
            : ""
        }`;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Pipeline"
        description={description}
        actions={
          <AddCandidateDialog
            onCreated={(id) => navigate(`/candidates/${id}`)}
          />
        }
      />
      <div className="flex-1 overflow-hidden">
        {isEmpty ? <WelcomeState /> : <KanbanBoard />}
      </div>
    </div>
  );
}

function WelcomeState() {
  const navigate = useNavigate();

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold tracking-tight">
          Welcome to Roster
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Track candidates through every stage, manage credentialing and
          compliance, and keep a shared memory of every conversation.
        </p>

        <div className="mt-6 grid gap-2 text-left">
          <StepItem n={1} title="Add your first candidate">
            Click the Add candidate button above, or the one at the top of the
            Candidates page.
          </StepItem>
          <StepItem n={2} title="Set up a requirement template">
            In Settings, create a template (like "RN New Hire") with the
            compliance items that role needs. New candidates matching that role
            get them auto-attached.
          </StepItem>
          <StepItem n={3} title="Customize your stages">
            Rename, recolor, or add stages in Settings to match your process.
          </StepItem>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/settings")}>
            Open settings
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepItem({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-md border border-border bg-card/50 p-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {n}
      </div>
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}
