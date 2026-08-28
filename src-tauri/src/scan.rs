use crate::classify::{
    classify_job, classify_presence, is_terminal, terminal_app_name, Tool,
};
use crate::detect::installed_hits;
use crate::gitinfo::git_info;
use crate::types::{AgentGroup, DetectedTool, FocusHint, Settings, Snapshot, now_ms};
use crate::usage::read_usage;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::Mutex;
use sysinfo::{Pid, ProcessesToUpdate, System};

const FINISHED_TTL_MS: u64 = 12 * 60 * 1000;

#[derive(Debug, Clone)]
pub(crate) struct LiveJob {
    tool: Tool,
    pid: u32,
    repo: Option<String>,
    branch: Option<String>,
    worktree: Option<String>,
    focus: FocusHint,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinishedJob {
    pub id: String,
    pub tool: String,
    pub display_name: String,
    pub repo: Option<String>,
    pub branch: Option<String>,
    pub worktree: Option<String>,
    pub pid: u32,
    pub focus: FocusHint,
    pub finished_at_ms: u64,
    pub dismissed: bool,
}

#[derive(Default)]
pub struct Tracker {
    prev: HashMap<u32, LiveJob>,
    finished: Vec<FinishedJob>,
}

impl Tracker {
    pub fn ingest(&mut self, live: &[LiveJob], followed: &HashSet<String>, now: u64) {
        let tracked_pids: HashSet<u32> = live
            .iter()
            .filter(|job| followed.contains(job.tool.id()))
            .map(|job| job.pid)
            .collect();

        for (pid, job) in self.prev.iter() {
            if !followed.contains(job.tool.id()) {
                continue;
            }
            if !tracked_pids.contains(pid) {
                self.finished.push(FinishedJob {
                    id: format!("done-{}-{pid}-{now}", job.tool.id()),
                    tool: job.tool.id().into(),
                    display_name: job.tool.display_name().into(),
                    repo: job.repo.clone(),
                    branch: job.branch.clone(),
                    worktree: job.worktree.clone(),
                    pid: *pid,
                    focus: job.focus.clone(),
                    finished_at_ms: now,
                    dismissed: false,
                });
            }
        }

        self.prev = live
            .iter()
            .filter(|job| followed.contains(job.tool.id()))
            .map(|job| (job.pid, job.clone()))
            .collect();

        self.finished.retain(|job| {
            followed.contains(&job.tool)
                && now.saturating_sub(job.finished_at_ms) < FINISHED_TTL_MS
        });
    }

    pub fn dismiss(&mut self, id: &str) {
        for job in &mut self.finished {
            if job.id == id {
                job.dismissed = true;
            }
        }
    }

    pub fn active_finished(&self) -> impl Iterator<Item = &FinishedJob> {
        self.finished.iter().filter(|job| !job.dismissed)
    }
}

pub struct AppScan {
    pub system: Mutex<System>,
    pub tracker: Mutex<Tracker>,
}

impl AppScan {
    pub fn new() -> Self {
        Self {
            system: Mutex::new(System::new()),
            tracker: Mutex::new(Tracker::default()),
        }
    }
}

pub fn scan(state: &AppScan, settings: &Settings) -> Snapshot {
    if settings.sample_layout {
        return sample_snapshot(&settings.usage_period, &settings.followed_tools);
    }

    let mut sys = state.system.lock().expect("system mutex");
    sys.refresh_processes(ProcessesToUpdate::All, true);
    let now = now_ms();

    let mut live: Vec<LiveJob> = Vec::new();
    let mut presence: HashMap<Tool, FocusHint> = HashMap::new();
    let mut process_count: u32 = 0;

    for (pid, proc) in sys.processes() {
        process_count += 1;
        let name = proc.name().to_string_lossy().into_owned();
        let cmd = proc
            .cmd()
            .iter()
            .map(|s| s.to_string_lossy().into_owned())
            .collect::<Vec<_>>()
            .join(" ");
        let exe = proc
            .exe()
            .map(|p| p.to_string_lossy().into_owned())
            .unwrap_or_default();
        let cwd = proc.cwd().map(|p| p.to_path_buf());
        let cwd_str = cwd
            .as_ref()
            .map(|p| p.to_string_lossy().into_owned())
            .unwrap_or_default();

        if let Some(tool) = classify_presence(&name, &exe) {
            presence.entry(tool).or_insert(FocusHint {
                kind: "app".into(),
                app_name: Some(tool.display_name().into()),
                pid: Some(pid.as_u32()),
                window_title: None,
            });
        }

        let Some(tool) = classify_job(&name, &cmd, &exe, &cwd_str) else {
            continue;
        };

        let git = cwd.as_deref().map(git_info).unwrap_or_default();
        let repo = git.repo.or_else(|| {
            cwd.as_ref()
                .and_then(|p| p.file_name().map(|s| s.to_string_lossy().into_owned()))
        });
        let focus = focus_for(tool, pid.as_u32(), &name, proc.parent(), &sys);
        live.push(LiveJob {
            tool,
            pid: pid.as_u32(),
            repo,
            branch: git.branch,
            worktree: git.worktree,
            focus,
        });
    }

    drop(sys);

    let followed: HashSet<String> = settings
        .followed_tools
        .iter()
        .filter(|id| Tool::from_id(id).is_some())
        .cloned()
        .collect();
    let mut tracker = state.tracker.lock().expect("tracker mutex");
    tracker.ingest(&live, &followed, now);
    let finished: Vec<FinishedJob> = tracker.active_finished().cloned().collect();
    drop(tracker);

    let detected_tools = build_detected(&live, &presence, &followed);
    let mut groups = session_rows(&live, &finished, &followed);
    groups.sort_by(|a, b| {
        status_rank(&a.status)
            .cmp(&status_rank(&b.status))
            .then(a.display_name.cmp(&b.display_name))
            .then(a.pid.unwrap_or(0).cmp(&b.pid.unwrap_or(0)))
    });

    let active_jobs = groups.iter().filter(|g| g.status == "running").count() as u32;
    let live_agent_tools = {
        let mut set = HashSet::new();
        for group in &groups {
            if group.status == "running" {
                set.insert(group.tool.as_str());
            }
        }
        set.len() as u32
    };

    let mut notes = vec![format!("Scanned {process_count} processes.")];
    if !settings.onboarded {
        notes.push("Tap Scan and connect to follow local coding agents.".into());
    } else if live
        .iter()
        .all(|job| !followed.contains(job.tool.id()))
        && groups.is_empty()
    {
        notes.push("No running sessions for the tools you follow. Empty is honest.".into());
    }

    Snapshot {
        scanned_at_ms: now,
        sample: false,
        groups,
        detected_tools,
        usage: read_usage(&settings.usage_period),
        live_agent_tools,
        active_jobs,
        process_count,
        notes,
    }
}

fn status_rank(status: &str) -> u8 {
    match status {
        "running" => 0,
        "done" => 1,
        _ => 2,
    }
}

fn focus_for(tool: Tool, pid: u32, name: &str, parent: Option<Pid>, sys: &System) -> FocusHint {
    let mut walk = parent;
    let mut hops = 0;
    while let Some(ppid) = walk {
        hops += 1;
        if hops > 8 {
            break;
        }
        let Some(proc) = sys.process(ppid) else {
            break;
        };
        let pname = proc.name().to_string_lossy().into_owned();
        if is_terminal(&pname) {
            return FocusHint {
                kind: "pid".into(),
                app_name: Some(terminal_app_name(&pname)),
                pid: Some(ppid.as_u32()),
                window_title: None,
            };
        }
        walk = proc.parent();
    }
    if let Some(app) = tool.host_app_name() {
        return FocusHint {
            kind: "app".into(),
            app_name: Some(app.into()),
            pid: Some(pid),
            window_title: None,
        };
    }
    FocusHint {
        kind: "pid".into(),
        app_name: Some(name.into()),
        pid: Some(pid),
        window_title: None,
    }
}

fn host_of(focus: &FocusHint) -> Option<String> {
    focus.app_name.clone()
}

fn session_rows(live: &[LiveJob], finished: &[FinishedJob], followed: &HashSet<String>) -> Vec<AgentGroup> {
    let mut rows = Vec::new();
    for job in live {
        if !followed.contains(job.tool.id()) {
            continue;
        }
        let mut group = AgentGroup {
            id: format!("live-{}-{}", job.tool.id(), job.pid),
            tool: job.tool.id().into(),
            display_name: job.tool.display_name().into(),
            repo: job.repo.clone(),
            branch: job.branch.clone(),
            worktree: job.worktree.clone(),
            pid: Some(job.pid),
            host: host_of(&job.focus),
            jobs: 1,
            status: "running".into(),
            pids: vec![job.pid],
            focus: job.focus.clone(),
            detail: String::new(),
            finished_at_ms: None,
            has_finished: false,
        };
        group.detail = detail_line(&group);
        rows.push(group);
    }
    for job in finished {
        if !followed.contains(&job.tool) {
            continue;
        }
        let mut group = AgentGroup {
            id: job.id.clone(),
            tool: job.tool.clone(),
            display_name: job.display_name.clone(),
            repo: job.repo.clone(),
            branch: job.branch.clone(),
            worktree: job.worktree.clone(),
            pid: Some(job.pid),
            host: host_of(&job.focus),
            jobs: 0,
            status: "done".into(),
            pids: vec![job.pid],
            focus: job.focus.clone(),
            detail: String::new(),
            finished_at_ms: Some(job.finished_at_ms),
            has_finished: true,
        };
        group.detail = detail_line(&group);
        rows.push(group);
    }
    rows
}

fn build_detected(
    live: &[LiveJob],
    presence: &HashMap<Tool, FocusHint>,
    followed: &HashSet<String>,
) -> Vec<DetectedTool> {
    let mut map: HashMap<Tool, DetectedTool> = HashMap::new();

    for hit in installed_hits() {
        map.entry(hit.tool).or_insert_with(|| DetectedTool {
            id: hit.tool.id().into(),
            display_name: hit.tool.display_name().into(),
            installed: true,
            running_sessions: 0,
            followed: followed.contains(hit.tool.id()),
            source: hit.source,
        });
    }

    for job in live {
        let entry = map.entry(job.tool).or_insert_with(|| DetectedTool {
            id: job.tool.id().into(),
            display_name: job.tool.display_name().into(),
            installed: true,
            running_sessions: 0,
            followed: followed.contains(job.tool.id()),
            source: format!("running pid {}", job.pid),
        });
        entry.installed = true;
        entry.running_sessions += 1;
        entry.followed = followed.contains(job.tool.id());
    }

    for tool in presence.keys() {
        map.entry(*tool).or_insert_with(|| DetectedTool {
            id: tool.id().into(),
            display_name: tool.display_name().into(),
            installed: true,
            running_sessions: 0,
            followed: followed.contains(tool.id()),
            source: format!("{} app", tool.display_name()),
        });
    }

    let mut tools: Vec<DetectedTool> = map.into_values().collect();
    tools.sort_by(|a, b| {
        tool_rank(&a.id)
            .cmp(&tool_rank(&b.id))
            .then(a.display_name.cmp(&b.display_name))
    });
    tools
}

fn tool_rank(id: &str) -> u8 {
    match id {
        "cursor" => 0,
        "opencode" => 1,
        "claude-code" => 2,
        "codex" => 3,
        _ => 8,
    }
}

fn detail_line(g: &AgentGroup) -> String {
    let loc = if let Some(wt) = g.worktree.as_deref() {
        format!("on worktree/{wt}")
    } else if let Some(branch) = g.branch.as_deref() {
        format!("on {branch}")
    } else if let Some(repo) = g.repo.as_deref() {
        format!("in {repo}")
    } else {
        String::new()
    };
    let host = g.host.as_deref().unwrap_or("");
    let suffix = if g.status == "done" || g.has_finished && g.jobs == 0 {
        "done"
    } else if !host.is_empty() {
        host
    } else if let Some(pid) = g.pid {
        return if loc.is_empty() {
            format!("session · pid {pid}")
        } else {
            format!("{loc} · pid {pid}")
        };
    } else {
        "session"
    };
    if loc.is_empty() {
        suffix.to_string()
    } else {
        format!("{loc} · {suffix}")
    }
}

fn sample_snapshot(period: &str, followed_tools: &[String]) -> Snapshot {
    let now = now_ms();
    let inherent_followed: HashSet<String> = ["cursor", "opencode", "claude-code"]
        .into_iter()
        .map(String::from)
        .collect();
    let followed: HashSet<String> = if followed_tools.is_empty() {
        inherent_followed
    } else {
        followed_tools.iter().cloned().collect()
    };

    let mut groups = vec![
        sample_session(
            "live-claude-code-4101",
            "claude-code",
            "Claude Code",
            "hotfix",
            Some("hotfix"),
            4101,
            "iTerm2",
            "running",
            false,
        ),
        sample_session(
            "live-claude-code-4102",
            "claude-code",
            "Claude Code",
            "main",
            None,
            4102,
            "Terminal",
            "running",
            false,
        ),
        sample_session(
            "live-claude-code-4103",
            "claude-code",
            "Claude Code",
            "login",
            Some("login"),
            4103,
            "Warp",
            "running",
            true,
        ),
        sample_session(
            "live-cursor-2201",
            "cursor",
            "Cursor",
            "main",
            None,
            2201,
            "Cursor",
            "running",
            false,
        ),
        sample_session(
            "live-opencode-3301",
            "opencode",
            "OpenCode",
            "feat/login",
            None,
            3301,
            "OpenCode",
            "running",
            false,
        ),
    ];
    groups.retain(|g| followed.contains(&g.tool));
    if followed.contains("claude-code") {
        if let Some(done) = groups.iter_mut().find(|g| g.id == "live-claude-code-4103") {
            done.status = "done".into();
            done.jobs = 0;
            done.has_finished = true;
            done.detail = detail_line(done);
        }
    }

    let detected_tools = sample_detected(&followed);
    let active_jobs = groups.iter().filter(|g| g.status == "running").count() as u32;
    let live_agent_tools = {
        let mut set = HashSet::new();
        for group in &groups {
            if group.status == "running" {
                set.insert(group.tool.clone());
            }
        }
        set.len() as u32
    };

    Snapshot {
        scanned_at_ms: now,
        sample: true,
        live_agent_tools,
        active_jobs,
        process_count: 0,
        notes: vec!["Sample layout — not live process data.".into()],
        usage: vec![UsageSourceSample::cursor(period)],
        groups,
        detected_tools,
    }
}

fn sample_detected(followed: &HashSet<String>) -> Vec<DetectedTool> {
    vec![
        DetectedTool {
            id: "cursor".into(),
            display_name: "Cursor".into(),
            installed: true,
            running_sessions: 1,
            followed: followed.contains("cursor"),
            source: "Sample layout".into(),
        },
        DetectedTool {
            id: "opencode".into(),
            display_name: "OpenCode".into(),
            installed: true,
            running_sessions: 1,
            followed: followed.contains("opencode"),
            source: "Sample layout".into(),
        },
        DetectedTool {
            id: "claude-code".into(),
            display_name: "Claude Code".into(),
            installed: true,
            running_sessions: 2,
            followed: followed.contains("claude-code"),
            source: "Sample layout".into(),
        },
        DetectedTool {
            id: "codex".into(),
            display_name: "Codex".into(),
            installed: true,
            running_sessions: 0,
            followed: followed.contains("codex"),
            source: "Sample layout".into(),
        },
    ]
}

#[allow(clippy::too_many_arguments)]
fn sample_session(
    id: &str,
    tool: &str,
    display: &str,
    branch: &str,
    worktree: Option<&str>,
    pid: u32,
    host: &str,
    status: &str,
    has_finished: bool,
) -> AgentGroup {
    let mut g = AgentGroup {
        id: id.into(),
        tool: tool.into(),
        display_name: display.into(),
        repo: Some("dew".into()),
        branch: Some(branch.into()),
        worktree: worktree.map(|s| s.into()),
        pid: Some(pid),
        host: Some(host.into()),
        jobs: if status == "running" { 1 } else { 0 },
        status: status.into(),
        pids: vec![pid],
        focus: FocusHint {
            kind: "app".into(),
            app_name: Some(host.into()),
            pid: Some(pid),
            window_title: None,
        },
        detail: String::new(),
        finished_at_ms: if has_finished { Some(now_ms()) } else { None },
        has_finished,
    };
    g.detail = detail_line(&g);
    g
}

struct UsageSourceSample;
impl UsageSourceSample {
    fn cursor(period: &str) -> crate::types::UsageSource {
        crate::types::UsageSource {
            tool: "cursor".into(),
            display_name: "Cursor".into(),
            available: true,
            reason: Some("Sample layout — not your live usage.".into()),
            period: period.into(),
            cap_seconds: Some(5 * 3600),
            used_seconds: Some(90 * 60),
            cap_label: Some("5h".into()),
            daily_seconds: Some(vec![
                Some(20 * 60),
                Some(35 * 60),
                Some(95 * 60),
                Some(18 * 60),
                Some(28 * 60),
                Some(55 * 60),
                Some(40 * 60),
            ]),
            byok: false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn job(pid: u32) -> LiveJob {
        LiveJob {
            tool: Tool::ClaudeCode,
            pid,
            repo: Some("dew".into()),
            branch: Some("hotfix".into()),
            worktree: Some("hotfix".into()),
            focus: FocusHint {
                kind: "pid".into(),
                app_name: Some("iTerm2".into()),
                pid: Some(pid),
                window_title: None,
            },
        }
    }

    #[test]
    fn three_same_tool_sessions_are_not_rolled_up() {
        let live = vec![job(11), job(12), job(13)];
        let followed = HashSet::from(["claude-code".into()]);
        let rows = session_rows(&live, &[], &followed);
        assert_eq!(rows.len(), 3);
        assert!(rows.iter().all(|row| row.jobs == 1));
        assert!(rows.iter().all(|row| row.tool == "claude-code"));
        let pids: HashSet<_> = rows.iter().filter_map(|row| row.pid).collect();
        assert_eq!(pids.len(), 3);
    }

    #[test]
    fn finishing_one_session_stays_independent() {
        let live = vec![job(12), job(13)];
        let finished = vec![FinishedJob {
            id: "done-1".into(),
            tool: "claude-code".into(),
            display_name: "Claude Code".into(),
            repo: Some("dew".into()),
            branch: Some("hotfix".into()),
            worktree: Some("hotfix".into()),
            pid: 11,
            focus: FocusHint::default(),
            finished_at_ms: 1,
            dismissed: false,
        }];
        let followed = HashSet::from(["claude-code".into()]);
        let rows = session_rows(&live, &finished, &followed);
        assert_eq!(rows.len(), 3);
        assert_eq!(rows.iter().filter(|row| row.status == "running").count(), 2);
        assert_eq!(rows.iter().filter(|row| row.has_finished && row.jobs == 0).count(), 1);
    }

    #[test]
    fn unfollowed_tool_does_not_appear() {
        let live = vec![job(11)];
        let followed = HashSet::from(["cursor".into()]);
        let rows = session_rows(&live, &[], &followed);
        assert!(rows.is_empty());
    }

    #[test]
    fn unchecking_a_tool_does_not_fire_done() {
        let mut tracker = Tracker::default();
        let live = vec![job(11)];
        let followed_on = HashSet::from(["claude-code".into()]);
        tracker.ingest(&live, &followed_on, 10);
        let followed_off = HashSet::new();
        tracker.ingest(&[], &followed_off, 20);
        assert_eq!(tracker.active_finished().count(), 0);
    }
}
