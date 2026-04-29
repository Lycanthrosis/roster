import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useToastStore } from "@/stores/toast-store";

export function Toaster() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <ToastProvider swipeDirection="right">
      {items.map((t) => (
        <Toast
          key={t.id}
          variant={t.variant}
          duration={t.durationMs ?? 4000}
          onOpenChange={(open) => {
            if (!open) dismiss(t.id);
          }}
        >
          <div className="min-w-0 flex-1">
            <ToastTitle>{t.title}</ToastTitle>
            {t.description ? (
              <ToastDescription>{t.description}</ToastDescription>
            ) : null}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
