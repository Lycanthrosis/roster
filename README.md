# Hiring Tracker

A local-first desktop app for tracking healthcare HR hiring pipelines. Tauri + React + SQLite.

All data stays on your machine. No cloud, no telemetry, no accounts.

## Prerequisites

Before you can run this, you need the Tauri toolchain installed on your machine. One-time setup:

- **Node.js 18+** — https://nodejs.org
- **Rust** (stable) — `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Platform dependencies** — follow the short list at https://tauri.app/start/prerequisites/ for your OS. On macOS this is just Xcode Command Line Tools; on Windows it's the Microsoft C++ Build Tools; on Linux it's a handful of apt/dnf packages.

## First run

```bash
# From inside the hiring-tracker/ folder
npm install           # installs JS deps (~1 min)
npm run tauri dev     # first launch compiles Rust (~2–5 min), then opens the app
```

Subsequent launches are fast. Changes to React code hot-reload; changes to Rust code trigger a quick rebuild.

## Where your data lives

SQLite database: the Tauri app data directory for your OS.

- **macOS:** `~/Library/Application Support/com.hiringtracker.app/hiring_tracker.db`
- **Windows:** `%APPDATA%\com.hiringtracker.app\hiring_tracker.db`
- **Linux:** `~/.local/share/com.hiringtracker.app/hiring_tracker.db`

Back this file up regularly. A Files→Backup menu item ships in a later phase.

## Building a production installer

```bash
npm run tauri build
```

Output goes to `src-tauri/target/release/bundle/` — `.dmg` on macOS, `.msi` and `.exe` on Windows, `.deb`/`.AppImage` on Linux.

## Project structure

```
hiring-tracker/
├── src/                  # React frontend
│   ├── routes/           # One file per page
│   ├── components/       # UI (layout, candidate, notes, requirements, filters, ui primitives)
│   ├── hooks/            # TanStack Query wrappers around DB reads
│   ├── lib/              # db client, types, SQL query strings, utils
│   ├── stores/           # Zustand stores (UI-only state)
│   └── styles/
└── src-tauri/            # Rust backend
    ├── src/
    │   ├── main.rs
    │   ├── lib.rs
    │   └── migrations.rs # The full SQLite schema + seed data
    └── capabilities/     # Tauri permissions
```

## Build phases

- [x] **Phase 1** — Scaffold: Tauri + React shell, SQLite schema, seed data, sidebar navigation
- [ ] **Phase 2** — Candidate CRUD + list view with an add/edit form
- [ ] **Phase 3** — User-configurable stages + drag-and-drop kanban dashboard
- [ ] **Phase 4** — Requirement types, templates, per-candidate checklists
- [ ] **Phase 5** — TipTap notes with pinning and full-text search
- [ ] **Phase 6** — Attachments wired to requirements
- [ ] **Phase 7** — Filters + Cmd+K global search
- [ ] **Phase 8** — Polish: keyboard shortcuts, backup/restore, reports
