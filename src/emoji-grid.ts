//! The `:shortcode:` grid, shared by the Emoji reference tab and the emoji
//! picker.
//!
//! One builder rather than one per surface, because the two are meant to be the
//! same list: a shortcode that browses in the reference must be pickable for a
//! domain, and a second copy of the layout would drift the first time either
//! changed. The only thing a caller varies is what clicking a cell does.

import { EMOJI_SHORTCODES } from './emoji'

const ENTRIES = Object.entries(EMOJI_SHORTCODES)

export interface EmojiGrid {
  /// The grid element, for the caller to place.
  grid: HTMLElement
  /// Redraws showing only shortcodes containing `filter`; '' shows all.
  draw: (filter: string) => void
}

/// `cellTitle` is the per-cell tooltip and `onPick` the click handler — the
/// reference tab copies the shortcode, the picker resolves with the emoji.
/// Starts drawn unfiltered, so a caller can append it straight away.
export function buildEmojiGrid(
  cellTitle: string,
  onPick: (emoji: string, code: string) => void,
): EmojiGrid {
  const grid = document.createElement('div')
  grid.className = 'emoji-grid'
  const draw = (filter: string) => {
    const needle = filter.trim().toLowerCase()
    const matches = needle ? ENTRIES.filter(([code]) => code.includes(needle)) : ENTRIES
    if (matches.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'reference-desc'
      empty.textContent = `No shortcodes match “${filter}”.`
      grid.replaceChildren(empty)
      return
    }
    grid.replaceChildren(
      ...matches.map(([code, emoji]) => {
        const cell = document.createElement('div')
        cell.className = 'emoji-cell'
        // Kept on the element so keyboard selection can read the choice back
        // without picking the glyph out of the cell's rendered text.
        cell.dataset.emoji = emoji
        const glyph = document.createElement('span')
        glyph.className = 'emoji-glyph'
        glyph.textContent = emoji
        const label = document.createElement('code')
        label.textContent = `:${code}:`
        cell.append(glyph, label)
        cell.title = cellTitle
        cell.onclick = () => onPick(emoji, code)
        return cell
      }),
    )
  }
  draw('')
  return { grid, draw }
}
