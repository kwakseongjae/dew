use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Default)]
#[allow(dead_code)]
pub struct GitInfo {
    pub root: Option<PathBuf>,
    pub repo: Option<String>,
    pub branch: Option<String>,
    pub worktree: Option<String>,
}

pub fn git_info(start: &Path) -> GitInfo {
    let Some(root) = find_git_root(start) else {
        return GitInfo::default();
    };
    let repo = root
        .file_name()
        .map(|s| s.to_string_lossy().into_owned());
    let (branch, worktree) = read_head(&root);
    let worktree = worktree.or_else(|| cursor_worktree_name(start));
    GitInfo {
        root: Some(root),
        repo,
        branch,
        worktree,
    }
}

pub fn find_git_root(start: &Path) -> Option<PathBuf> {
    let mut cur = if start.is_dir() {
        start.to_path_buf()
    } else {
        start.parent()?.to_path_buf()
    };
    loop {
        if cur.join(".git").exists() {
            return Some(cur);
        }
        if !cur.pop() {
            return None;
        }
    }
}

fn read_head(root: &Path) -> (Option<String>, Option<String>) {
    let git_path = root.join(".git");
    if git_path.is_file() {
        let Ok(text) = fs::read_to_string(&git_path) else {
            return (None, None);
        };
        let gitdir = text.lines().find_map(|l| {
            l.strip_prefix("gitdir:")
                .map(|s| PathBuf::from(s.trim()))
        });
        let Some(gitdir) = gitdir else {
            return (None, None);
        };
        let worktree = gitdir
            .components()
            .collect::<Vec<_>>()
            .windows(2)
            .find(|w| w[0].as_os_str() == "worktrees")
            .map(|w| w[1].as_os_str().to_string_lossy().into_owned())
            .or_else(|| {
                if gitdir
                    .to_string_lossy()
                    .replace('\\', "/")
                    .contains("/worktrees/")
                {
                    gitdir.file_name().map(|s| s.to_string_lossy().into_owned())
                } else {
                    None
                }
            });
        let head = fs::read_to_string(gitdir.join("HEAD")).ok();
        (head.as_deref().and_then(parse_head), worktree)
    } else if git_path.is_dir() {
        let head = fs::read_to_string(git_path.join("HEAD")).ok();
        (head.as_deref().and_then(parse_head), None)
    } else {
        (None, None)
    }
}

fn parse_head(head: &str) -> Option<String> {
    let head = head.trim();
    if let Some(rest) = head.strip_prefix("ref: refs/heads/") {
        return Some(rest.trim().to_string());
    }
    if let Some(rest) = head.strip_prefix("ref:") {
        return rest
            .trim()
            .rsplit('/')
            .next()
            .map(|s| s.to_string());
    }
    if head.len() >= 7 && head.chars().all(|c| c.is_ascii_hexdigit()) {
        return Some(head[..7].to_string());
    }
    None
}

fn cursor_worktree_name(cwd: &Path) -> Option<String> {
    let s = cwd.to_string_lossy().replace('\\', "/");
    if let Some(idx) = s.find("/.cursor/worktrees/") {
        let rest = &s[idx + "/.cursor/worktrees/".len()..];
        let name = rest.split('/').next().unwrap_or("");
        if !name.is_empty() {
            return Some(name.to_string());
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn reads_branch_from_git_dir() {
        let dir = std::env::temp_dir().join(format!("dew-git-{}", std::process::id()));
        let git = dir.join(".git");
        fs::create_dir_all(git.join("refs/heads")).unwrap();
        fs::write(git.join("HEAD"), "ref: refs/heads/feat/login\n").unwrap();
        let info = git_info(&dir);
        assert_eq!(info.branch.as_deref(), Some("feat/login"));
        assert_eq!(info.repo.as_deref(), dir.file_name().unwrap().to_str());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn reads_worktree_gitdir_file() {
        let dir = std::env::temp_dir().join(format!("dew-wt-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let mut gitfile = fs::File::create(dir.join(".git")).unwrap();
        let gitdir = dir.join("common/.git/worktrees/hotfix");
        fs::create_dir_all(&gitdir).unwrap();
        fs::write(gitdir.join("HEAD"), "ref: refs/heads/hotfix\n").unwrap();
        writeln!(gitfile, "gitdir: {}", gitdir.display()).unwrap();
        let info = git_info(&dir);
        assert_eq!(info.branch.as_deref(), Some("hotfix"));
        assert_eq!(info.worktree.as_deref(), Some("hotfix"));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn parse_detached_and_branch() {
        assert_eq!(parse_head("ref: refs/heads/main\n").as_deref(), Some("main"));
        assert_eq!(parse_head("abcdef0123456789").as_deref(), Some("abcdef0"));
    }
}
