import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Archive,
  ArchiveRestore,
  Pencil,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  AlertTriangle,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/PageHeader";
import { CandidateForm } from "@/components/candidate/CandidateForm";
import { RequirementChecklist } from "@/components/requirements/RequirementChecklist";
import { NotesPanel } from "@/components/notes/NotesPanel";
import { HiringUtilities } from "@/components/candidate/HiringUtilities";
import { StageHistoryTimeline } from "@/components/candidate/StageHistoryTimeline";
import { useToast } from "@/stores/toast-store";
import {
  useCandidate,
  useUpdateCandidate,
  useArchiveCandidate,
  useUnarchiveCandidate,
  useChangeStage,
  usePatchCandidateField,
} from "@/hooks/useCandidates";
import { useStages } from "@/hooks/useStages";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatDate, initials } from "@/lib/utils";
import {
  formatCurrency,
  formatDateTimeWithDayOfWeek,
  validateOfferToStartGap,
  validateOccHealthFreshness,
} from "@/lib/format";
import type { CandidateWithJoins } from "@/lib/types";

const POSITION_LABELS: Record<string, string> = {
  FT: "Full-time",
  PT: "Part-time",
  PRN: "PRN",
  CONTRACT: "Contract",
  TEMP: "Temporary",
};

export default function CandidateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const candidateId = id ? Number(id) : null;
  const candidateQuery = useCandidate(candidateId);
  const updateCandidate = useUpdateCandidate();
  const archive = useArchiveCandidate();
  const unarchive = useUnarchiveCandidate();
  const changeStage = useChangeStage();
  const stagesQuery = useStages();
  const [editOpen, setEditOpen] = useState(false);
  const toast = useToast();

  if (candidateQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const candidate = candidateQuery.data;
  if (!candidate) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Candidate not found.</p>
        <Button variant="outline" onClick={() => navigate("/candidates")}>
          Back to candidates
        </Button>
      </div>
    );
  }

  const isArchived = candidate.status === "archived";

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/candidates")}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
              {initials(candidate.first_name, candidate.last_name)}
            </div>
            <span>
              {candidate.first_name} {candidate.last_name}
            </span>
            {isArchived ? (
              <span className="rounded-sm bg-muted px-2 py-0.5 text-xs uppercase tracking-wider text-muted-foreground">
                Archived
              </span>
            ) : null}
          </div>
        }
        actions={
          <>
            <StagePicker candidate={candidate} />
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
            {isArchived ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  unarchive.mutate(candidate.id, {
                    onSuccess: () =>
                      toast.success(
                        `Restored ${candidate.first_name} ${candidate.last_name}`
                      ),
                  })
                }
              >
                <ArchiveRestore className="h-4 w-4" /> Unarchive
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("Archive this candidate? You can unarchive later.")) {
                    archive.mutate(candidate.id, {
                      onSuccess: () => {
                        toast.success(
                          `Archived ${candidate.first_name} ${candidate.last_name}`
                        );
                        navigate("/candidates");
                      },
                      onError: (e) =>
                        toast.error(
                          "Couldn't archive",
                          e instanceof Error ? e.message : String(e)
                        ),
                    });
                  }
                }}
              >
                <Archive className="h-4 w-4" /> Archive
              </Button>
            )}
          </>
        }
      />

      <div className="grid flex-1 grid-cols-[360px_1fr_380px] overflow-hidden">
        {/* LEFT: candidate info */}
        <aside className="overflow-y-auto border-r border-border bg-card/30 p-4 space-y-4">
          <CandidateInfoPanel candidate={candidate} />
        </aside>

        {/* CENTER: notes (top) + hiring utilities (bottom),
            each independently scrollable. flex-1 + min-h-0 lets them
            share vertical space without overflowing the section. */}
        <section className="flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden">
            <NotesPanel candidateId={candidate.id} />
          </div>
          <div className="flex-1 min-h-0 overflow-hidden border-t border-border bg-card/20">
            <HiringUtilities candidateId={candidate.id} />
          </div>
        </section>

        {/* RIGHT: requirements (top) + onboarding status (bottom),
            each independently scrollable. flex-1 + min-h-0 lets them
            share vertical space and scroll without overflowing the rail. */}
        <aside className="flex flex-col overflow-hidden border-l border-border bg-card/30">
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <RequirementChecklist candidateId={candidate.id} />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto border-t border-border p-4">
            <OnboardingStatusPanel candidate={candidate} />
          </div>
        </aside>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit candidate</DialogTitle>
            <DialogDescription>
              Update any field below. Stage changes are made from the header
              dropdown.
            </DialogDescription>
          </DialogHeader>
          <CandidateForm
            initial={candidate}
            submitting={updateCandidate.isPending}
            submitLabel="Save"
            onCancel={() => setEditOpen(false)}
            onSubmit={async (input) => {
              try {
                await updateCandidate.mutateAsync({ ...input, id: candidate.id });
                if (input.current_stage_id !== candidate.current_stage_id) {
                  await changeStage.mutateAsync({
                    candidateId: candidate.id,
                    fromStageId: candidate.current_stage_id,
                    toStageId: input.current_stage_id,
                    note: "Changed via edit form",
                  });
                }
                toast.success("Candidate updated");
                setEditOpen(false);
              } catch (e) {
                toast.error(
                  "Couldn't save",
                  e instanceof Error ? e.message : String(e)
                );
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );

  // The stage-picker dropdown lives inside the component so it has access
  // to the changeStage mutation + candidate.
  function StagePicker({ candidate }: { candidate: CandidateWithJoins }) {
    const stages = stagesQuery.data ?? [];
    const current = stages.find((s) => s.id === candidate.current_stage_id);
    return (
      <Select
        value={String(candidate.current_stage_id)}
        onValueChange={(v) => {
          const newId = Number(v);
          if (newId === candidate.current_stage_id) return;
          changeStage.mutate(
            {
              candidateId: candidate.id,
              fromStageId: candidate.current_stage_id,
              toStageId: newId,
            },
            {
              onSuccess: () => {
                const next = stages.find((s) => s.id === newId);
                toast.success(
                  `Moved ${candidate.first_name} ${candidate.last_name}`,
                  next ? `→ ${next.name}` : undefined
                );
              },
              onError: (e) =>
                toast.error(
                  "Couldn't move",
                  e instanceof Error ? e.message : String(e)
                ),
            }
          );
        }}
      >
        <SelectTrigger className="h-8 w-[180px]">
          <SelectValue>
            {current ? (
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: current.color }}
                />
                <span className="truncate">{current.name}</span>
              </span>
            ) : (
              "—"
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {stages.map((s) => (
            <SelectItem key={s.id} value={String(s.id)}>
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                {s.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
}

// ============================================================
// Left rail
// ============================================================

function CandidateInfoPanel({ candidate }: { candidate: CandidateWithJoins }) {
  // Validation
  const offerVsStart = validateOfferToStartGap(
    candidate.offer_letter_signed_date,
    candidate.target_start_date
  );
  const occHealthFresh = validateOccHealthFreshness(candidate.occ_health_appt);

  return (
    <>
      {/* Contact */}
      <Card title="Contact">
        <InfoRow
          icon={<Mail className="h-3.5 w-3.5" />}
          label="Email"
          value={candidate.email}
          mailto
        />
        <InfoRow
          icon={<Phone className="h-3.5 w-3.5" />}
          label="Phone"
          value={candidate.phone}
        />
      </Card>

      {/* Role & position */}
      <Card title="Role &amp; position">
        <InfoRow
          icon={<Briefcase className="h-3.5 w-3.5" />}
          label="Role"
          value={candidate.role_title}
        />
        <InfoRow
          label="Position type"
          value={
            candidate.position_type
              ? POSITION_LABELS[candidate.position_type]
              : null
          }
        />
        <InfoRow label="Employee type" value={candidate.employee_type} />
        <InfoRow label="Shift" value={candidate.shift} />
      </Card>

      {/* HR references */}
      <Card title="HR references">
        <InfoRow label="Position number" value={candidate.position_number} mono />
        <InfoRow label="Req number" value={candidate.req_number} mono />
        <InfoRow label="Location code" value={candidate.location_code} mono />
        <InfoRow label="Team ID" value={candidate.team_id_number} mono />
      </Card>

      {/* Key dates */}
      <Card title="Key dates">
        <InfoRow
          icon={<Calendar className="h-3.5 w-3.5" />}
          label="Offer letter signed"
          value={formatDate(candidate.offer_letter_signed_date)}
          rawValue={candidate.offer_letter_signed_date}
        />
        <InfoRow
          label="Target start"
          value={formatDate(candidate.target_start_date)}
          rawValue={candidate.target_start_date}
        />
        {offerVsStart && offerVsStart.ok === false ? (
          <Warning>
            Only {offerVsStart.days} day{offerVsStart.days === 1 ? "" : "s"}{" "}
            between offer signed and start. 14+ days are usually needed.
          </Warning>
        ) : null}
        <InfoRow
          label="Keyed"
          value={
            candidate.keyed_date
              ? formatDateTimeWithDayOfWeek(candidate.keyed_date)
              : null
          }
          rawValue={candidate.keyed_date}
        />
      </Card>

      {/* Occupational health */}
      <Card title="Occupational health">
        <InfoRow label="Status" value={candidate.occ_health_status} />
        <InfoRow
          label="Appointment"
          value={
            candidate.occ_health_appt
              ? formatDateTimeWithDayOfWeek(candidate.occ_health_appt)
              : null
          }
          rawValue={candidate.occ_health_appt}
        />
        {occHealthFresh && occHealthFresh.ok === false ? (
          <Warning>
            Appointment was {occHealthFresh.days} days ago — results expire
            after 30 days.
          </Warning>
        ) : null}
      </Card>

      {/* Recruiter */}
      <Card title="Recruiter">
        <InfoRow label="Name" value={candidate.recruiter_name} />
        <InfoRow
          icon={<Phone className="h-3.5 w-3.5" />}
          label="Phone"
          value={candidate.recruiter_phone}
        />
        <InfoRow
          icon={<Mail className="h-3.5 w-3.5" />}
          label="Email"
          value={candidate.recruiter_email}
          mailto
        />
      </Card>

      {/* Compensation */}
      <Card title="Compensation">
        <InfoRow
          label="Amount"
          value={
            candidate.compensation_amount != null
              ? formatCurrency(candidate.compensation_amount)
              : null
          }
        />
        <InfoRow
          label="Amount approved"
          value={candidate.amount_approved === 1 ? "Yes" : "No"}
        />
        {candidate.amount_approved === 0 ? (
          <InfoRow
            label="Approval received"
            value={
              candidate.compensation_approval_received == null
                ? "Not yet"
                : candidate.compensation_approval_received === 1
                  ? "Yes"
                  : "No"
            }
          />
        ) : null}
      </Card>

      {/* Manager */}
      <Card title="Manager">
        <InfoRow label="Name" value={candidate.manager_name} />
        <InfoRow
          icon={<Mail className="h-3.5 w-3.5" />}
          label="Email"
          value={candidate.manager_email}
          mailto
        />
      </Card>

      {/* Last contact */}
      <Card title="Last contact">
        <InfoRow
          label="Date"
          value={
            candidate.last_contact_date
              ? formatDateTimeWithDayOfWeek(candidate.last_contact_date)
              : null
          }
          rawValue={candidate.last_contact_date}
        />
        <InfoRow label="Method" value={candidate.last_contact_method} />
      </Card>

      {/* Stage history */}
      <StageHistoryTimeline candidateId={candidate.id} />
    </>
  );
}

// ============================================================
// Onboarding status panel (lower right rail)
// ============================================================

function OnboardingStatusPanel({ candidate }: { candidate: CandidateWithJoins }) {
  const patch = usePatchCandidateField();
  const toast = useToast();

  // Local state for the specialist text field — only persists on blur
  // so we don't fire a write per keystroke.
  const [specialistDraft, setSpecialistDraft] = useState(
    candidate.onboarding_specialist ?? ""
  );

  function patchBool(
    field:
      | "offer_letter_reviewed"
      | "peoplesoft_education_uploaded"
      | "sharepoint_folder_completed",
    next: 0 | 1
  ) {
    patch.mutate(
      { id: candidate.id, field, value: next },
      {
        onError: (e) =>
          toast.error(
            "Couldn't save",
            e instanceof Error ? e.message : String(e)
          ),
      }
    );
  }

  function commitSpecialist() {
    const next = specialistDraft.trim() || null;
    if (next === (candidate.onboarding_specialist ?? null)) return;
    patch.mutate(
      { id: candidate.id, field: "onboarding_specialist", value: next },
      {
        onError: (e) =>
          toast.error(
            "Couldn't save",
            e instanceof Error ? e.message : String(e)
          ),
      }
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Onboarding status</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Click a checkbox to toggle. Changes save instantly.
        </p>
      </div>

      <div className="space-y-1.5">
        <CheckboxRow
          label="Offer letter reviewed"
          checked={candidate.offer_letter_reviewed === 1}
          onToggle={() =>
            patchBool(
              "offer_letter_reviewed",
              candidate.offer_letter_reviewed === 1 ? 0 : 1
            )
          }
        />
        <CheckboxRow
          label="PeopleSoft education uploaded"
          checked={candidate.peoplesoft_education_uploaded === 1}
          onToggle={() =>
            patchBool(
              "peoplesoft_education_uploaded",
              candidate.peoplesoft_education_uploaded === 1 ? 0 : 1
            )
          }
        />
        <CheckboxRow
          label="SharePoint folder completed"
          checked={candidate.sharepoint_folder_completed === 1}
          onToggle={() =>
            patchBool(
              "sharepoint_folder_completed",
              candidate.sharepoint_folder_completed === 1 ? 0 : 1
            )
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Onboarding specialist
        </Label>
        <Input
          value={specialistDraft}
          onChange={(e) => setSpecialistDraft(e.target.value)}
          onBlur={commitSpecialist}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.currentTarget as HTMLInputElement).blur();
            }
            if (e.key === "Escape") {
              setSpecialistDraft(candidate.onboarding_specialist ?? "");
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          placeholder="Specialist name"
          className="h-8"
        />
        <p className="text-[10px] text-muted-foreground">
          Saves on blur · Enter to confirm · Esc to revert
        </p>
      </div>
    </div>
  );
}

function CheckboxRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors",
        checked
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
          : "border-border bg-card hover:bg-accent/40"
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
          checked
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-border bg-background"
        )}
      >
        {checked ? <Check className="h-3 w-3" /> : null}
      </span>
      <span className="flex-1">{label}</span>
    </button>
  );
}

// ============================================================
// Info card primitives
// ============================================================

function Card({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/50">
      <div className="border-b border-border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="divide-y divide-border/60">{children}</div>
    </div>
  );
}

interface InfoRowProps {
  icon?: React.ReactNode;
  label: string;
  /** What gets displayed (already formatted). */
  value: string | null | undefined;
  /** What gets copied (defaults to value). */
  rawValue?: string | null;
  mono?: boolean;
  /** When true, render the value as a mailto link. */
  mailto?: boolean;
}

function InfoRow({ icon, label, value, rawValue, mono, mailto }: InfoRowProps) {
  const display = value && value.trim() !== "" ? value : null;
  const copyTarget = (rawValue ?? value ?? "").toString();

  return (
    <div
      className="group grid items-center gap-2 px-3 py-1.5 text-xs"
      style={{ gridTemplateColumns: "14px 110px 1fr 20px" }}
    >
      {/* Icon column — always reserved so labels align across rows */}
      <span className="text-muted-foreground">
        {icon ?? null}
      </span>
      <span className="text-muted-foreground">{label}</span>
      <div className="min-w-0">
        {display == null ? (
          <span className="text-muted-foreground/60">—</span>
        ) : mailto && display.includes("@") ? (
          <a
            href={`mailto:${display}`}
            className={cn(
              "block truncate text-foreground hover:text-primary hover:underline",
              mono && "font-mono"
            )}
            title={display}
          >
            {display}
          </a>
        ) : (
          <span
            className={cn("block truncate text-foreground", mono && "font-mono")}
            title={display}
          >
            {display}
          </span>
        )}
      </div>
      {/* Copy column — always reserved so values stop at the same x */}
      <div className="flex justify-end">
        {display != null ? <CopyButton value={copyTarget} /> : null}
      </div>
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-3 mb-2 mt-1 flex items-start gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-800 dark:text-amber-300">
      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard write can fail — silent
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? "Copied!" : "Copy"}
      aria-label={copied ? "Copied" : "Copy"}
      className={cn(
        "shrink-0 rounded p-1 text-muted-foreground transition-all",
        copied
          ? "text-emerald-600 dark:text-emerald-400 opacity-100"
          : "opacity-0 hover:bg-accent hover:text-foreground group-hover:opacity-100"
      )}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}
