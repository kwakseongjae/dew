use crate::types::FocusHint;
use std::process::Command;

pub fn focus(hint: &FocusHint) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        return focus_macos(hint);
    }
    #[cfg(target_os = "windows")]
    {
        return focus_windows(hint);
    }
    #[cfg(target_os = "linux")]
    {
        return focus_linux(hint);
    }
    #[allow(unreachable_code)]
    Err("Window focusing is not supported on this OS.".into())
}

#[cfg(target_os = "macos")]
fn focus_macos(hint: &FocusHint) -> Result<(), String> {
    if let Some(pid) = hint.pid {
        let status = Command::new("osascript")
            .args([
                "-e",
                &format!(
                    "tell application \"System Events\" to set frontmost of first process whose unix id is {pid} to true"
                ),
            ])
            .status()
            .map_err(|e| e.to_string())?;
        if status.success() {
            return Ok(());
        }
    }
    if let Some(app) = hint.app_name.as_deref() {
        let status = Command::new("osascript")
            .args(["-e", &format!("tell application \"{app}\" to activate")])
            .status()
            .map_err(|e| e.to_string())?;
        if status.success() {
            return Ok(());
        }
        return Err(format!("Could not activate {app}."));
    }
    Err("No app or pid to focus.".into())
}

#[cfg(target_os = "windows")]
fn focus_windows(hint: &FocusHint) -> Result<(), String> {
    if let Some(pid) = hint.pid {
        let script = format!(
            "$p = Get-Process -Id {pid} -ErrorAction SilentlyContinue; if ($p) {{ (New-Object -ComObject WScript.Shell).AppActivate($p.Id) | Out-Null }}"
        );
        let status = Command::new("powershell")
            .args(["-NoProfile", "-Command", &script])
            .status()
            .map_err(|e| e.to_string())?;
        if status.success() {
            return Ok(());
        }
    }
    if let Some(app) = hint.app_name.as_deref() {
        let script = format!(
            "(New-Object -ComObject WScript.Shell).AppActivate('{app}') | Out-Null"
        );
        let status = Command::new("powershell")
            .args(["-NoProfile", "-Command", &script])
            .status()
            .map_err(|e| e.to_string())?;
        if status.success() {
            return Ok(());
        }
    }
    Err("Could not focus the matching Windows window.".into())
}

#[cfg(target_os = "linux")]
fn focus_linux(hint: &FocusHint) -> Result<(), String> {
    if let Some(pid) = hint.pid {
        if try_xdotool_pid(pid) {
            return Ok(());
        }
        if try_wmctrl_pid(pid) {
            return Ok(());
        }
    }
    if let Some(app) = hint.app_name.as_deref() {
        if Command::new("wmctrl")
            .args(["-a", app])
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
        {
            return Ok(());
        }
    }
    Err("Could not focus a window (install wmctrl or xdotool for Linux).".into())
}

#[cfg(target_os = "linux")]
fn try_xdotool_pid(pid: u32) -> bool {
    let output = Command::new("xdotool")
        .args(["search", "--pid", &pid.to_string()])
        .output();
    let Ok(output) = output else {
        return false;
    };
    let ids = String::from_utf8_lossy(&output.stdout);
    let Some(wid) = ids.lines().last().map(str::trim).filter(|s| !s.is_empty()) else {
        return false;
    };
    Command::new("xdotool")
        .args(["windowactivate", "--sync", wid])
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

#[cfg(target_os = "linux")]
fn try_wmctrl_pid(pid: u32) -> bool {
    let output = Command::new("wmctrl").args(["-lp"]).output();
    let Ok(output) = output else {
        return false;
    };
    let text = String::from_utf8_lossy(&output.stdout);
    let needle = format!(" {pid} ");
    for line in text.lines() {
        if line.contains(&needle) {
            if let Some(wid) = line.split_whitespace().next() {
                return Command::new("wmctrl")
                    .args(["-ia", wid])
                    .status()
                    .map(|s| s.success())
                    .unwrap_or(false);
            }
        }
    }
    false
}
