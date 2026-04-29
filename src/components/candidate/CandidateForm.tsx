import { useEffect, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RoleSelect } from "@/components/shared/RoleDepartmentSelect";
import { RecruiterSelect } from "@/components/shared/RecruiterSelect";
import { useStages } from "@/hooks/useStages";
import {
  formatPhone,
  formatCurrency,
  parseCurrencyInput,
  isoToDatetimeLocal,
  validateOfferToStartGap,
  validateOccHealthFreshness,
} from "@/lib/format";
import type {
  Candidate,
  CandidateInput,
  PositionType,
  OccHealthStatus,
  EmployeeType,
  Shift,
  ContactMethod,
  Bit,
} from "@/lib/types";

const POSITION_TYPES: { value: PositionType; label: string }[] = [
  { value: "FT", label: "Full-time" },
  { value: "PT", label: "Part-time" },
  { value: "PRN", label: "PRN (as-needed)" },
  { value: "CONTRACT", label: "Contract" },
  { value: "TEMP", label: "Temporary" },
];

const OCC_HEALTH_STATUSES: OccHealthStatus[] = [
  "Pending",
  "Scheduled",
  "Cleared",
  "Failed",
];

const EMPLOYEE_TYPES: EmployeeType[] = ["Rehire", "New Hire", "Transfer"];

const SHIFTS: Shift[] = ["First Shift", "Second Shift", "Third Shift"];

const CONTACT_METHODS: ContactMethod[] = ["Phone", "Email"];

const NONE = "__none__";

interface CandidateFormProps {
  initial?: Candidate | null;
  onSubmit: (input: CandidateInput) => Promise<void> | void;
  onCancel: () => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function CandidateForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
  submitLabel = "Save",
}: CandidateFormProps) {
  const stagesQuery = useStages();

  // ---- Field state. Group declarations match section grouping below.
  const [firstName, setFirstName] = useState(initial?.first_name ?? "");
  const [lastName, setLastName] = useState(initial?.last_name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");

  const [roleId, setRoleId] = useState<number | null>(initial?.role_id ?? null);
  const [positionType, setPositionType] = useState<PositionType | null>(
    initial?.position_type ?? "FT"
  );
  const [employeeType, setEmployeeType] = useState<EmployeeType | null>(
    initial?.employee_type ?? null
  );
  const [shift, setShift] = useState<Shift | null>(initial?.shift ?? null);
  const [stageId, setStageId] = useState<number | null>(
    initial?.current_stage_id ?? null
  );

  const [positionNumber, setPositionNumber] = useState(
    initial?.position_number ?? ""
  );
  const [reqNumber, setReqNumber] = useState(initial?.req_number ?? "");
  const [locationCode, setLocationCode] = useState(initial?.location_code ?? "");
  const [teamIdNumber, setTeamIdNumber] = useState(initial?.team_id_number ?? "");

  const [offerSignedDate, setOfferSignedDate] = useState(
    initial?.offer_letter_signed_date ?? ""
  );
  const [targetStartDate, setTargetStartDate] = useState(
    initial?.target_start_date ?? ""
  );
  const [keyedDate, setKeyedDate] = useState(
    isoToDatetimeLocal(initial?.keyed_date)
  );

  const [occHealthStatus, setOccHealthStatus] = useState<OccHealthStatus | null>(
    initial?.occ_health_status ?? null
  );
  const [occHealthAppt, setOccHealthAppt] = useState(
    isoToDatetimeLocal(initial?.occ_health_appt)
  );

  const [recruiterId, setRecruiterId] = useState<number | null>(
    initial?.recruiter_id ?? null
  );

  const [compensationInput, setCompensationInput] = useState(
    initial?.compensation_amount != null
      ? formatCurrency(initial.compensation_amount)
      : ""
  );
  const [amountApproved, setAmountApproved] = useState<Bit>(
    initial?.amount_approved ?? 0
  );
  const [compensationApprovalReceived, setCompensationApprovalReceived] =
    useState<Bit | null>(initial?.compensation_approval_received ?? null);

  const [managerName, setManagerName] = useState(initial?.manager_name ?? "");
  const [managerEmail, setManagerEmail] = useState(initial?.manager_email ?? "");

  const [lastContactDate, setLastContactDate] = useState(
    isoToDatetimeLocal(initial?.last_contact_date)
  );
  const [lastContactMethod, setLastContactMethod] = useState<ContactMethod | null>(
    initial?.last_contact_method ?? null
  );

  const [offerLetterReviewed, setOfferLetterReviewed] = useState<Bit>(
    initial?.offer_letter_reviewed ?? 0
  );
  const [peoplesoftEducationUploaded, setPeoplesoftEducationUploaded] =
    useState<Bit>(initial?.peoplesoft_education_uploaded ?? 0);
  const [sharepointFolderCompleted, setSharepointFolderCompleted] = useState<Bit>(
    initial?.sharepoint_folder_completed ?? 0
  );
  const [onboardingSpecialist, setOnboardingSpecialist] = useState(
    initial?.onboarding_specialist ?? ""
  );

  // Auto-pick first non-terminal stage on initial create
  useEffect(() => {
    if (!initial && stageId == null && stagesQuery.data?.length) {
      const first =
        stagesQuery.data.find((s) => !s.is_terminal) ?? stagesQuery.data[0];
      setStageId(first.id);
    }
  }, [initial, stageId, stagesQuery.data]);

  // ---- Validation indicators
  const offerToStart = validateOfferToStartGap(offerSignedDate, targetStartDate);
  const occHealth = validateOccHealthFreshness(occHealthAppt);

  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    stageId != null &&
    !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || stageId == null) return;
    await onSubmit({
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      phone: phone || null,
      role_id: roleId,
      position_type: positionType,
      current_stage_id: stageId,
      offer_letter_signed_date: offerSignedDate || null,
      target_start_date: targetStartDate || null,
      recruiter_id: recruiterId,

      occ_health_status: occHealthStatus,
      occ_health_appt: occHealthAppt || null,
      employee_type: employeeType,
      keyed_date: keyedDate || null,
      position_number: positionNumber || null,
      req_number: reqNumber || null,
      location_code: locationCode || null,
      team_id_number: teamIdNumber || null,
      shift,
      compensation_amount: parseCurrencyInput(compensationInput),
      amount_approved: amountApproved,
      // Only meaningful when amount_approved = 0; clear otherwise.
      compensation_approval_received:
        amountApproved === 0 ? compensationApprovalReceived : null,
      manager_name: managerName || null,
      manager_email: managerEmail || null,
      last_contact_date: lastContactDate || null,
      last_contact_method: lastContactMethod,
      offer_letter_reviewed: offerLetterReviewed,
      peoplesoft_education_uploaded: peoplesoftEducationUploaded,
      sharepoint_folder_completed: sharepointFolderCompleted,
      onboarding_specialist: onboardingSpecialist || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ───── Identity ───── */}
      <Section title="Identity">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">
              First name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">
              Last name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email ?? ""}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone ?? ""}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="555-123-4567"
              maxLength={12}
            />
          </div>
        </div>
      </Section>

      {/* ───── Role & Position ───── */}
      <Section title="Role & position">
        <div className="space-y-1.5">
          <Label>Role</Label>
          <RoleSelect value={roleId} onChange={setRoleId} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Position type</Label>
            <NullableSelect
              value={positionType}
              onChange={(v) => setPositionType(v as PositionType | null)}
              options={POSITION_TYPES.map((p) => ({
                value: p.value,
                label: p.label,
              }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Employee type</Label>
            <NullableSelect
              value={employeeType}
              onChange={(v) => setEmployeeType(v as EmployeeType | null)}
              options={EMPLOYEE_TYPES.map((t) => ({ value: t, label: t }))}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Shift</Label>
            <NullableSelect
              value={shift}
              onChange={(v) => setShift(v as Shift | null)}
              options={SHIFTS.map((s) => ({ value: s, label: s }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Stage <span className="text-destructive">*</span>
            </Label>
            <Select
              value={stageId == null ? "" : String(stageId)}
              onValueChange={(v) => setStageId(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {stagesQuery.data?.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      {s.name}
                      {s.is_terminal ? (
                        <span className="text-xs text-muted-foreground">
                          (terminal)
                        </span>
                      ) : null}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      {/* ───── HR References ───── */}
      <Section title="HR references">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Position number</Label>
            <Input
              value={positionNumber}
              onChange={(e) => setPositionNumber(e.target.value)}
              placeholder="e.g. POS-12345"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Req number</Label>
            <Input
              value={reqNumber}
              onChange={(e) => setReqNumber(e.target.value)}
              placeholder="e.g. REQ-67890"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Location code</Label>
            <Input
              value={locationCode}
              onChange={(e) => setLocationCode(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Team ID number</Label>
            <Input
              value={teamIdNumber}
              onChange={(e) => setTeamIdNumber(e.target.value)}
            />
          </div>
        </div>
      </Section>

      {/* ───── Dates ───── */}
      <Section title="Key dates">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Offer letter signed date</Label>
            <Input
              type="date"
              value={offerSignedDate ?? ""}
              onChange={(e) => setOfferSignedDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Target start date</Label>
            <Input
              type="date"
              value={targetStartDate ?? ""}
              onChange={(e) => setTargetStartDate(e.target.value)}
            />
          </div>
        </div>
        {offerToStart && offerToStart.ok === false ? (
          <Warning>
            Only {offerToStart.days} day{offerToStart.days === 1 ? "" : "s"}{" "}
            between offer signed and target start — usually 14+ days are needed
            to complete onboarding.
          </Warning>
        ) : null}

        <div className="space-y-1.5">
          <Label>Keyed date &amp; time</Label>
          <Input
            type="datetime-local"
            value={keyedDate ?? ""}
            onChange={(e) => setKeyedDate(e.target.value)}
          />
        </div>
      </Section>

      {/* ───── Occupational Health ───── */}
      <Section title="Occupational health">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <NullableSelect
              value={occHealthStatus}
              onChange={(v) => setOccHealthStatus(v as OccHealthStatus | null)}
              options={OCC_HEALTH_STATUSES.map((s) => ({ value: s, label: s }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Appointment date &amp; time</Label>
            <Input
              type="datetime-local"
              value={occHealthAppt ?? ""}
              onChange={(e) => setOccHealthAppt(e.target.value)}
            />
          </div>
        </div>
        {occHealth && occHealth.ok === false ? (
          <Warning>
            Occupational health appointment was {occHealth.days} days ago —
            results expire after 30 days.
          </Warning>
        ) : null}
      </Section>

      {/* ───── Recruiter ───── */}
      <Section title="Recruiter">
        <RecruiterSelect value={recruiterId} onChange={setRecruiterId} />
      </Section>

      {/* ───── Compensation ───── */}
      <Section title="Compensation">
        <div className="space-y-1.5">
          <Label>Amount</Label>
          <Input
            inputMode="decimal"
            value={compensationInput}
            onChange={(e) => setCompensationInput(e.target.value)}
            onBlur={() => {
              const n = parseCurrencyInput(compensationInput);
              setCompensationInput(n != null ? formatCurrency(n) : "");
            }}
            placeholder="$50,000"
          />
        </div>
        <div className="space-y-2">
          <BoolToggle
            label="Amount approved"
            value={amountApproved}
            onChange={(v) => {
              setAmountApproved(v);
              if (v === 1) setCompensationApprovalReceived(null);
            }}
          />
          {amountApproved === 0 ? (
            <div className="ml-6 space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Compensation approval received?
              </Label>
              <BoolToggle
                value={compensationApprovalReceived ?? null}
                onChange={setCompensationApprovalReceived}
                allowNull
                yesLabel="Received"
                noLabel="Not yet"
              />
            </div>
          ) : null}
        </div>
      </Section>

      {/* ───── Manager ───── */}
      <Section title="Manager">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={managerEmail}
              onChange={(e) => setManagerEmail(e.target.value)}
            />
          </div>
        </div>
      </Section>

      {/* ───── Last contact ───── */}
      <Section title="Last contact">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Date &amp; time</Label>
            <Input
              type="datetime-local"
              value={lastContactDate ?? ""}
              onChange={(e) => setLastContactDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Method</Label>
            <NullableSelect
              value={lastContactMethod}
              onChange={(v) => setLastContactMethod(v as ContactMethod | null)}
              options={CONTACT_METHODS.map((m) => ({ value: m, label: m }))}
            />
          </div>
        </div>
      </Section>

      {/* ───── Onboarding status ───── */}
      <Section title="Onboarding status">
        <BoolToggle
          label="Offer letter reviewed"
          value={offerLetterReviewed}
          onChange={setOfferLetterReviewed}
        />
        <BoolToggle
          label="PeopleSoft education uploaded"
          value={peoplesoftEducationUploaded}
          onChange={setPeoplesoftEducationUploaded}
        />
        <BoolToggle
          label="SharePoint folder completed"
          value={sharepointFolderCompleted}
          onChange={setSharepointFolderCompleted}
        />
        <div className="space-y-1.5">
          <Label>Onboarding specialist</Label>
          <Input
            value={onboardingSpecialist}
            onChange={(e) => setOnboardingSpecialist(e.target.value)}
            placeholder="Specialist name"
          />
        </div>
      </Section>

      {/* ───── Actions ───── */}
      <div className="sticky bottom-0 -mx-6 flex justify-end gap-2 border-t border-border bg-background px-6 py-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}

// ============================================================
// Bits & pieces
// ============================================================

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 border-b border-border pb-5 last:border-b-0 last:pb-0">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

interface NullableSelectProps {
  value: string | null;
  onChange: (v: string | null) => void;
  options: { value: string; label: string }[];
  noneLabel?: string;
}

function NullableSelect({
  value,
  onChange,
  options,
  noneLabel = "— None —",
}: NullableSelectProps) {
  return (
    <Select
      value={value == null ? NONE : value}
      onValueChange={(v) => onChange(v === NONE ? null : v)}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{noneLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface BoolToggleProps {
  label?: string;
  value: Bit | null;
  onChange: (v: Bit) => void;
  /** When true, allows the value to remain null (no selection). */
  allowNull?: boolean;
  yesLabel?: string;
  noLabel?: string;
}

/**
 * Yes/No two-button toggle. Renders as a labelled row when `label` is given,
 * or just the buttons when used as a sub-control.
 */
function BoolToggle({
  label,
  value,
  onChange,
  allowNull = false,
  yesLabel = "Yes",
  noLabel = "No",
}: BoolToggleProps) {
  const buttons = (
    <div className="flex gap-1">
      <ToggleButton
        active={value === 1}
        onClick={() => onChange(1)}
        label={yesLabel}
      />
      <ToggleButton
        active={value === 0}
        onClick={() => onChange(0)}
        label={noLabel}
      />
    </div>
  );

  // ToggleButton type is loose; allowNull is just a marker for the parent.
  void allowNull;

  if (!label) return buttons;
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card/40 px-3 py-2">
      <Label className="text-sm font-normal">{label}</Label>
      {buttons}
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-md border border-primary bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
          : "rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent"
      }
    >
      {label}
    </button>
  );
}
