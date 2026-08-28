use crate::settings;
use crate::types::Settings;
use tauri::{
    AppHandle, LogicalPosition, Manager, PhysicalPosition, Position, WebviewWindow,
};

pub fn orb(app: &AppHandle) -> Result<WebviewWindow, String> {
    app.get_webview_window("orb").ok_or_else(|| "orb window missing".into())
}

pub fn panel(app: &AppHandle) -> Result<WebviewWindow, String> {
    app.get_webview_window("panel")
        .ok_or_else(|| "panel window missing".into())
}

pub fn place_default_orb(app: &AppHandle, settings: &Settings) -> Result<(), String> {
    let win = orb(app)?;
    if let (Some(x), Some(y)) = (settings.orb_x, settings.orb_y) {
        win.set_position(Position::Physical(PhysicalPosition { x, y }))
            .map_err(|e| e.to_string())?;
        return Ok(());
    }
    if let Some(monitor) = win.primary_monitor().map_err(|e| e.to_string())? {
        let size = monitor.size();
        let pos = monitor.position();
        let orb_size = win.outer_size().map_err(|e| e.to_string())?;
        let x = pos.x + size.width as i32 - orb_size.width as i32 - 36;
        let y = pos.y + 96;
        win.set_position(Position::Physical(PhysicalPosition { x, y }))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn show_panel(app: &AppHandle) -> Result<(), String> {
    let orb_win = orb(app)?;
    let panel_win = panel(app)?;
    let orb_pos = orb_win.outer_position().map_err(|e| e.to_string())?;
    let orb_size = orb_win.outer_size().map_err(|e| e.to_string())?;
    let panel_size = panel_win.outer_size().map_err(|e| e.to_string())?;
    let monitor = orb_win
        .current_monitor()
        .map_err(|e| e.to_string())?
        .or(orb_win.primary_monitor().map_err(|e| e.to_string())?);

    let mut x = orb_pos.x + orb_size.width as i32 - panel_size.width as i32;
    let mut y = orb_pos.y + orb_size.height as i32 + 8;
    if let Some(mon) = monitor {
        let origin = mon.position();
        let size = mon.size();
        let right = origin.x + size.width as i32;
        let bottom = origin.y + size.height as i32;
        if x < origin.x + 12 {
            x = origin.x + 12;
        }
        if x + panel_size.width as i32 > right - 12 {
            x = right - panel_size.width as i32 - 12;
        }
        if y + panel_size.height as i32 > bottom - 12 {
            y = orb_pos.y - panel_size.height as i32 - 8;
        }
        if y < origin.y + 12 {
            y = origin.y + 12;
        }
    }
    panel_win
        .set_position(Position::Physical(PhysicalPosition { x, y }))
        .map_err(|e| e.to_string())?;
    panel_win.show().map_err(|e| e.to_string())?;
    let _ = panel_win.set_focus();
    Ok(())
}

pub fn hide_panel(app: &AppHandle) -> Result<(), String> {
    panel(app)?.hide().map_err(|e| e.to_string())
}

pub fn toggle_panel(app: &AppHandle) -> Result<(), String> {
    let win = panel(app)?;
    if win.is_visible().map_err(|e| e.to_string())? {
        win.hide().map_err(|e| e.to_string())
    } else {
        show_panel(app)
    }
}

pub fn hide_orb(app: &AppHandle) -> Result<(), String> {
    orb(app)?.hide().map_err(|e| e.to_string())?;
    let mut s = settings::load(app);
    s.orb_visible = false;
    settings::save(app, &s)
}

pub fn show_orb(app: &AppHandle) -> Result<(), String> {
    let mut s = settings::load(app);
    s.orb_visible = true;
    settings::save(app, &s)?;
    let win = orb(app)?;
    place_default_orb(app, &s)?;
    win.show().map_err(|e| e.to_string())
}

pub fn set_orb_position(app: &AppHandle, x: i32, y: i32) -> Result<(), String> {
    let mut s = settings::load(app);
    s.orb_x = Some(x);
    s.orb_y = Some(y);
    settings::save(app, &s)?;
    orb(app)?
        .set_position(Position::Physical(PhysicalPosition { x, y }))
        .map_err(|e| e.to_string())
}

#[allow(dead_code)]
pub fn logical(x: f64, y: f64) -> Position {
    Position::Logical(LogicalPosition { x, y })
}
