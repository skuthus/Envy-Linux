# Envy bar widget for the Omarchy shell

Envy's eye in the bar, the way the Mac app sits in the menu bar. Envy installs
this plugin itself on launch (into `~/.config/omarchy/plugins/skuthus.envy/`),
enables it, and places it once; move it afterwards with `omarchy bar move` or
by editing `shell.json`, and Envy leaves it where you put it.

- **Eye:** open while Envy's window is on screen, squinting while only the
  pinned note is, closed while both are hidden — or while Envy isn't running.
- **Left click:** summon or hide Envy. With a note pinned, it opens the pinned
  note instead. When Envy isn't running, launches it.
- **Right click:** Envy's menu — New Note, New Pinned Note, templates, Keep on
  Top, Import from Kindle, Settings, Quit.

The widget draws Envy's StatusNotifierItem, which the app registers over
D-Bus; the same item is hidden from the tray widget so it isn't shown twice.
`launch.sh` is written by Envy and points at the binary that installed it.
