//! Installed-tool detection from PATH and known app locations.
//! Presence here means the binary or app exists — never a fake running session.

use crate::classify::Tool;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone)]
pub struct InstallHit {
    pub tool: Tool,
    pub source: String,
}

pub fn installed_hits() -> Vec<InstallHit> {
    let mut hits = Vec::new();
    for tool in Tool::all() {
        if let Some(source) = find_install(*tool) {
            hits.push(InstallHit {
                tool: *tool,
                source,
            });
        }
    }
    hits
}

fn find_install(tool: Tool) -> Option<String> {
    for bin in tool.detect_bins() {
        if let Some(path) = binary_on_path(bin) {
            return Some(format!("{} on PATH", path.display()));
        }
        for dir in extra_bin_dirs() {
            if let Some(path) = binary_in_dir(&dir, bin) {
                return Some(format!("{}", path.display()));
            }
        }
    }
    for path in app_paths(tool) {
        if path.exists() {
            return Some(path.display().to_string());
        }
    }
    None
}

fn extra_bin_dirs() -> Vec<PathBuf> {
    let mut dirs = vec![
        PathBuf::from("/opt/homebrew/bin"),
        PathBuf::from("/usr/local/bin"),
        PathBuf::from("/usr/bin"),
    ];
    if let Some(home) = dirs::home_dir() {
        dirs.push(home.join(".local/bin"));
        dirs.push(home.join(".npm-global/bin"));
        dirs.push(home.join(".bun/bin"));
        dirs.push(home.join(".yarn/bin"));
        dirs.push(home.join("n/bin"));
        dirs.push(home.join(".cargo/bin"));
        dirs.push(home.join("AppData/Roaming/npm"));
    }
    dirs
}

fn app_paths(tool: Tool) -> Vec<PathBuf> {
    let mut paths = Vec::new();

    #[cfg(target_os = "macos")]
    {
        match tool {
            Tool::Cursor => paths.push(PathBuf::from("/Applications/Cursor.app")),
            Tool::OpenCode => {
                paths.push(PathBuf::from("/Applications/OpenCode.app"));
                paths.push(PathBuf::from("/Applications/opencode.app"));
            }
            Tool::Codex => paths.push(PathBuf::from("/Applications/Codex.app")),
            Tool::ClaudeCode => {}
            _ => {}
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Some(local) = dirs::data_local_dir() {
            match tool {
                Tool::Cursor => {
                    paths.push(local.join("Programs/cursor"));
                    paths.push(local.join("Programs/Cursor"));
                }
                Tool::OpenCode => paths.push(local.join("Programs/OpenCode")),
                Tool::Codex => paths.push(local.join("Programs/Codex")),
                _ => {}
            }
        }
        if let Some(home) = dirs::home_dir() {
            paths.push(home.join("AppData/Local/Programs/cursor"));
        }
    }

    #[cfg(target_os = "linux")]
    {
        match tool {
            Tool::Cursor => {
                paths.push(PathBuf::from("/usr/share/cursor"));
                paths.push(PathBuf::from("/opt/Cursor"));
                paths.push(PathBuf::from("/opt/cursor"));
                paths.push(PathBuf::from("/usr/bin/cursor"));
            }
            Tool::OpenCode => {
                paths.push(PathBuf::from("/opt/opencode"));
                paths.push(PathBuf::from("/usr/bin/opencode"));
            }
            Tool::Codex => paths.push(PathBuf::from("/usr/bin/codex")),
            _ => {}
        }
        if let Some(home) = dirs::home_dir() {
            if tool == Tool::Cursor {
                paths.push(home.join(".local/share/cursor"));
            }
        }
    }

    paths
}

fn binary_on_path(name: &str) -> Option<PathBuf> {
    let path = std::env::var_os("PATH")?;
    for dir in std::env::split_paths(&path) {
        if let Some(found) = binary_in_dir(&dir, name) {
            return Some(found);
        }
    }
    None
}

fn binary_in_dir(dir: &Path, name: &str) -> Option<PathBuf> {
    let candidate = dir.join(name);
    if is_executable_file(&candidate) {
        return Some(candidate);
    }
    #[cfg(windows)]
    {
        for ext in ["exe", "cmd", "bat", "ps1"] {
            let with_ext = dir.join(format!("{name}.{ext}"));
            if is_executable_file(&with_ext) {
                return Some(with_ext);
            }
        }
    }
    None
}

fn is_executable_file(path: &Path) -> bool {
    if !path.is_file() {
        return false;
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(meta) = path.metadata() {
            return meta.permissions().mode() & 0o111 != 0;
        }
        return false;
    }
    #[cfg(not(unix))]
    {
        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extra_dirs_include_local_bin() {
        let dirs = extra_bin_dirs();
        assert!(dirs.iter().any(|d| d.ends_with(".local/bin") || d.ends_with("usr/bin")));
    }

    #[test]
    fn missing_binary_is_none() {
        assert!(binary_in_dir(Path::new("/tmp/dew-does-not-exist-bin"), "claude").is_none());
    }
}
