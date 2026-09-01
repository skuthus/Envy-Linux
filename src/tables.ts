//! GFM pipe tables: detect a `| header |` / `| --- |` / `| cell |` block,
//! and continue it on Enter / Tab the way lists continue on Enter / Tab.
//!
//! The file still holds the pipes — Envy never rewrites a table into HTML.
//! When the cursor is outside the block the styler replaces it with an HTML
//! table matching the Omarchy manual; this module is the parser plus keymap.

import { EditorView, keymap } from '@codemirror/view'
import { Prec, type Text } from '@codemirror/state'

export type CellAlign = 'left' | 'center' | 'right'

export interface TableBlock {
  from: number
  to: number
  header: string[]
  aligns: CellAlign[]
  rows: string[][]
  src: string
}

export function findTableBlocks(doc: Text): TableBlock[] {
  const out: TableBlock[] = []
  let n = 1
  let inFence = false
  while (n <= doc.lines) {
    const text = doc.line(n).text
    // A pipe table inside a fenced block is source, not a table.
    if (/^\s*```/.test(text)) {
      inFence = !inFence
      n++
      continue
    }
    if (inFence || !isTableLine(text)) {
      n++
      continue
    }
    let end = n
    while (end < doc.lines) {
      const next = doc.line(end + 1).text
      if (/^\s*```/.test(next) || !isTableLine(next)) break
      end++
    }
    let sep = -1
    for (let i = n; i <= end; i++) {
      if (isTableSep(doc.line(i).text)) {
        sep = i
        break
      }
    }
    if (sep > n) {
      const header = splitCells(doc.line(n).text).map((c) => c.trim())
      const aligns = splitCells(doc.line(sep).text).map(alignOf)
      const rows: string[][] = []
      for (let i = sep + 1; i <= end; i++) {
        if (isTableSep(doc.line(i).text)) continue
        rows.push(splitCells(doc.line(i).text).map((c) => c.trim()))
      }
      // Block replacements have to cover whole lines: from the header's start
      // to the start of the next line (or the end of the document). Ending at
      // `line.to` (before the newline) is not a valid block range, so CodeMirror
      // drops the widget and the pipes stay on screen.
      const from = doc.line(n).from
      const to = end < doc.lines ? doc.line(end + 1).from : doc.length
      out.push({ from, to, header, aligns, rows, src: doc.sliceString(from, to) })
    }
    n = end + 1
  }
  return out
}

function alignOf(cell: string): CellAlign {
  const t = cell.trim()
  const left = t.startsWith(':')
  const right = t.endsWith(':')
  if (left && right) return 'center'
  if (right) return 'right'
  return 'left'
}

/// A line that can belong to a pipe table: starts with `|` (after indent)
/// and has at least two pipes, so a lone `|` is not a table.
export function isTableLine(line: string): boolean {
  if (!/^\s*\|/.test(line)) return false
  let pipes = 0
  forEachPipe(line, () => {
    pipes++
  })
  return pipes >= 2
}

/// The delimiter row: `| --- | :---: | ---: |`
export function isTableSep(line: string): boolean {
  if (!isTableLine(line)) return false
  const cells = splitCells(line)
  return cells.length >= 1 && cells.every((c) => /^:?-{3,}:?$/.test(c.trim()))
}

/// Cells of a table line, outer pipes stripped. `\|` and pipes inside
/// `[[wiki|alias]]` or `` `code` `` are not splits.
export function splitCells(line: string): string[] {
  let s = line.trim()
  if (s.startsWith('|')) s = s.slice(1)
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1)
  const cells: string[] = []
  let cur = ''
  let i = 0
  while (i < s.length) {
    const skip = skipProtected(s, i)
    if (skip > i) {
      cur += s.slice(i, skip)
      i = skip
      continue
    }
    if (s[i] === '\\' && s[i + 1] === '|') {
      cur += '|'
      i += 2
      continue
    }
    if (s[i] === '|') {
      cells.push(cur)
      cur = ''
      i++
      continue
    }
    cur += s[i]
    i++
  }
  cells.push(cur)
  return cells
}

/// Absolute offsets of structural `|` characters on this line.
export function forEachPipe(line: string, fn: (rel: number) => void) {
  let i = 0
  while (i < line.length) {
    const skip = skipProtected(line, i)
    if (skip > i) {
      i = skip
      continue
    }
    if (line[i] === '\\' && line[i + 1] === '|') {
      i += 2
      continue
    }
    if (line[i] === '|') fn(i)
    i++
  }
}

function skipProtected(s: string, i: number): number {
  if (s[i] === '[' && s[i + 1] === '[') {
    const end = s.indexOf(']]', i + 2)
    if (end !== -1) return end + 2
  }
  if (s[i] === '`') {
    const end = s.indexOf('`', i + 1)
    if (end !== -1) return end + 1
  }
  return i
}

function emptyRow(cols: number): string {
  const n = Math.max(2, cols)
  return '| ' + Array.from({ length: n }, () => ' ').join('| ') + '|'
}

function isEmptyTableRow(line: string): boolean {
  return splitCells(line).every((c) => c.trim() === '')
}

function continueTable(view: EditorView): boolean {
  const { state } = view
  const sel = state.selection.main
  if (!sel.empty) return false
  const line = state.doc.lineAt(sel.head)
  if (!isTableLine(line.text)) return false
  if (isTableSep(line.text)) return false
  if (isEmptyTableRow(line.text)) {
    view.dispatch({
      changes: { from: line.from, to: line.to, insert: '' },
      userEvent: 'input',
    })
    return true
  }
  const cols = splitCells(line.text).length
  const row = emptyRow(cols)
  const insertAt = line.to
  const caret = insertAt + 1 + 2 // after `\n| `
  view.dispatch({
    changes: { from: insertAt, insert: '\n' + row },
    selection: { anchor: caret },
    userEvent: 'input',
  })
  return true
}

function moveTableCell(view: EditorView, dir: 1 | -1): boolean {
  const { state } = view
  const sel = state.selection.main
  if (!sel.empty) return false
  const line = state.doc.lineAt(sel.head)
  if (!isTableLine(line.text)) return false
  const pipes: number[] = []
  forEachPipe(line.text, (rel) => pipes.push(rel))
  const rel = sel.head - line.from
  if (dir > 0) {
    for (const p of pipes) {
      if (p >= rel) {
        let at = p + 1
        if (line.text[at] === ' ') at++
        view.dispatch({ selection: { anchor: line.from + at } })
        return true
      }
    }
    // Past the last cell: jump to the first cell of the next table row.
    if (line.number < state.doc.lines) {
      const next = state.doc.line(line.number + 1)
      if (isTableLine(next.text)) {
        const first = firstCellOffset(next.text)
        view.dispatch({ selection: { anchor: next.from + first } })
        return true
      }
    }
    return false
  }
  for (let i = pipes.length - 1; i >= 0; i--) {
    const p = pipes[i]
    if (p < rel - 1) {
      let at = p + 1
      if (line.text[at] === ' ') at++
      view.dispatch({ selection: { anchor: line.from + at } })
      return true
    }
  }
  if (line.number > 1) {
    const prev = state.doc.line(line.number - 1)
    if (isTableLine(prev.text)) {
      const lastPipes: number[] = []
      forEachPipe(prev.text, (relPos) => lastPipes.push(relPos))
      const p = lastPipes[lastPipes.length - 2] ?? lastPipes[0]
      if (p !== undefined) {
        let at = p + 1
        if (prev.text[at] === ' ') at++
        view.dispatch({ selection: { anchor: prev.from + at } })
        return true
      }
    }
  }
  return false
}

function firstCellOffset(line: string): number {
  let first = 0
  forEachPipe(line, (rel) => {
    if (first === 0) first = rel + 1
  })
  if (line[first] === ' ') first++
  return first
}

/// Enter continues a row; Tab / Shift-Tab walk cells. Same Prec.high as lists,
/// but each command returns false off a table line so lists keep those keys.
export const tableEditing = Prec.high(
  keymap.of([
    { key: 'Enter', run: continueTable },
    { key: 'Tab', run: (v) => moveTableCell(v, 1) },
    { key: 'Shift-Tab', run: (v) => moveTableCell(v, -1) },
  ]),
)
