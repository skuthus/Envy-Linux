// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(target_os = "linux")]
    linux_webkit_workarounds();
    envy_linux_lib::run()
}

/// WebKitGTK's DMA-BUF renderer does not get along with the proprietary NVIDIA
/// driver under Wayland: the very first frame fails with "Error 71 (Protocol
/// error) dispatching to Wayland display" and GDK aborts the process before a
/// window ever appears. Measured on this project's own machine (RTX 3060 Ti,
/// Hyprland, webkit2gtk-4.1 2.52): the app dies at launch without the flag and
/// runs normally with it. WebKit falls back to its shared-memory path, which
/// is slower but correct.
///
/// Only applied when the NVIDIA kernel module is loaded, and only if the user
/// has not already set the variable themselves, so Mesa systems keep the fast
/// path and an explicit override always wins.
#[cfg(target_os = "linux")]
fn linux_webkit_workarounds() {
    const VAR: &str = "WEBKIT_DISABLE_DMABUF_RENDERER";
    if std::env::var_os(VAR).is_some() {
        return;
    }
    if std::path::Path::new("/sys/module/nvidia").exists() {
        // SAFETY: called on the main thread before any other thread exists, so
        // nothing can be reading the environment concurrently.
        unsafe { std::env::set_var(VAR, "1") };
    }
}
