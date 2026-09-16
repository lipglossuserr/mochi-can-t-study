/**
 * A deliberately small Markdown-like renderer for blog post bodies.
 *
 * Why not a real Markdown library or a WYSIWYG editor (TipTap etc.):
 * this build environment has no package-registry access, so anything
 * not already vendored in package.json can't be installed. Rather
 * than block the whole blog feature on that, `BlogEditor` uses a
 * plain textarea + a toolbar that inserts this same lightweight
 * syntax, and this function renders it back to HTML for the preview
 * pane and the published reader view. It supports exactly what the
 * toolbar can produce — headings, bold, italic, links, and lists —
 * nothing more.
 *
 * Security: `escapeHtml` runs on the raw input FIRST, before any
 * markup substitution, so nothing in the body can inject arbitrary
 * HTML/script — the only tags that ever appear in the output are the
 * ones this function itself adds.
 */

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Renders one line's inline markup (bold/italic/links) — used both for paragraph and list-item lines. */
function renderInline(escapedLine: string): string {
  return escapedLine
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
}

/**
 * Converts the editor's lightweight syntax to safe HTML:
 * `# `/`## `/`### ` headings, `**bold**`, `*italic*`, `- ` bullet
 * lists, `[text](https://url)` links, blank-line-separated paragraphs.
 */
export function markdownLiteToHtml(body: string): string {
  if (!body || !body.trim()) {
    return ''
  }

  const lines = body.replace(/\r\n/g, '\n').split('\n')
  const htmlParts: string[] = []
  let listBuffer: string[] = []

  const flushList = () => {
    if (listBuffer.length > 0) {
      htmlParts.push(`<ul>${listBuffer.join('')}</ul>`)
      listBuffer = []
    }
  }

  let paragraphBuffer: string[] = []
  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      htmlParts.push(`<p>${paragraphBuffer.join('<br/>')}</p>`)
      paragraphBuffer = []
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const escaped = escapeHtml(line)

    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(line)
    const listMatch = /^-\s+(.*)$/.exec(line)

    if (headingMatch) {
      flushParagraph()
      flushList()
      const level = headingMatch[1].length + 1 // "# " -> h2, "## " -> h3, "### " -> h4
      const content = renderInline(escapeHtml(headingMatch[2]))
      htmlParts.push(`<h${level}>${content}</h${level}>`)
    } else if (listMatch) {
      flushParagraph()
      listBuffer.push(`<li>${renderInline(escapeHtml(listMatch[1]))}</li>`)
    } else if (line.trim() === '') {
      flushParagraph()
      flushList()
    } else {
      flushList()
      paragraphBuffer.push(renderInline(escaped))
    }
  }
  flushParagraph()
  flushList()

  return htmlParts.join('')
}
