//! Process name / cmdline / cwd heuristics for local coding agents.
//! Keep this table honest: match real agent CLIs and worktrees, not every IDE helper.

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Tool {
    Cursor,
    OpenCode,
    ClaudeCode,
    Codex,
    Aider,
    GeminiCli,
    Goose,
    Amp,
    Crush,
    CopilotCli,
}

const ALL_TOOLS: [Tool; 10] = [
    Tool::Cursor,
    Tool::OpenCode,
    Tool::ClaudeCode,
    Tool::Codex,
    Tool::Aider,
    Tool::GeminiCli,
    Tool::Goose,
    Tool::Amp,
    Tool::Crush,
    Tool::CopilotCli,
];

impl Tool {
    pub fn all() -> &'static [Tool] {
        &ALL_TOOLS
    }

    pub fn from_id(id: &str) -> Option<Tool> {
        ALL_TOOLS.iter().copied().find(|tool| tool.id() == id)
    }

    pub fn id(self) -> &'static str {
        match self {
            Tool::Cursor => "cursor",
            Tool::OpenCode => "opencode",
            Tool::ClaudeCode => "claude-code",
            Tool::Codex => "codex",
            Tool::Aider => "aider",
            Tool::GeminiCli => "gemini",
            Tool::Goose => "goose",
            Tool::Amp => "amp",
            Tool::Crush => "crush",
            Tool::CopilotCli => "copilot",
        }
    }

    pub fn display_name(self) -> &'static str {
        match self {
            Tool::Cursor => "Cursor",
            Tool::OpenCode => "OpenCode",
            Tool::ClaudeCode => "Claude Code",
            Tool::Codex => "Codex",
            Tool::Aider => "Aider",
            Tool::GeminiCli => "Gemini CLI",
            Tool::Goose => "Goose",
            Tool::Amp => "Amp",
            Tool::Crush => "Crush",
            Tool::CopilotCli => "Copilot CLI",
        }
    }

    pub fn host_app_name(self) -> Option<&'static str> {
        match self {
            Tool::Cursor => Some("Cursor"),
            Tool::OpenCode => Some("OpenCode"),
            Tool::Codex => Some("Codex"),
            _ => None,
        }
    }

    pub fn detect_bins(self) -> &'static [&'static str] {
        match self {
            Tool::Cursor => &["cursor-agent", "cursor"],
            Tool::OpenCode => &["opencode"],
            Tool::ClaudeCode => &["claude"],
            Tool::Codex => &["codex"],
            Tool::Aider => &["aider"],
            Tool::GeminiCli => &["gemini"],
            Tool::Goose => &["goose"],
            Tool::Amp => &["amp"],
            Tool::Crush => &["crush"],
            Tool::CopilotCli => &["copilot"],
        }
    }
}

pub fn normalize_name(name: &str) -> String {
    name.to_lowercase()
        .trim_end_matches(".exe")
        .trim_end_matches(".bin")
        .trim()
        .to_string()
}

fn slashy(s: &str) -> String {
    s.replace('\\', "/").to_lowercase()
}

pub fn is_self(name: &str, cmd: &str, exe: &str) -> bool {
    let n = normalize_name(name);
    let c = slashy(cmd);
    let e = slashy(exe);
    n == "dew"
        || e.ends_with("/dew")
        || e.contains("/dew.app/")
        || c.contains("app.dew.companion")
}

pub fn is_browser(name: &str) -> bool {
    let n = normalize_name(name);
    matches!(
        n.as_str(),
        "chrome"
            | "chromium"
            | "google chrome"
            | "firefox"
            | "safari"
            | "msedge"
            | "microsoft edge"
            | "brave"
            | "opera"
            | "vivaldi"
            | "arc"
    ) || n.contains("chrome helper")
        || n.contains("firefox")
}

pub fn is_cursor_helper(name: &str) -> bool {
    let n = normalize_name(name);
    n.starts_with("cursor helper")
}

pub fn is_cursor_ide(name: &str, exe: &str) -> bool {
    let n = normalize_name(name);
    let e = slashy(exe);
    if is_cursor_helper(&n) {
        return false;
    }
    n == "cursor" || e.contains("/cursor.app/") || e.ends_with("/cursor")
}

pub fn is_terminal(name: &str) -> bool {
    let n = normalize_name(name);
    matches!(
        n.as_str(),
        "iterm2"
            | "iterm"
            | "terminal"
            | "windowsterminal"
            | "windows terminal"
            | "wt"
            | "alacritty"
            | "kitty"
            | "wezterm"
            | "wezterm-gui"
            | "ghostty"
            | "hyper"
            | "tabby"
            | "warp"
            | "gnome-terminal"
            | "gnome-terminal-server"
            | "konsole"
            | "xfce4-terminal"
            | "tilix"
            | "ptyxis"
            | "powershell"
            | "pwsh"
            | "cmd"
            | "windows powershell"
            | "conhost"
    ) || n.contains("iterm")
}

pub fn terminal_app_name(name: &str) -> String {
    let n = normalize_name(name);
    if n.contains("iterm") {
        "iTerm2".into()
    } else if n.contains("windowsterminal") || n == "wt" || n.contains("windows terminal") {
        "Windows Terminal".into()
    } else if n.contains("ghostty") {
        "Ghostty".into()
    } else if n.contains("warp") {
        "Warp".into()
    } else if n.contains("alacritty") {
        "Alacritty".into()
    } else if n.contains("kitty") {
        "kitty".into()
    } else if n.contains("wezterm") {
        "WezTerm".into()
    } else if n == "terminal" {
        "Terminal".into()
    } else {
        name.to_string()
    }
}

fn cmd_tokens(cmd: &str) -> Vec<String> {
    slashy(cmd)
        .split_whitespace()
        .map(|t| t.trim_matches('"').to_string())
        .filter(|t| !t.is_empty())
        .collect()
}

fn token_is(tokens: &[String], names: &[&str]) -> bool {
    tokens.iter().any(|t| {
        let base = t.rsplit('/').next().unwrap_or(t);
        let base = base.trim_end_matches(".exe").trim_end_matches(".bin");
        names.iter().any(|n| base == *n)
    })
}

fn cwd_is_cursor_worktree(cwd: &str) -> bool {
    let c = slashy(cwd);
    c.contains("/.cursor/worktrees/") || c.contains("/.cursor/worktree/")
}

/// Classify a live process as a running coding-agent job.
/// Returns None for IDE helpers, browsers, and unrelated tools.
pub fn classify_job(name: &str, cmd: &str, exe: &str, cwd: &str) -> Option<Tool> {
    if is_self(name, cmd, exe) || is_browser(name) {
        return None;
    }

    let n = normalize_name(name);
    let tokens = cmd_tokens(cmd);
    let e = slashy(exe);
    let c = slashy(cmd);

    if n.contains("cursor-agent")
        || token_is(&tokens, &["cursor-agent", "cursor-agent-exec"])
        || c.contains("cursor-agent")
        || cwd_is_cursor_worktree(cwd)
    {
        return Some(Tool::Cursor);
    }

    // Claude Code CLI — not the Claude chat app.
    let is_claude_desktop = e.contains("claude.app/") && !c.contains("claude-code");
    if !is_claude_desktop
        && (n == "claude"
            || token_is(&tokens, &["claude"])
            || c.contains("@anthropic-ai/claude-code")
            || c.contains("claude-code"))
    {
        return Some(Tool::ClaudeCode);
    }

    if n == "opencode"
        || token_is(&tokens, &["opencode"])
        || c.contains("/opencode")
        || (c.contains("@opencode-ai") || c.contains("sst/opencode"))
    {
        if n == "opencode" || token_is(&tokens, &["opencode"]) || c.contains("opencode") {
            return Some(Tool::OpenCode);
        }
    }

    if n == "codex" || token_is(&tokens, &["codex"]) {
        return Some(Tool::Codex);
    }

    if n == "aider" || token_is(&tokens, &["aider"]) {
        return Some(Tool::Aider);
    }

    if n == "gemini" || token_is(&tokens, &["gemini"]) || c.contains("@google/gemini-cli") {
        return Some(Tool::GeminiCli);
    }

    if n == "goose" || token_is(&tokens, &["goose"]) {
        return Some(Tool::Goose);
    }

    if n == "crush" || token_is(&tokens, &["crush"]) {
        return Some(Tool::Crush);
    }

    if n == "amp" || token_is(&tokens, &["amp"]) || c.contains("@sourcegraph/amp") {
        // "amp" is a short token; require it to be the process or a path base.
        if n == "amp" || token_is(&tokens, &["amp"]) || c.contains("@sourcegraph/amp") {
            return Some(Tool::Amp);
        }
    }

    if n == "copilot" || token_is(&tokens, &["copilot"]) || c.contains("@github/copilot") {
        return Some(Tool::CopilotCli);
    }

    None
}

pub fn classify_presence(name: &str, exe: &str) -> Option<Tool> {
    let n = normalize_name(name);
    let e = slashy(exe);
    if is_cursor_ide(name, exe) {
        return Some(Tool::Cursor);
    }
    if n == "opencode" || e.contains("opencode.app/") {
        return Some(Tool::OpenCode);
    }
    if n == "codex" && (e.contains("codex.app/") || e.contains("/codex")) {
        return Some(Tool::Codex);
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn claude_code_cli_matches() {
        assert_eq!(
            classify_job("claude", "claude --permission-mode acceptEdits", "/usr/local/bin/claude", "/Users/a/proj"),
            Some(Tool::ClaudeCode)
        );
        assert_eq!(
            classify_job(
                "node",
                "node /Users/a/.npm/_npx/claude-code/cli.js",
                "/usr/local/bin/node",
                "/tmp/x"
            ),
            Some(Tool::ClaudeCode)
        );
    }

    #[test]
    fn claude_desktop_app_is_not_claude_code() {
        assert_eq!(
            classify_job(
                "Claude",
                "/Applications/Claude.app/Contents/MacOS/Claude",
                "/Applications/Claude.app/Contents/MacOS/Claude",
                "/"
            ),
            None
        );
    }

    #[test]
    fn cursor_helpers_are_not_jobs() {
        assert_eq!(
            classify_job(
                "Cursor Helper (GPU)",
                "Cursor Helper (GPU)",
                "/Applications/Cursor.app/Contents/Frameworks/Cursor Helper (GPU).app",
                "/"
            ),
            None
        );
        assert!(is_cursor_ide("Cursor", "/Applications/Cursor.app/Contents/MacOS/Cursor"));
        assert!(!is_cursor_ide("Cursor Helper", "/Applications/Cursor.app/Contents/Frameworks/x"));
    }

    #[test]
    fn cursor_agent_and_worktree_match() {
        assert_eq!(
            classify_job(
                "cursor-agent",
                "cursor-agent --workspace /tmp/app",
                "/usr/local/bin/cursor-agent",
                "/tmp/app"
            ),
            Some(Tool::Cursor)
        );
        assert_eq!(
            classify_job(
                "node",
                "node index.js",
                "/usr/bin/node",
                "/Users/a/proj/.cursor/worktrees/hotfix"
            ),
            Some(Tool::Cursor)
        );
    }

    #[test]
    fn opencode_and_codex_tokens() {
        assert_eq!(
            classify_job("opencode", "opencode serve", "/opt/opencode", "/repo"),
            Some(Tool::OpenCode)
        );
        assert_eq!(
            classify_job("codex", "codex exec", "/usr/bin/codex", "/repo"),
            Some(Tool::Codex)
        );
        assert_eq!(
            classify_job("dew", "dew", "/Applications/Dew.app/Contents/MacOS/dew", "/"),
            None
        );
    }

    #[test]
    fn tool_ids_round_trip() {
        assert_eq!(Tool::from_id("claude-code"), Some(Tool::ClaudeCode));
        assert_eq!(Tool::from_id("not-a-tool"), None);
        assert_eq!(Tool::all().len(), 10);
    }

    #[test]
    fn aider_gemini_and_terminals() {
        assert_eq!(
            classify_job("aider", "aider --model gpt-4o", "/usr/bin/aider", "/repo"),
            Some(Tool::Aider)
        );
        assert_eq!(
            classify_job("gemini", "gemini", "/usr/bin/gemini", "/repo"),
            Some(Tool::GeminiCli)
        );
        assert!(is_terminal("iTerm2"));
        assert!(is_terminal("WindowsTerminal"));
        assert_eq!(terminal_app_name("iTerm2"), "iTerm2");
    }
}
