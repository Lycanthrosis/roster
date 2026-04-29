import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "@/components/search/CommandPalette";
import { KeyboardShortcutsHelp } from "@/components/help/KeyboardShortcutsHelp";
import { Toaster } from "@/components/ui/toaster";

export function AppShell() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <CommandPalette />
      <KeyboardShortcutsHelp />
      <Toaster />
    </div>
  );
}
