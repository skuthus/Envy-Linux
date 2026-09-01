import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

// Envy-Omarchy: Envy's named color roles, filled either from the current
// Omarchy theme (`colors.toml`) or from the Envious light/dark faces kept as
// a Settings override.
//
// Roles stay the same as Theme.swift so the styler doesn't care which palette
// is driving them:
//   blue/accent   wiki-links, and the note list's selected row
//   red           the editor's text selection, and overdue
//   green         tags and ticked checkboxes
//   yellow/amber  due-soon, and search matches

export const SYSTEM_UI_FONT = "system-ui, sans-serif"
export const MONO_FONT = "ui-monospace, monospace"

export interface EnvyTheme {
  /// Font is part of the theme on the Mac (`Theme.fontName` / `fontSize`) and
  /// applies to both faces — unlike colors, it isn't a light/dark concern.
  fontFamily: string
  /// Face for backticks and fenced blocks. Follows the UI font when that font
  /// is already mono (the Omarchy default); otherwise a dedicated mono stack.
  monoFamily: string
  fontSize: string
  text: string
  background: string
  marker: string
  link: string
  due: string
  dueSoon: string
  dueOverdue: string
  codeBackground: string
  tag: string
  tagBackground: string
  highlight: string
  /// Ink for text sitting on `highlight`.
  highlightText: string
  /// A vivid accent for a flag/count that should stand out from the ordinary
  /// link/due colours — the inbox badge. From the theme's magenta, which is
  /// where several Omarchy themes keep their brightest warm colour (a gold, in
  /// the monochrome-blue themes that make everything else blue).
  flag: string
  /// The note list's selection highlight.
  selection: string
  /// The editor's own text-selection background. A separate token from
  /// `selection` on purpose — they're different colors in Envious (blue for
  /// the list row, red for selected text).
  selectedText: string
  focusHighlight: string
  fileListBackground: string
  blockquote: string
  completedTask: string
  footnote: string
  checkedCheckbox: string
  titleBarBackground: string
}

export interface OmarchyAppearance {
  colors: Record<string, string>
  font: string
}

export const enviousDark: EnvyTheme = {
  fontFamily: SYSTEM_UI_FONT,
  monoFamily: MONO_FONT,
  // Sized to match the terminal's editor text on Linux rather than the Mac's
  // Segoe-tuned 15px.
  fontSize: '12px',
  text: 'rgba(255, 255, 255, 0.847)',
  background: 'rgb(29, 30, 31)',
  marker: 'rgba(255, 255, 255, 0.247)',
  link: 'rgb(90, 128, 255)',
  due: 'rgb(255, 255, 255)',
  dueSoon: 'rgb(255, 188, 0)',
  dueOverdue: 'rgb(255, 75, 57)',
  codeBackground: 'rgb(55, 55, 55)',
  tag: 'rgb(52, 199, 89)',
  tagBackground: 'rgba(48, 209, 88, 0.153)',
  highlight: 'rgb(255, 188, 0)',
  highlightText: 'rgb(32, 29, 24)',
  flag: 'rgb(255, 188, 0)',
  selection: 'rgb(90, 128, 255)',
  selectedText: 'rgb(255, 75, 57)',
  focusHighlight: 'rgba(152, 168, 217, 0.25)',
  fileListBackground: 'rgb(29, 30, 31)',
  blockquote: 'rgba(255, 255, 255, 0.549)',
  completedTask: 'rgba(255, 255, 255, 0.549)',
  footnote: 'rgba(255, 255, 255, 0.549)',
  checkedCheckbox: 'rgb(52, 199, 89)',
  titleBarBackground: 'rgb(38, 38, 38)',
}

export const enviousLight: EnvyTheme = {
  fontFamily: SYSTEM_UI_FONT,
  monoFamily: MONO_FONT,
  fontSize: '12px',
  text: 'rgba(0, 0, 0, 0.85)',
  background: 'rgb(250, 250, 248)',
  marker: 'rgba(0, 0, 0, 0.30)',
  link: 'rgb(27, 79, 216)',
  due: 'rgba(0, 0, 0, 0.85)',
  dueSoon: 'rgb(176, 124, 0)',
  dueOverdue: 'rgb(212, 42, 28)',
  codeBackground: 'rgb(240, 239, 234)',
  tag: 'rgb(23, 132, 58)',
  tagBackground: 'rgba(23, 132, 58, 0.13)',
  highlight: 'rgba(255, 188, 0, 0.55)',
  highlightText: 'rgb(32, 29, 24)',
  flag: 'rgb(176, 124, 0)',
  selection: 'rgba(27, 79, 216, 0.18)',
  selectedText: 'rgba(212, 42, 28, 0.22)',
  focusHighlight: 'rgba(96, 122, 176, 0.30)',
  fileListBackground: 'rgb(250, 250, 248)',
  blockquote: 'rgba(0, 0, 0, 0.55)',
  completedTask: 'rgba(0, 0, 0, 0.55)',
  footnote: 'rgba(0, 0, 0, 0.55)',
  checkedCheckbox: 'rgb(23, 132, 58)',
  titleBarBackground: 'rgb(240, 239, 234)',
}

/// The CSS property each theme key ends up feeding, so a value can be checked
/// before it is set. Everything not listed here is a colour.
const CSS_PROPERTY: Partial<Record<keyof EnvyTheme, string>> = {
  fontFamily: 'font-family',
  monoFamily: 'font-family',
  fontSize: 'font-size',
}

/// Omarchy's `colors.toml` is a file we don't own, so a value can be anything.
/// `setProperty` silently drops a value it can't parse, which would leave the
/// variable holding whatever the *previous* theme set — a half-applied palette
/// that's worse than no theme at all. Check first and fall back to the Envious
/// default for that same key instead.
export function applyTheme(theme: EnvyTheme, dark = true) {
  const root = document.documentElement.style
  const defaults = dark ? enviousDark : enviousLight
  for (const [key, value] of Object.entries(theme)) {
    const prop = CSS_PROPERTY[key as keyof EnvyTheme] ?? 'color'
    const safe = CSS.supports(prop, value) ? value : defaults[key as keyof EnvyTheme]
    root.setProperty(`--envy-${key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}`, safe)
  }
}

export function cssFontStack(family: string): string {
  const name = family.trim()
  if (!name) return MONO_FONT
  const quoted = /[\s,]/.test(name) && !name.startsWith('"') ? `"${name.replaceAll('"', '')}"` : name
  return `${quoted}, ui-monospace, monospace`
}

function pick(colors: Record<string, string>, keys: string[], fallback: string): string {
  for (const key of keys) {
    const value = colors[key]
    if (value) return value
  }
  return fallback
}

function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.trim().replace('#', '')
  const h =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw.slice(0, 6)
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return hex
  const r = Number.parseInt(h.slice(0, 2), 16)
  const g = Number.parseInt(h.slice(2, 4), 16)
  const b = Number.parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function toAlpha(color: string, alpha: number): string {
  const trimmed = color.trim()
  if (trimmed.startsWith('rgba(')) {
    return trimmed.replace(/rgba\(([^,]+),([^,]+),([^,]+),\s*[\d.]+\)/, `rgba($1,$2,$3, ${alpha})`)
  }
  if (trimmed.startsWith('rgb(')) {
    return trimmed.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`)
  }
  if (trimmed.startsWith('#')) return hexToRgba(trimmed, alpha)
  return color
}

function isLightMode(colors: Record<string, string>): boolean {
  const mode = (colors.mode ?? colors.theme_type ?? '').toLowerCase()
  return mode === 'light'
}

/// Hyprland blur only shows through if the surfaces themselves have alpha —
/// an opaque `rgb()` slab hides the wallpaper even with a transparent window.
function withSurfaceAlpha(theme: EnvyTheme, light: boolean): EnvyTheme {
  // High enough that glyph coverage doesn't mix with the wallpaper blur —
  // that's the usual "WebKit looks soft" look — but still short of opaque so
  // Hyprland blur remains visible in the chrome.
  const body = light ? 0.92 : 0.88
  const chrome = light ? 0.94 : 0.90
  const code = light ? 0.82 : 0.72
  return {
    ...theme,
    background: toAlpha(theme.background, body),
    fileListBackground: toAlpha(theme.fileListBackground, body),
    titleBarBackground: toAlpha(theme.titleBarBackground, chrome),
    codeBackground: toAlpha(theme.codeBackground, code),
  }
}

export function omarchyToEnvy(colors: Record<string, string>, fontFamily: string): EnvyTheme {
  const light = isLightMode(colors)
  const background = pick(colors, ['background', 'bg'], '#1a1b26')
  const foreground = pick(colors, ['foreground', 'fg'], '#c0caf5')
  const muted = pick(colors, ['muted', 'dark_foreground', 'dark_fg'], light ? '#6c6c6c' : '#565f89')
  const accent = pick(colors, ['accent', 'blue'], '#7aa2f7')
  const red = pick(colors, ['red'], '#f7768e')
  const green = pick(colors, ['green'], '#9ece6a')
  const yellow = pick(colors, ['yellow'], '#e0af68')
  const darker = pick(colors, ['dark_background', 'dark_bg', 'darker_background'], background)
  const lighter = pick(colors, ['lighter_background', 'lighter_bg'], light ? '#e8e8e8' : '#24283b')
  const bright = pick(colors, ['bright_foreground', 'bright_fg', 'light_foreground'], foreground)
  const darkFg = pick(colors, ['dark_foreground', 'dark_fg'], muted)

  return withSurfaceAlpha(
    {
      fontFamily,
      monoFamily: fontFamily,
      fontSize: '12px',
      text: foreground,
      background,
      marker: muted,
      link: accent,
      due: bright,
      dueSoon: yellow,
      dueOverdue: red,
      codeBackground: lighter,
      tag: green,
      tagBackground: hexToRgba(green.startsWith('#') ? green : '#9ece6a', 0.16),
      highlight: yellow,
      highlightText: darker,
      // The theme's most vivid warm accent. Several Omarchy themes keep it under
      // `magenta` (a gold in the monochrome-blue themes, a real magenta/pink in
      // colourful ones) — a genuine standout next to the blue link/due colours.
      flag: pick(colors, ['bright_magenta', 'magenta'], yellow),
      selection: light ? hexToRgba(accent.startsWith('#') ? accent : '#7aa2f7', 0.18) : accent,
      selectedText: light
        ? hexToRgba(red.startsWith('#') ? red : '#f7768e', 0.22)
        : hexToRgba(red.startsWith('#') ? red : '#f7768e', 0.45),
      focusHighlight: hexToRgba(accent.startsWith('#') ? accent : '#7aa2f7', 0.28),
      fileListBackground: darker,
      blockquote: darkFg,
      completedTask: darkFg,
      footnote: darkFg,
      checkedCheckbox: green,
      titleBarBackground: darker,
    },
    light,
  )
}

let omarchy: OmarchyAppearance | null = null
let appearanceListener: (() => void) | null = null

export function currentOmarchy(): OmarchyAppearance | null {
  return omarchy
}

export function setOmarchyAppearance(next: OmarchyAppearance) {
  omarchy = next
  appearanceListener?.()
}

function resolveFont(omarchyFont: string | undefined): string {
  const source = localStorage.getItem('uiFontSource') ?? 'omarchy'
  const custom = localStorage.getItem('uiFontCustom') ?? ''
  if (source === 'custom' && custom.trim()) return cssFontStack(custom)
  if (omarchyFont) return cssFontStack(omarchyFont)
  return MONO_FONT
}

function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function applyStoredAppearance() {
  const mode = localStorage.getItem('appearanceMode') ?? 'omarchy'
  const font = resolveFont(omarchy?.font)
  const omarchyReady = Boolean(omarchy?.colors?.background)
  const useOmarchy = (mode === 'omarchy' || !mode) && omarchyReady

  let theme: EnvyTheme
  let dark: boolean
  if (useOmarchy && omarchy) {
    theme = omarchyToEnvy(omarchy.colors, font)
    dark = !isLightMode(omarchy.colors)
  } else {
    dark = mode === 'system' || mode === 'omarchy' ? prefersDark() : mode !== 'light'
    theme = withSurfaceAlpha({ ...(dark ? enviousDark : enviousLight), fontFamily: font, monoFamily: font }, !dark)
  }

  applyTheme(theme, dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  document.documentElement.classList.toggle('theme-light', !dark)
  document.documentElement.classList.toggle('theme-dark', dark)
}

/// Subscribe to Omarchy theme/font changes and apply once the first payload
/// arrives. `onApply` runs after every apply so a window can refresh zoom.
export async function initAppearance(onApply?: () => void) {
  appearanceListener = () => {
    applyStoredAppearance()
    onApply?.()
  }
  applyStoredAppearance()
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    appearanceListener?.()
  })
  try {
    omarchy = await invoke<OmarchyAppearance>('omarchy_appearance')
    appearanceListener()
    await listen<OmarchyAppearance>('omarchy-appearance', (event) => {
      omarchy = event.payload
      appearanceListener?.()
    })
  } catch {
    // Outside Tauri (plain browser) — Envious faces still apply.
  }
}
