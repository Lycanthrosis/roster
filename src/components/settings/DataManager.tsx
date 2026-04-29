import { useEffect, useState } from "react";
import {
  Download,
  Upload,
  FolderOpen,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { exit, relaunch } from "@tauri-apps/plugin-process";
import {
  createBackup,
  restoreBackup,
  getDataDirectory,
  getDbFilePath,
  type BackupResult,
  type RestoreResult,
} from "@/lib/backup";
import { formatBytes } from "@/lib/storage";

export function DataManager() {
  const [dataDir, setDataDir] = useState<string>("");
  const [dbPath, setDbPath] = useState<string>("");

  const [backing, setBacking] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [backupResult, setBackupResult] = useState<BackupResult | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);

  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setDataDir(await getDataDirectory());
        setDbPath(await getDbFilePath());
      } catch {
        // silent — purely informational
      }
    })();
  }, []);

  async function handleBackup() {
    setBackupError(null);
    setBackupResult(null);
    setBacking(true);
    try {
      const res = await createBackup();
      if (res) setBackupResult(res);
    } catch (e) {
      setBackupError(e instanceof Error ? e.message : String(e));
    } finally {
      setBacking(false);
    }
  }

  async function handleRestore() {
    setRestoreError(null);
    setRestoreResult(null);
    setRestoring(true);
    try {
      const res = await restoreBackup();
      if (res) setRestoreResult(res);
    } catch (e) {
      setRestoreError(e instanceof Error ? e.message : String(e));
    } finally {
      setRestoring(false);
      setRestoreConfirmOpen(false);
    }
  }

  async function handleRevealDataDir() {
    if (!dbPath) return;
    try {
      await revealItemInDir(dbPath);
    } catch {
      // ignore — user-visible revel is a nicety
    }
  }

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Data
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Back up or restore your database and attachments.
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        {/* Backup */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Create a backup</h3>
              <p className="text-xs text-muted-foreground">
                Saves a zip with your database and all attachments.
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleBackup}
              disabled={backing || restoring}
            >
              {backing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Create backup
                </>
              )}
            </Button>
          </div>
          {backupResult ? (
            <div className="mt-2 flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2 text-xs">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-emerald-700 dark:text-emerald-400">
                  Backup saved
                </div>
                <div className="truncate text-muted-foreground" title={backupResult.path}>
                  {backupResult.path}
                </div>
                <div className="text-muted-foreground">
                  {formatBytes(backupResult.sizeBytes)} · {backupResult.fileCount}{" "}
                  file{backupResult.fileCount === 1 ? "" : "s"}
                </div>
              </div>
            </div>
          ) : null}
          {backupError ? (
            <div className="mt-2 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
              <div className="text-destructive">{backupError}</div>
            </div>
          ) : null}
        </section>

        <div className="border-t border-border" />

        {/* Restore */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Restore from backup</h3>
              <p className="text-xs text-muted-foreground">
                Replaces your current data. The app must restart afterward.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRestoreConfirmOpen(true)}
              disabled={backing || restoring}
            >
              <Upload className="h-4 w-4" />
              Restore…
            </Button>
          </div>

          {restoreResult ? (
            <RestoreSuccessBanner result={restoreResult} />
          ) : null}
          {restoreError ? (
            <div className="mt-2 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
              <div className="text-destructive">{restoreError}</div>
            </div>
          ) : null}
        </section>

        <div className="border-t border-border" />

        {/* Data location */}
        <section>
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h3 className="text-sm font-medium">Data location</h3>
              <div
                className="mt-0.5 truncate font-mono text-xs text-muted-foreground"
                title={dataDir}
              >
                {dataDir || "Loading…"}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRevealDataDir}
              disabled={!dbPath}
            >
              <FolderOpen className="h-4 w-4" /> Reveal
            </Button>
          </div>
        </section>
      </div>

      {/* Restore confirmation */}
      <Dialog open={restoreConfirmOpen} onOpenChange={setRestoreConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Restore from backup?</DialogTitle>
            <DialogDescription>
              Your current data will be preserved under a renamed copy before
              the backup is unpacked. You can recover it manually from the data
              folder if needed.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="text-amber-800 dark:text-amber-300">
              After restore, the app will need to restart so SQLite reopens the
              new database file. You'll be prompted.
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRestoreConfirmOpen(false)}
              disabled={restoring}
            >
              Cancel
            </Button>
            <Button onClick={handleRestore} disabled={restoring}>
              {restoring ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Restoring…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> Choose backup file…
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RestoreSuccessBanner({ result }: { result: RestoreResult }) {
  const [working, setWorking] = useState<null | "relaunch" | "quit">(null);

  async function handleRelaunch() {
    setWorking("relaunch");
    try {
      await relaunch();
    } catch {
      setWorking(null);
    }
  }

  async function handleQuit() {
    setWorking("quit");
    try {
      await exit(0);
    } catch {
      setWorking(null);
    }
  }

  return (
    <div className="mt-2 space-y-2 rounded-md border-2 border-amber-500/50 bg-amber-500/10 p-3 text-xs">
      <div className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div className="min-w-0 flex-1">
          <div className="font-medium text-emerald-700 dark:text-emerald-400">
            Restore complete
          </div>
          <div className="text-muted-foreground">
            Database replaced · {result.restoredAttachmentCount} attachment
            {result.restoredAttachmentCount === 1 ? "" : "s"} restored
          </div>
          <div className="mt-1 text-muted-foreground">
            Your previous data was preserved with the suffix{" "}
            <code className="rounded bg-muted px-1 font-mono">
              {result.preservedBackupName}
            </code>
          </div>
        </div>
      </div>
      <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <div className="font-semibold text-amber-800 dark:text-amber-300">
              Restart required to load the new database
            </div>
            <div className="mt-0.5 text-amber-800/80 dark:text-amber-300/80">
              The database is closed. Don't navigate away — other pages will
              show errors until you relaunch.
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleQuit}
            disabled={working !== null}
          >
            {working === "quit" ? "Closing…" : "Quit instead"}
          </Button>
          <Button size="sm" onClick={handleRelaunch} disabled={working !== null}>
            {working === "relaunch" ? "Restarting…" : "Restart now"}
          </Button>
        </div>
      </div>
    </div>
  );
}
