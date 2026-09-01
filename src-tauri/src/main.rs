// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(target_os = "linux")]
    linux_webkit_workarounds();
    #[cfg(target_os = "linux")]
    linux_font_rendering();
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

/// Snap FreeType to full-hinted LCD rasterization before GTK/WebKit start.
/// FONTCONFIG_FILE replaces the config search path, so the file we write
/// includes /etc/fonts/fonts.conf and therefore the user's Omarchy prepend.
#[cfg(target_os = "linux")]
fn linux_font_rendering() {
    use std::path::PathBuf;

    if std::env::var_os("FONTCONFIG_FILE").is_none() {
        // The runtime dir is per-user and 0700. `temp_dir()` is neither: on a
        // shared machine anyone could pre-create the file we are about to point
        // FONTCONFIG_FILE at, and fontconfig would load their rules into this
        // process. Fall back to our own cache dir instead, and if even that
        // can't be made, leave the override off rather than write somewhere
        // world-writable — the app just gets the system's font settings.
        let dir = std::env::var_os("XDG_RUNTIME_DIR").map(PathBuf::from).or_else(|| {
            let cache = dirs::cache_dir()?.join("app.envynote.linux");
            std::fs::create_dir_all(&cache).ok()?;
            Some(cache)
        });
        if let Some(path) = dir.map(|d| d.join("envy-fontconfig.conf")) {
            if std::fs::write(&path, include_str!("../../linux/fonts.conf")).is_ok() {
                // SAFETY: main thread, before other threads exist.
                unsafe { std::env::set_var("FONTCONFIG_FILE", &path) };
            }
        }
    }

    if std::env::var_os("FREETYPE_PROPERTIES").is_none() {
        // v40 is the subpixel interpreter; stem darkening fattens glyphs and
        // reads as blur at 15px on a 1× panel.
        unsafe {
            std::env::set_var(
                "FREETYPE_PROPERTIES",
                "truetype:interpreter-version=40 cff:no-stem-darkening=1 autofitter:no-stem-darkening=1",
            )
        };
    }
}
