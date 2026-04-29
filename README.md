# Roster

A local-first desktop app for tracking a healthcare HR hiring pipeline. Built with Tauri + React + SQLite.

All data stays on your machine. No cloud sync, no telemetry, no accounts.

<img width="1918" height="1030" alt="Screenshot 2026-04-29 152914" src="https://github.com/user-attachments/assets/bf7734c8-20b0-4f86-8f35-6e6e1abe0290" />
<img width="1919" height="1030" alt="Screenshot 2026-04-29 152929" src="https://github.com/user-attachments/assets/616621db-043c-4e19-9059-dda788767bea" />
<img width="1917" height="1029" alt="Screenshot 2026-04-29 153110" src="https://github.com/user-attachments/assets/8f6f354d-0b82-4d5b-baa6-e0dee1a686d8" />


## What it does

- **Candidate records** — every field a healthcare HR coordinator typically tracks: name, contact, role, position type, employee type (Rehire/New Hire/Transfer), shift, position number, req number, location code, team ID, offer letter signed date, target start date, keyed date, occupational health status and appointment, recruiter info, compensation, manager info, last contact, onboarding specialist, and several onboarding-status flags
- **Stage workflow** — configurable stages (default set: Welcome Call Needed → Onboarding Tasks Needed → Pending → Keyed → Late Keyed → Pushed → Not Starting). Every stage move is logged with a timestamp.
- **Requirements checklist** — per-candidate, with statuses Not complete / In progress / Complete / Substituted / Waived. Inline "Add new requirement type" lets you create new requirement categories without leaving the candidate page.
- **Requirement templates** — when you add a candidate with a known role, the matching template auto-attaches its checklist (e.g. "RN" → I-9, license, BLS, ACLS, TB, immunizations).
- **Recruiters as a first-class table** — name, phone, email; reused across candidates rather than retyped.
- **Notes** — rich-text editor (bold, italics, headings, bullets, ordered lists, checkboxes, blockquote, code), pinning, edit-in-place with explicit Save / Cancel, Ctrl+Enter to save, Ctrl+N to start a new note from anywhere on the candidate page.
- **Length of Employment calculator** — under "Hiring utilities" on each candidate page. Add multiple positions with start/end dates, see day-precise durations and a running total. One click saves a formatted breakdown to the candidate's notes feed.
- **Date validation** — flags offer-letter-signed dates that are fewer than 14 days before target start, and occ-health appointments older than 30 days.
- **Inline copy buttons** — every field in the candidate's left rail has a hover copy-to-clipboard button.
- **Onboarding status panel** — toggleable checkboxes (Offer letter reviewed, PeopleSoft education uploaded, SharePoint folder completed) plus an inline Onboarding Specialist field, all saved instantly.
- **Filters + sorting** — by stage, role, recruiter, position type, offer-signed date range, and free-text search. Sortable columns: name, role, stage, offer signed, keyed date, occ health appointment, open requirements.
- **Global search (Ctrl+K)** — searches candidate names and the full text of every note (FTS5).
- **Reports** — pipeline snapshot, candidates keyed per month, top recruiters, requirements by category, time-in-stage, expiring requirements (next 30 days).
- **Backup + restore** — zip the entire database to any folder, restore with one click. Lives in **Settings → Data**.
- **Theme** — light / dark / follow-system.

## Installing (end users)

1. Download the latest `Roster_<version>_x64_en-US.msi` from the [Releases page](../../releases).
2. Double-click to install.
3. **Windows SmartScreen may show a warning** ("Windows protected your PC") because the installer isn't signed with a code-signing certificate. Click **More info** → **Run anyway**. This is expected for unsigned tools distributed outside the Microsoft Store.

### System requirements

- Windows 10 version 1803+ or Windows 11
- ~200 MB disk space
- [WebView2 runtime](https://developer.microsoft.com/microsoft-edge/webview2/) (pre-installed on Windows 11 and recent Windows 10)

### Where your data lives

Roster stores everything under your local app data folder:

```
%APPDATA%\com.hiringtracker.app\
└── hiring_tracker.db        # SQLite database (with -wal and -shm sidecars)
```

You can back this folder up directly, or use **Settings → Data → Create backup** which writes a single zip file to a folder of your choosing. **Settings → Data → Restore** reads one of those zips back.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl+K` | Open global search |
| `Ctrl+N` | Start a new note (on a candidate page) |
| `Ctrl+Enter` | Save the note you're editing |
| `Esc` | Cancel note edit |
| `?` | Open the keyboard-shortcut help dialog |

## Building from source (developers)

### Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **Rust (stable)** — [rustup.rs](https://rustup.rs)
- **Microsoft C++ Build Tools** — [visualstudio.microsoft.com/visual-cpp-build-tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (select the "Desktop development with C++" workload during install)
- **WebView2 runtime** — see link above; likely already installed

Or via winget:

```powershell
winget install OpenJS.NodeJS.LTS
winget install Rustlang.Rustup
winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

Close and reopen your terminal after installing so PATH updates take effect.

### Clone and run

```powershell
git clone https://github.com/<your-username>/roster.git
cd roster
npm install
npm run tauri dev
```

First launch compiles Rust dependencies, which takes 2–5 minutes. Subsequent launches are fast.

### Build a production installer

```powershell
npm run tauri build
```

Output lands in `src-tauri/target/release/bundle/msi/` (and `bundle/nsis/` for the EXE installer). Either file is a standard Windows installer you can distribute.

### Bumping the version

Three files need to stay in sync:

1. `package.json` → `version`
2. `src-tauri/tauri.conf.json` → `version`
3. `src-tauri/Cargo.toml` → `version`

Bump all three, commit, then create a matching `vX.Y.Z` git tag and push it. The release workflow described below will pick it up.

## Project structure

```
roster/
├── src/                        # React frontend
│   ├── routes/                 # Pages: CandidateList, CandidateDetail, Reports, Settings
│   ├── components/             # UI components by feature
│   │   ├── candidate/          # Detail panels, form, row peek, LoE calculator, hiring utilities
│   │   ├── filters/            # FilterBar
│   │   ├── notes/              # TipTap editor + note items + panel
│   │   ├── requirements/       # Checklist with inline-create
│   │   ├── search/             # Ctrl+K palette
│   │   ├── settings/           # Stage / Role / Recruiter / RequirementType / Template / Data managers
│   │   ├── shared/             # RoleSelect, RecruiterSelect
│   │   └── ui/                 # Primitives (Button, Dialog, Select, Toast, ...)
│   ├── hooks/                  # TanStack Query wrappers for DB reads/writes
│   ├── lib/                    # db client, types, SQL strings, format helpers, backup
│   ├── stores/                 # Zustand (UI state, filters, toasts)
│   └── styles/
└── src-tauri/                  # Rust backend
    ├── src/
    │   ├── main.rs
    │   ├── lib.rs              # Plugin registration
    │   └── migrations.rs       # SQLite schema + seed data, versioned migrations
    └── capabilities/           # Tauri permissions
```

## Tech stack

- **Tauri 2** — native desktop shell
- **React 18 + TypeScript**
- **SQLite** (via `tauri-plugin-sql`) — local database with WAL mode and FTS5 full-text search
- **TanStack Query** — data fetching + caching
- **Zustand** — UI state
- **TipTap** — rich-text editor for notes
- **dnd-kit** — used by the stage manager for reordering
- **Tailwind CSS + shadcn/ui + Radix** — styling and accessible primitives
- **lucide-react** — icons
- **jszip** — backup zip creation

## Database migrations

Schema is versioned in `src-tauri/src/migrations.rs`. Migrations run automatically on app start; each one only runs once per database. The current major migrations are:

- v1: initial schema
- v2: seed default stages and requirement types
- v3: drop departments, rename two candidate columns (post-pivot cleanup)
- v4: expand candidate fields, replace stage workflow, update requirement-status vocabulary
- v5: introduce `recruiters` table and link via `recruiter_id`

If you need to reset to a fresh DB during development:

```powershell
Remove-Item "$env:APPDATA\com.hiringtracker.app\hiring_tracker.db*"
```

## Releases (maintainers)

Tagging a commit with `vX.Y.Z` triggers `.github/workflows/release.yml`, which builds Windows installers and creates a draft GitHub Release with the MSI and EXE attached. See `.github/workflows/release.yml` for the exact action versions.

## License

MIT — see [LICENSE](./LICENSE).

## Acknowledgments

Icon is a placeholder; replace `src-tauri/icons/` contents with your own art before distributing widely.
