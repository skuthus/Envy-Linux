-- Envy on Hyprland (Omarchy Lua config).
--
-- Summon = a scratchpad: Envy lives on special workspace "envy", floating and
-- centred, and Ctrl+Alt+Return (the same chord as Envy for Windows) slides it
-- in and out. If Envy isn't running the bind launches it. Wayland has no
-- app-registered global hotkeys, so this bind *is* the summon.
--
-- Install: append to ~/.config/hypr/bindings.lua (or `require` this file),
-- then `hyprctl reload`. Edit the path below if the checkout moves.

local envy_summon = os.getenv("HOME") .. "/Work/Envy-Linux/linux/envy-summon.sh"

-- Match on class AND title: pop-out notes and the pinned popover share the
-- `envy-linux` class, and those should stay ordinary windows.
o.window({ class = "envy-linux", title = "^Envy$" }, {
  float = true,
  size = { "(monitor_w*0.62)", "(monitor_h*0.72)" },
  center = true,
  workspace = "special:envy silent",
})

-- Omarchy's default window opacity (0.985 / 0.96) multiplies every glyph.
-- Drop it so Envy can be as sharp as an opaque terminal.
o.window("envy-linux", {
  tag = "-default-opacity",
  opacity = "1 override 1 override 1 override",
})

o.bind("CTRL + ALT + RETURN", "Envy", envy_summon)
