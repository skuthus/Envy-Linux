-- Envy on Hyprland (Omarchy Lua config).
--
-- Ctrl+Alt+Return (the same chord as Envy for Windows) shows Envy if it is
-- hidden and hides it if it is showing — exactly the bar icon's click — and
-- launches it if it isn't running. Wayland has no app-registered global
-- hotkeys, so this bind *is* the summon; it runs `envy-linux --toggle`, which
-- hands the verb to the running instance over its control socket.
--
-- Install: append to ~/.config/hypr/bindings.lua
--   pcall(dofile, os.getenv("HOME") .. "/Work/Envy-omarchy/linux/hyprland-envy.lua")
-- then `hyprctl reload`. Edit the path below if the checkout moves.

local envy_summon = os.getenv("HOME") .. "/Work/Envy-omarchy/linux/envy-summon.sh"

-- Match on class AND title: pop-out notes and the pinned popover share the
-- `envy-linux` class, and those should stay ordinary windows.
o.window({ class = "envy-linux", title = "^Envy$" }, {
  float = true,
  -- The owner's chosen default: about a third of the screen wide and most
  -- of it tall (507x739 on a 1440x900 display).
  size = { "(monitor_w*0.35)", "(monitor_h*0.82)" },
  center = true,
})

-- Omarchy's default window opacity (0.985 / 0.96) multiplies every glyph.
-- Drop it so Envy can be as sharp as an opaque terminal.
o.window("envy-linux", {
  tag = "-default-opacity",
  opacity = "1 override 1 override 1 override",
})

o.bind("CTRL + ALT + RETURN", "Envy", envy_summon)
-- Drag it around, then bring it back: centres whichever floating window has
-- focus, so it serves any floating window, Envy included.
o.bind("CTRL + ALT + C", "Centre the floating window", hl.dsp.window.center())
