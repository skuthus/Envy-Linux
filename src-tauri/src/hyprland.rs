//! The Hyprland side of the summon: one line in the user's bindings file.
//!
//! Wayland has no app-registered global hotkeys, so Ctrl+Alt+Return only works
//! as a compositor bind, and the float rule that makes Envy a centred panel
//! lives in the same Lua file (`linux/hyprland-envy.lua`, installed to
//! `/usr/share/envy`). Loading that file takes one `pcall(dofile, ...)` line
//! in `~/.config/hypr/bindings.lua`. The `system.hyprland_bind` setting puts
//! that line there and takes it away again; nothing here runs unless the
//! setting is toggled or disagrees with the file at launch.

use std::path::{Path, PathBuf};

/// Marks the line as ours. Only a line carrying it is ever removed: a user
/// who wrote their own `dofile` line, the way the README first described, keeps
/// it whatever the setting says.
const MARKER: &str = "-- managed by Envy Settings";

fn home() -> Option<PathBuf> {
    std::env::var_os("HOME").map(PathBuf::from)
}

pub fn bindings_file() -> Option<PathBuf> {
    home().map(|h| h.join(".config/hypr/bindings.lua"))
}

/// The Lua file to load: the package's copy, else the checkout's.
pub fn lua_source() -> Option<PathBuf> {
    let packaged = PathBuf::from("/usr/share/envy/hyprland-envy.lua");
    if packaged.is_file() {
        return Some(packaged);
    }
    let checkout = Path::new(env!("CARGO_MANIFEST_DIR")).join("../linux/hyprland-envy.lua");
    checkout.is_file().then(|| checkout.canonicalize().unwrap_or(checkout))
}

fn managed_line(source: &Path) -> String {
    format!("pcall(dofile, \"{}\") {MARKER}", source.display())
}

/// Whether any line loads the Envy file, ours or the user's own.
pub fn mentions_envy(text: &str) -> bool {
    text.lines().any(|l| l.contains("hyprland-envy.lua") && !l.trim_start().starts_with("--"))
}

fn has_managed_line(text: &str) -> bool {
    text.lines().any(|l| l.contains(MARKER))
}

/// The bindings file as it should read with the setting `wanted`, or `None`
/// when nothing needs to change.
pub fn updated(text: &str, wanted: bool, source: &Path) -> Option<String> {
    if wanted {
        if mentions_envy(text) {
            return None;
        }
        let mut out = text.to_string();
        if !out.is_empty() && !out.ends_with('\n') {
            out.push('\n');
        }
        out.push_str("\n-- Envy: Ctrl+Alt+Return shows/hides the note app; Ctrl+Alt+C centres it.\n");
        out.push_str(&managed_line(source));
        out.push('\n');
        Some(out)
    } else {
        if !has_managed_line(text) {
            return None;
        }
        let mut kept: Vec<&str> = text
            .lines()
            .filter(|l| !l.contains(MARKER) && !l.starts_with("-- Envy: Ctrl+Alt+Return shows/hides"))
            .collect();
        // The blank line that set our block apart goes with it.
        while kept.last().is_some_and(|l| l.trim().is_empty()) {
            kept.pop();
        }
        let mut out = kept.join("\n");
        if !out.is_empty() {
            out.push('\n');
        }
        Some(out)
    }
}

/// Brings the bindings file in line with the setting and reloads Hyprland
/// when it changed. A missing bindings file is created only to turn the
/// setting on; turning it off with no file is nothing to do.
pub fn apply(wanted: bool) {
    let (Some(file), Some(source)) = (bindings_file(), lua_source()) else { return };
    let text = match std::fs::read_to_string(&file) {
        Ok(t) => t,
        Err(_) if wanted && file.parent().is_some_and(|d| d.is_dir()) => String::new(),
        Err(_) => return,
    };
    let Some(next) = updated(&text, wanted, &source) else { return };
    if std::fs::write(&file, next).is_ok() {
        let _ = std::process::Command::new("hyprctl")
            .arg("reload")
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn src() -> PathBuf {
        PathBuf::from("/usr/share/envy/hyprland-envy.lua")
    }

    #[test]
    fn adds_one_marked_line_and_removes_only_it() {
        let base = "o.bind(\"SUPER + Q\", \"Quit\", hl.dsp.killactive())\n";
        let on = updated(base, true, &src()).expect("added");
        assert!(on.starts_with(base));
        assert!(on.contains(MARKER));
        assert!(on.contains("pcall(dofile, \"/usr/share/envy/hyprland-envy.lua\")"));
        // Already there: nothing to do, in either direction of the same state.
        assert!(updated(&on, true, &src()).is_none());
        let off = updated(&on, false, &src()).expect("removed");
        assert_eq!(off, base);
        assert!(updated(&off, false, &src()).is_none());
    }

    #[test]
    fn leaves_a_hand_written_line_alone() {
        let theirs = "pcall(dofile, os.getenv(\"HOME\") .. \"/Work/Envy-omarchy/linux/hyprland-envy.lua\")\n";
        // On: theirs already loads the file, so no second copy.
        assert!(updated(theirs, true, &src()).is_none());
        // Off: it is not ours to remove.
        assert!(updated(theirs, false, &src()).is_none());
    }

    #[test]
    fn a_commented_out_mention_does_not_count() {
        let text = "-- pcall(dofile, \"/usr/share/envy/hyprland-envy.lua\")\n";
        assert!(updated(text, true, &src()).is_some());
    }
}
