use tauri_plugin_sql::{Builder as SqlBuilder, Migration};

mod migrations;

pub const DB_URL: &str = "sqlite:hiring_tracker.db";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations: Vec<Migration> = migrations::all_migrations();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(
            SqlBuilder::default()
                .add_migrations(DB_URL, migrations)
                .build(),
        )
        .setup(|_app| {
            // Enable WAL mode once the DB is loaded.
            // The SQL plugin opens the DB lazily on first use from the frontend,
            // so we issue the PRAGMA from the frontend on app boot instead.
            // See: src/lib/db.ts -> initDatabase()
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    #[test]
    fn migrations_are_ordered() {
        let migs = super::migrations::all_migrations();
        let mut last = 0;
        for m in &migs {
            assert!(m.version > last, "migration versions must be strictly increasing");
            last = m.version;
        }
    }
}
