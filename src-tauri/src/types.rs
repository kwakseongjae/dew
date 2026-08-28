use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub scanned_at_ms: u64,
    pub sample: bool,
    pub groups: Vec<AgentGroup>,
    pub detected_tools: Vec<DetectedTool>,
    pub usage: Vec<UsageSource>,
    pub live_agent_tools: u32,
    pub active_jobs: u32,
    pub process_count: u32,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentGroup {
    pub id: String,
    pub tool: String,
    pub display_name: String,
    pub repo: Option<String>,
    pub branch: Option<String>,
    pub worktree: Option<String>,
    pub pid: Option<u32>,
    pub host: Option<String>,
    pub jobs: u32,
    pub status: String,
    pub pids: Vec<u32>,
    pub focus: FocusHint,
    pub detail: String,
    pub finished_at_ms: Option<u64>,
    pub has_finished: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectedTool {
    pub id: String,
    pub display_name: String,
    pub installed: bool,
    pub running_sessions: u32,
    pub followed: bool,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectResult {
    pub snapshot: Snapshot,
    pub settings: Settings,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct FocusHint {
    pub kind: String,
    pub app_name: Option<String>,
    pub pid: Option<u32>,
    pub window_title: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageSource {
    pub tool: String,
    pub display_name: String,
    pub available: bool,
    pub reason: Option<String>,
    pub period: String,
    pub cap_seconds: Option<u64>,
    pub used_seconds: Option<u64>,
    pub cap_label: Option<String>,
    pub daily_seconds: Option<Vec<Option<u64>>>,
    pub byok: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub open_mode: String,
    pub shortcut: String,
    pub orb_visible: bool,
    pub orb_x: Option<i32>,
    pub orb_y: Option<i32>,
    pub usage_period: String,
    pub sample_layout: bool,
    pub autostart: bool,
    #[serde(default)]
    pub onboarded: bool,
    #[serde(default)]
    pub followed_tools: Vec<String>,
    #[serde(default = "default_true")]
    pub look_at_cursor: bool,
    #[serde(default = "default_playfulness")]
    pub playfulness: String,
    #[serde(default = "default_face")]
    pub face: String,
    #[serde(default = "default_mint")]
    pub mint: String,
    #[serde(default = "default_character")]
    pub character: String,
}

fn default_true() -> bool {
    true
}

fn default_playfulness() -> String {
    "playful".into()
}

fn default_face() -> String {
    "dots".into()
}

fn default_mint() -> String {
    "pale".into()
}

fn default_character() -> String {
    "drop".into()
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            open_mode: "click".into(),
            shortcut: "CommandOrControl+Shift+D".into(),
            orb_visible: true,
            orb_x: None,
            orb_y: None,
            usage_period: "weekly".into(),
            sample_layout: false,
            autostart: true,
            onboarded: false,
            followed_tools: Vec::new(),
            look_at_cursor: true,
            playfulness: default_playfulness(),
            face: default_face(),
            mint: default_mint(),
            character: default_character(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::Settings;

    #[test]
    fn dewdrop_fields_default_when_missing() {
        let raw = r#"{
            "openMode":"click",
            "shortcut":"CommandOrControl+Shift+D",
            "orbVisible":true,
            "usagePeriod":"weekly",
            "sampleLayout":false,
            "autostart":true
        }"#;
        let settings: Settings = serde_json::from_str(raw).expect("old settings json");
        assert!(settings.look_at_cursor);
        assert_eq!(settings.playfulness, "playful");
        assert_eq!(settings.face, "dots");
        assert_eq!(settings.mint, "pale");
        assert_eq!(settings.character, "drop");
    }
}

pub fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}
