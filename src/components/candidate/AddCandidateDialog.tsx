import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CandidateForm } from "./CandidateForm";
import { useCreateCandidate } from "@/hooks/useCandidates";
import { useToast } from "@/stores/toast-store";

interface AddCandidateDialogProps {
  onCreated?: (candidateId: number) => void;
}

export function AddCandidateDialog({ onCreated }: AddCandidateDialogProps) {
  const [open, setOpen] = useState(false);
  const createCandidate = useCreateCandidate();
  const toast = useToast();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Add candidate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New candidate</DialogTitle>
          <DialogDescription>
            Add someone to your hiring pipeline. You can edit any of this later.
          </DialogDescription>
        </DialogHeader>
        <CandidateForm
          submitting={createCandidate.isPending}
          submitLabel="Create candidate"
          onCancel={() => setOpen(false)}
          onSubmit={async (input) => {
            try {
              const id = await createCandidate.mutateAsync(input);
              toast.success(
                `Added ${input.first_name} ${input.last_name}`,
                "Auto-attached any matching requirement template"
              );
              setOpen(false);
              onCreated?.(id);
            } catch (e) {
              toast.error(
                "Couldn't create candidate",
                e instanceof Error ? e.message : String(e)
              );
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
