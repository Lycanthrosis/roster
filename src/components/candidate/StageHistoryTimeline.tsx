import { useState } from "react";
import { ChevronDown, ChevronRight, ArrowRight, Sparkles } from "lucide-react";
import { cn, formatRelative } from "@/lib/utils";
import { useStageHistory } from "@/hooks/usePeekData";

interface StageHistoryTimelineProps {
  candidateId: number;
  defaultOpen?: boolean;
}

export function StageHistoryTimeline({
  candidateId,
  defaultOpen = false,
}: StageHistoryTimelineProps) {
  const [open, setOpen] = useState(defaultOpen);
  const { data, isLoading } = useStageHistory(candidateId);

  const count = data?.length ?? 0;

  return (
    <div className="rounded-lg border border-border bg-card/50">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent/40"
      >
        <span className="flex items-center gap-2 font-medium">
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          Stage history
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {isLoading ? "…" : count}
        </span>
      </button>

      {open ? (
        <div className="border-t border-border px-3 py-2">
          {isLoading ? (
            <div className="py-2 text-xs text-muted-foreground">Loading…</div>
          ) : count === 0 ? (
            <div className="py-2 text-xs italic text-muted-foreground">
              No history yet
            </div>
          ) : (
            <ul className="space-y-2">
              {data?.map((t, i) => {
                const isFirst = t.from_stage_id == null;
                const isLatest = i === 0;
                return (
                  <li key={t.id} className="flex gap-2">
                    <div
                      className={cn(
                        "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                        isLatest ? "bg-primary" : "bg-muted-foreground/40"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1 text-xs">
                        {isFirst ? (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Sparkles className="h-3 w-3" />
                            Created at
                          </span>
                        ) : (
                          <>
                            <StageDot color={t.from_color ?? "#94a3b8"} />
                            <span className="text-muted-foreground">
                              {t.from_name}
                            </span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
                          </>
                        )}
                        <StageDot color={t.to_color} />
                        <span className="font-medium">{t.to_name}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatRelative(t.transitioned_at)}
                        <span
                          className="ml-1"
                          title={new Date(t.transitioned_at).toLocaleString()}
                        >
                          · {new Date(t.transitioned_at).toLocaleDateString()}
                        </span>
                      </div>
                      {t.note ? (
                        <p className="mt-1 rounded-sm border-l-2 border-border/60 bg-muted/30 px-2 py-1 text-xs italic text-muted-foreground">
                          “{t.note}”
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function StageDot({ color }: { color: string }) {
  return (
    <span
      className="h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}
