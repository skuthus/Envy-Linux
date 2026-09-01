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

o.window("envy-linux", {
  float = true,
  size = { "(monitor_w*0.62)", "(monitor_h*0.72)" },
  center = true,
  workspace = "special:envy silent",
})

o.bind("CTRL + ALT + RETURN", "Envy", envy_summon)
