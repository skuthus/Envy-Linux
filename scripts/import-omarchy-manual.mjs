#!/usr/bin/env node
// Convert the Omarchy manual (quattro branch) into an Envy Index:
// filename = title, wiki-links between chapters, images as ![[attachments]],
// tags, highlights. Never opens a note with `# ${title}`.
//
//   node scripts/import-omarchy-manual.mjs [src-manual-dir] [dest-index]
//
// Defaults: /tmp/omarchy-manual-src/manual  →  ~/Envy Omarchy Manual

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const srcDir = process.argv[2] ?? '/tmp/omarchy-manual-src/manual'
const destDir = process.argv[3] ?? path.join(os.homedir(), 'Envy Omarchy Manual')
const systemThemes = '/usr/share/omarchy/themes'

const ILLEGAL = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*'])

function sanitizeTitle(title) {
  let s = [...title].map((c) => (ILLEGAL.has(c) || c.charCodeAt(0) < 32 ? '-' : c)).join('')
  s = s.trim().replace(/[.\s!]+$/, '').trim()
  return s || 'Untitled'
}

function slugify(heading) {
  return heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
}

const SECTIONS = [
  { name: 'The Basics', tags: ['#omarchy', '#manual', '#basics'], from: 2, to: 14 },
  { name: 'The Applications', tags: ['#omarchy', '#manual', '#apps'], from: 15, to: 29 },
  { name: 'Configuration', tags: ['#omarchy', '#manual', '#config'], from: 30, to: 44 },
  { name: 'FAQ & Install', tags: ['#omarchy', '#manual', '#faq'], from: 45, to: 51 },
]

const EXTRA_TAGS = {
  1: ['#welcome'],
  2: ['#install'],
  3: ['#macos', '#windows'],
  4: ['#hyprland', '#tiling'],
  5: ['#shell'],
  6: ['#theme'],
  7: ['#hotkeys'],
  8: ['#clipboard'],
  9: ['#reminders'],
  12: ['#screenshot'],
  15: ['#terminal'],
  16: ['#neovim'],
  17: ['#ai'],
  23: ['#browser'],
  26: ['#gaming'],
  30: ['#update'],
  33: ['#monitor'],
  38: ['#font'],
  43: ['#theme'],
  45: ['#troubleshooting'],
  48: ['#security'],
  50: ['#install', '#windows'],
  51: ['#install'],
}

const files = fs
  .readdirSync(srcDir)
  .filter((f) => /^\d{2}-.+\.md$/.test(f))
  .sort()

const chapters = files.map((file) => {
  const n = Number(file.slice(0, 2))
  const raw = fs.readFileSync(path.join(srcDir, file), 'utf8')
  const h1 = (raw.match(/^# (.+)$/m) || [, file])[1].trim()
  const title = sanitizeTitle(h1)
  const headings = [...raw.matchAll(/^#{2,6}\s+(.+)$/gm)].map((m) => m[1].trim())
  const headingBySlug = new Map(headings.map((h) => [slugify(h), h]))
  const section = SECTIONS.find((s) => n >= s.from && n <= s.to) ?? SECTIONS[0]
  const tags = [...new Set([...(section?.tags ?? ['#omarchy', '#manual']), ...(EXTRA_TAGS[n] ?? [])])]
  return { n, file, h1, title, raw, headings, headingBySlug, section, tags }
})

const byFile = new Map(chapters.map((c) => [c.file, c]))
const byNum = new Map(chapters.map((c) => [c.n, c]))

function resolveChapter(href) {
  const [file, anchor] = href.split('#')
  const base = path.basename(file)
  const ch = byFile.get(base)
  if (!ch) return null
  if (!anchor) return { ch, heading: null }
  const heading = ch.headingBySlug.get(anchor) ?? null
  return { ch, heading }
}

function copyImage(absSrc, destName) {
  const dest = path.join(destDir, 'Attachments', destName)
  if (!fs.existsSync(absSrc)) return null
  fs.copyFileSync(absSrc, dest)
  return destName
}

function importImage(href, alt) {
  const clean = href.split('?')[0]
  if (clean.startsWith('images/')) {
    const name = path.basename(clean)
    return copyImage(path.join(srcDir, clean), name) ? { name, alt } : null
  }
  if (clean.startsWith('../themes/')) {
    const parts = clean.split('/')
    const theme = parts[2]
    const file = parts[3]
    const destName = `theme-${theme}-${file}`
    const fromManual = path.join(srcDir, clean)
    const fromSystem = path.join(systemThemes, theme, file)
    const src = fs.existsSync(fromManual) ? fromManual : fromSystem
    return copyImage(src, destName) ? { name: destName, alt: alt || theme } : null
  }
  return null
}

function wiki(ch, heading, display) {
  let target = ch.title
  if (heading) target += `#${heading}`
  if (display && display !== ch.title && display !== heading) return `[[${target}|${display}]]`
  return `[[${target}]]`
}

function convertBody(ch) {
  let text = ch.raw.replace(/\r\n/g, '\n')

  // Drop the H1 — the filename is the title.
  text = text.replace(/^# .+\n+/, '')

  // Image + following italic caption → embed with caption.
  text = text.replace(
    /!\[([^\]]*)\]\(([^)]+)\)\n_([^_\n]+)_\n?/g,
    (_, alt, href, caption) => {
      const img = importImage(href, alt)
      if (!img) return _
      return `![[${img.name}|480|${caption}]]\n`
    },
  )

  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, href) => {
    const img = importImage(href, alt)
    if (!img) return _
    const caption = alt && alt !== path.basename(href, path.extname(href)) ? `|${alt}` : ''
    return `![[${img.name}|480${caption}]]`
  })

  // Markdown links: internal chapters become wiki-links; keep http(s).
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (all, label, href) => {
    if (/^https?:\/\//i.test(href) || href.startsWith('mailto:')) return all
    const resolved = resolveChapter(href)
    if (resolved) return wiki(resolved.ch, resolved.heading, label)
    return label
  })

  // Italic-only warning/emphasis paragraphs → highlights.
  text = text.replace(/^_(.+)_\s*$/gm, (all, inner) => {
    if (inner.length < 12) return all
    return `==${inner}==`
  })

  // A few Super+ chords as highlights, but not in the hotkeys table dump.
  if (ch.n !== 7) {
    const seen = new Set()
    text = text.replace(/`?(Super(?:\s*\+\s*[A-Za-z0-9]+)+)`?/g, (m) => {
      const key = m.replace(/`/g, '')
      if (seen.has(key) || seen.size >= 4) return m
      seen.add(key)
      return `==${key}==`
    })
  }

  const tagLine = ch.tags.join(' ')
  const prev = byNum.get(ch.n - 1)
  const next = byNum.get(ch.n + 1)
  const nav = [
    prev ? `← [[${prev.title}]]` : null,
    `[[Omarchy Manual]]`,
    next ? `[[${next.title}]] →` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return `${tagLine}\n\n${text.trim()}\n\n---\n${nav}\n`
}

function hubBody() {
  const lines = [
    '#omarchy #manual #index',
    '',
    'The Omarchy manual as an Envy Index. The filename is the title; chapters wiki-link to each other and to [[Welcome to Omarchy]].',
    '',
    'Source: https://omarchy.org/manual/ · https://github.com/omacom/omarchy/tree/quattro/manual',
    '',
  ]
  for (const section of SECTIONS) {
    lines.push(`## ${section.name}`)
    lines.push('')
    for (const ch of chapters.filter((c) => c.n >= section.from && c.n <= section.to)) {
      lines.push(`- [[${ch.title}]]`)
    }
    lines.push('')
  }
  lines.push('## Start here')
  lines.push('')
  lines.push('Read [[Welcome to Omarchy]], then [[Getting Started]]. Coming from another OS? See [[Coming From Mac or Windows]].')
  lines.push('')
  return lines.join('\n')
}

if (fs.existsSync(destDir)) {
  for (const ent of fs.readdirSync(destDir)) {
    if (ent === '.git') continue
    fs.rmSync(path.join(destDir, ent), { recursive: true, force: true })
  }
}
fs.mkdirSync(path.join(destDir, 'Attachments'), { recursive: true })

let images = 0
for (const ch of chapters) {
  const body = convertBody(ch)
  images += (body.match(/!\[\[/g) || []).length
  fs.writeFileSync(path.join(destDir, `${ch.title}.md`), body)
}
fs.writeFileSync(path.join(destDir, 'Omarchy Manual.md'), hubBody())

const nFiles = fs.readdirSync(destDir).filter((f) => f.endsWith('.md')).length
const nAttach = fs.readdirSync(path.join(destDir, 'Attachments')).length
console.log(`Wrote ${nFiles} notes + ${nAttach} attachments into ${destDir}`)
console.log(`  ${images} image embeds, ${chapters.length} chapters + hub`)
