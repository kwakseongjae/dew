mod classify;
mod detect;
mod focus;
mod gitinfo;
mod scan;
mod settings;
mod types;
mod usage;
mod windows;

use scan::AppScan;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::Duration;
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use types::{ConnectResult, Settings, Snapshot};

struct HoverState {
    orb: AtomicBool,
    panel: AtomicBool,
    generation: AtomicU64,
}

impl Default for HoverState {
    fn default() -> Self {
        Self {
            orb: AtomicBool::new(false),
            panel: AtomicBool::new(false),
            generation: AtomicU64::new(0),
        }
    }
}

struct LiveSettings(Mutex<Settings>);

#[tauri::command]
fn get_snapshot(app: AppHandle, state: State<AppScan>) -> Snapshot {
    let settings = settings::load(&app);
    scan::scan(&state, &settings)
}

#[tauri::command]
fn connect_detected(app: AppHandle, state: State<AppScan>) -> Result<ConnectResult, String> {
    let mut settings = settings::load(&app);
    settings.sample_layout = false;
    let preview = scan::scan(&state, &settings);
    let ids: Vec<String> = preview
        .detected_tools
        .iter()
        .filter(|tool| tool.installed || tool.running_sessions > 0)
        .map(|tool| tool.id.clone())
        .collect();
    settings.onboarded = true;
    settings.followed_tools = ids;
    settings::save(&app, &settings)?;
    apply_runtime_settings(&app, &settings)?;
    if let Some(slot) = app.try_state::<LiveSettings>() {
        if let Ok(mut guard) = slot.0.lock() {
            *guard = settings.clone();
        }
    }
    let snapshot = scan::scan(&state, &settings);
    let _ = windows::show_panel(&app);
    Ok(ConnectResult {
        snapshot,
        settings,
    })
}

#[tauri::command]
fn get_settings(app: AppHandle) -> Settings {
    settings::load(&app)
}

#[tauri::command]
fn save_settings(app: AppHandle, next: Settings) -> Result<Settings, String> {
    settings::save(&app, &next)?;
    apply_runtime_settings(&app, &next)?;
    if let Some(slot) = app.try_state::<LiveSettings>() {
        if let Ok(mut guard) = slot.0.lock() {
            *guard = next.clone();
        }
    }
    Ok(next)
}

#[tauri::command]
fn show_panel(app: AppHandle) -> Result<(), String> {
    windows::show_panel(&app)
}

#[tauri::command]
fn hide_panel(app: AppHandle) -> Result<(), String> {
    windows::hide_panel(&app)
}

#[tauri::command]
fn toggle_panel(app: AppHandle) -> Result<(), String> {
    windows::toggle_panel(&app)
}

#[tauri::command]
fn focus_agent(app: AppHandle, state: State<AppScan>, id: String) -> Result<(), String> {
    let settings = settings::load(&app);
    let snap = scan::scan(&state, &settings);
    let group = snap
        .groups
        .iter()
        .find(|g| g.id == id)
        .ok_or_else(|| "Unknown agent row.".to_string())?;
    let result = focus::focus(&group.focus);
    if group.has_finished {
        if let Ok(mut tracker) = state.tracker.lock() {
            tracker.dismiss(&id);
        }
    }
    result
}

#[tauri::command]
fn dismiss_done(state: State<AppScan>, id: String) -> Result<(), String> {
    state
        .tracker
        .lock()
        .map_err(|e| e.to_string())?
        .dismiss(&id);
    Ok(())
}

#[tauri::command]
fn set_orb_position(app: AppHandle, x: i32, y: i32) -> Result<(), String> {
    windows::set_orb_position(&app, x, y)
}

#[tauri::command]
fn hide_orb(app: AppHandle) -> Result<(), String> {
    windows::hide_orb(&app)
}

#[tauri::command]
fn show_orb(app: AppHandle) -> Result<(), String> {
    windows::show_orb(&app)
}

#[tauri::command]
fn note_pointer(app: AppHandle, surface: String, inside: bool) -> Result<(), String> {
    let settings = settings::load(&app);
    if settings.open_mode != "hover" {
        return Ok(());
    }
    let hover = app.state::<HoverState>();
    match surface.as_str() {
        "orb" => hover.orb.store(inside, Ordering::SeqCst),
        "panel" => hover.panel.store(inside, Ordering::SeqCst),
        _ => {}
    }
    let orb = hover.orb.load(Ordering::SeqCst);
    let panel = hover.panel.load(Ordering::SeqCst);
    if orb || panel {
        windows::show_panel(&app)?;
        return Ok(());
    }
    let gen = hover.generation.fetch_add(1, Ordering::SeqCst) + 1;
    let handle = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_millis(420));
        let hover = handle.state::<HoverState>();
        if hover.generation.load(Ordering::SeqCst) != gen {
            return;
        }
        if hover.orb.load(Ordering::SeqCst) || hover.panel.load(Ordering::SeqCst) {
            return;
        }
        let _ = windows::hide_panel(&handle);
    });
    Ok(())
}

fn apply_runtime_settings(app: &AppHandle, settings: &Settings) -> Result<(), String> {
    let gs = app.global_shortcut();
    let _ = gs.unregister_all();
    if let Err(err) = gs.register(settings.shortcut.as_str()) {
        eprintln!("dew: shortcut register failed: {err}");
    }

    use tauri_plugin_autostart::ManagerExt;
    if settings.autostart {
        let _ = app.autolaunch().enable();
    } else {
        let _ = app.autolaunch().disable();
    }

    if let Ok(win) = windows::orb(app) {
        if settings.orb_visible {
            let _ = win.show();
        } else {
            let _ = win.hide();
        }
    }
    Ok(())
}

fn emit_loop(app: AppHandle) {
    std::thread::spawn(move || loop {
        let settings = settings::load(&app);
        if let Some(state) = app.try_state::<AppScan>() {
            let snapshot = scan::scan(&state, &settings);
            let _ = app.emit("dew://snapshot", snapshot);
        }
        std::thread::sleep(Duration::from_millis(2000));
    });
}

fn build_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let toggle = MenuItemBuilder::with_id("toggle", "Toggle Dew").build(app)?;
    let show_orb = MenuItemBuilder::with_id("show-orb", "Show dewdrop").build(app)?;
    let hide_orb = MenuItemBuilder::with_id("hide-orb", "Hide dewdrop").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit Dew").build(app)?;
    let menu = MenuBuilder::new(app)
        .item(&toggle)
        .separator()
        .item(&show_orb)
        .item(&hide_orb)
        .separator()
        .item(&quit)
        .build()?;

    let mut tray = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("Dew")
        .on_menu_event(|app, event| match event.id().as_ref() {
            "toggle" => {
                let _ = windows::toggle_panel(app);
            }
            "show-orb" => {
                let _ = windows::show_orb(app);
            }
            "hide-orb" => {
                let _ = windows::hide_orb(app);
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let _ = windows::toggle_panel(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            let _ = windows::show_panel(app);
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        let _ = windows::toggle_panel(app);
                    }
                })
                .build(),
        )
        .manage(AppScan::new())
        .manage(HoverState::default())
        .invoke_handler(tauri::generate_handler![
            get_snapshot,
            get_settings,
            save_settings,
            connect_detected,
            show_panel,
            hide_panel,
            toggle_panel,
            focus_agent,
            dismiss_done,
            set_orb_position,
            hide_orb,
            show_orb,
            note_pointer
        ])
        .setup(|app| {
            let cfg = settings::load(app.handle());
            app.manage(LiveSettings(Mutex::new(cfg.clone())));
            let _ = windows::place_default_orb(app.handle(), &cfg);
            let _ = apply_runtime_settings(app.handle(), &cfg);
            if let Err(err) = build_tray(app) {
                eprintln!("dew: tray failed: {err}");
            }
            emit_loop(app.handle().clone());
            if !cfg.onboarded {
                let _ = windows::show_panel(app.handle());
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Dew");
}
