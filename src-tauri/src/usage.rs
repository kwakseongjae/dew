//! Local subscription-usage readers. Never invent hours. Never read BYOK keys.

use crate::types::UsageSource;
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};

pub fn read_usage(period: &str) -> Vec<UsageSource> {
    vec![
        read_one("cursor", "Cursor", period, cursor_candidates()),
        read_one("claude-code", "Claude Code", period, claude_candidates()),
        read_one("codex", "Codex", period, codex_candidates()),
        read_one("opencode", "OpenCode", period, opencode_candidates()),
    ]
}

fn read_one(tool: &str, display: &str, period: &str, paths: Vec<PathBuf>) -> UsageSource {
    let existing: Vec<PathBuf> = paths.into_iter().filter(|p| p.is_file()).collect();
    if existing.is_empty() {
        return UsageSource {
            tool: tool.into(),
            display_name: display.into(),
            available: false,
            reason: Some(format!(
                "No local usage file for {display} on this machine."
            )),
            period: period.into(),
            cap_seconds: None,
            used_seconds: None,
            cap_label: cap_label_for(tool, period),
            daily_seconds: None,
            byok: false,
        };
    }

    for path in &existing {
        if let Some(mut parsed) = parse_usage_file(path) {
            parsed.tool = tool.into();
            parsed.display_name = display.into();
            parsed.period = period.into();
            parsed.byok = false;
            if parsed.cap_label.is_none() {
                parsed.cap_label = cap_label_for(tool, period);
            }
            parsed.available = parsed.used_seconds.is_some() || parsed.cap_seconds.is_some();
            if parsed.available {
                parsed.reason = Some(format!("Read from {}", path.display()));
                return parsed;
            }
        }
    }

    UsageSource {
        tool: tool.into(),
        display_name: display.into(),
        available: false,
        reason: Some(format!(
            "Found {} local file(s) for {display}, but none contained a usage total or cap.",
            existing.len()
        )),
        period: period.into(),
        cap_seconds: None,
        used_seconds: None,
        cap_label: cap_label_for(tool, period),
        daily_seconds: None,
        byok: false,
    }
}

fn cap_label_for(tool: &str, period: &str) -> Option<String> {
    match (tool, period) {
        ("cursor", "weekly") => Some("5h".into()),
        _ => None,
    }
}

fn home() -> Option<PathBuf> {
    dirs::home_dir()
}

fn config_home() -> Option<PathBuf> {
    dirs::config_dir()
}

fn data_home() -> Option<PathBuf> {
    dirs::data_local_dir().or_else(dirs::data_dir)
}

fn cursor_candidates() -> Vec<PathBuf> {
    let mut out = Vec::new();
    if let Some(h) = home() {
        out.push(h.join(".cursor/usage.json"));
        out.push(h.join(".cursor/stats.json"));
        out.push(h.join(".cursor/quota.json"));
    }
    // VS Code-style globalStorage (Cursor is a VS Code fork)
    let mut roots = Vec::new();
    if let Some(c) = config_home() {
        roots.push(c.join("Cursor"));
        roots.push(c.join("Cursor Nightly"));
    }
    if let Some(d) = data_home() {
        roots.push(d.join("Cursor"));
    }
    #[cfg(target_os = "macos")]
    if let Some(h) = home() {
        roots.push(h.join("Library/Application Support/Cursor"));
    }
    #[cfg(target_os = "windows")]
    if let Some(h) = home() {
        roots.push(h.join("AppData/Roaming/Cursor"));
    }
    for root in roots {
        out.push(root.join("User/globalStorage/storage.json"));
        out.push(root.join("User/globalStorage/anysphere.cursor-retrieval/usage.json"));
    }
    out
}

fn claude_candidates() -> Vec<PathBuf> {
    let mut out = Vec::new();
    if let Some(h) = home() {
        out.push(h.join(".claude.json"));
        out.push(h.join(".claude/usage.json"));
        out.push(h.join(".claude/stats.json"));
        out.push(h.join(".claude/quota.json"));
    }
    out
}

fn codex_candidates() -> Vec<PathBuf> {
    let mut out = Vec::new();
    if let Some(h) = home() {
        out.push(h.join(".codex/usage.json"));
        out.push(h.join(".codex/stats.json"));
        out.push(h.join(".codex/quota.json"));
    }
    out
}

fn opencode_candidates() -> Vec<PathBuf> {
    let mut out = Vec::new();
    if let Some(h) = home() {
        out.push(h.join(".opencode/usage.json"));
        out.push(h.join(".opencode/stats.json"));
    }
    if let Some(d) = data_home() {
        out.push(d.join("opencode/usage.json"));
    }
    out
}

fn parse_usage_file(path: &Path) -> Option<UsageSource> {
    let meta = fs::metadata(path).ok()?;
    if meta.len() > 2_000_000 {
        return None;
    }
    let text = fs::read_to_string(path).ok()?;
    let value: Value = serde_json::from_str(&text).ok()?;
    extract_usage(&value)
}

fn extract_usage(value: &Value) -> Option<UsageSource> {
    let mut used: Option<f64> = None;
    let mut cap: Option<f64> = None;
    let mut daily: Option<Vec<Option<u64>>> = None;
    walk_usage(value, 0, &mut used, &mut cap, &mut daily);
    if used.is_none() && cap.is_none() {
        return None;
    }
    Some(UsageSource {
        tool: String::new(),
        display_name: String::new(),
        available: true,
        reason: None,
        period: "weekly".into(),
        cap_seconds: cap.map(|v| v.round() as u64),
        used_seconds: used.map(|v| v.round() as u64),
        cap_label: None,
        daily_seconds: daily,
        byok: false,
    })
}

fn walk_usage(
    value: &Value,
    depth: usize,
    used: &mut Option<f64>,
    cap: &mut Option<f64>,
    daily: &mut Option<Vec<Option<u64>>>,
) {
    if depth > 6 {
        return;
    }
    match value {
        Value::Object(map) => {
            for (k, v) in map {
                let key = k.to_lowercase();
                if key.contains("byok") || key.contains("api_key") || key.contains("apikey") {
                    continue;
                }
                if used.is_none() {
                    if matches!(
                        key.as_str(),
                        "used_seconds"
                            | "usedseconds"
                            | "seconds_used"
                            | "consumed_seconds"
                    ) {
                        *used = v.as_f64().or_else(|| v.as_u64().map(|n| n as f64));
                    } else if matches!(
                        key.as_str(),
                        "used_minutes" | "usedminutes" | "minutes_used"
                    ) {
                        *used = v
                            .as_f64()
                            .or_else(|| v.as_u64().map(|n| n as f64))
                            .map(|m| m * 60.0);
                    } else if matches!(key.as_str(), "used_hours" | "hours_used" | "usedhours") {
                        *used = v
                            .as_f64()
                            .or_else(|| v.as_u64().map(|n| n as f64))
                            .map(|h| h * 3600.0);
                    }
                }
                if cap.is_none() {
                    if matches!(
                        key.as_str(),
                        "cap_seconds"
                            | "limit_seconds"
                            | "quota_seconds"
                            | "capseconds"
                            | "five_hour_seconds"
                    ) {
                        *cap = v.as_f64().or_else(|| v.as_u64().map(|n| n as f64));
                    } else if matches!(key.as_str(), "cap_minutes" | "limit_minutes") {
                        *cap = v
                            .as_f64()
                            .or_else(|| v.as_u64().map(|n| n as f64))
                            .map(|m| m * 60.0);
                    } else if matches!(
                        key.as_str(),
                        "cap_hours" | "limit_hours" | "weekly_hours" | "five_hour_cap"
                    ) {
                        *cap = v
                            .as_f64()
                            .or_else(|| v.as_u64().map(|n| n as f64))
                            .map(|h| h * 3600.0);
                    }
                }
                if daily.is_none() && (key == "daily" || key == "daily_seconds" || key == "days") {
                    if let Some(arr) = v.as_array() {
                        if arr.len() == 7 {
                            *daily = Some(
                                arr.iter()
                                    .map(|item| item.as_u64().or_else(|| item.as_f64().map(|f| f.round() as u64)))
                                    .collect(),
                            );
                        }
                    }
                }
                walk_usage(v, depth + 1, used, cap, daily);
            }
        }
        Value::Array(items) => {
            for item in items.iter().take(20) {
                walk_usage(item, depth + 1, used, cap, daily);
            }
        }
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_hours_without_inventing() {
        let v: Value = serde_json::json!({
            "usage": { "used_hours": 1.5, "cap_hours": 5 }
        });
        let parsed = extract_usage(&v).unwrap();
        assert_eq!(parsed.used_seconds, Some(5400));
        assert_eq!(parsed.cap_seconds, Some(18000));
    }

    #[test]
    fn ignores_unrelated_json() {
        let v: Value = serde_json::json!({ "theme": "dark", "locale": "en" });
        assert!(extract_usage(&v).is_none());
    }
}
