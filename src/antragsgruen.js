
const TIMEOUT_MS = 20000
const CACHE_TTL = 3 * 60 * 1000

const _cache = new Map()

const PROXIES = [
  url => `/api/proxy?url=${encodeURIComponent(url)}`,
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
]

async function proxyFetch(url) {
  const hit = _cache.get(url)
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.html

  let lastErr
  for (const proxy of PROXIES) {
    const controller = new AbortController()
    const timer = setTimeout(
      () => controller.abort(new DOMException('Zeitüberschreitung', 'TimeoutError')),
      TIMEOUT_MS
    )
    try {
      const resp = await fetch(proxy(url), { signal: controller.signal })
      clearTimeout(timer)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const html = await resp.text()
      _cache.set(url, { html, ts: Date.now() })
      return html
    } catch (e) {
      clearTimeout(timer)
      lastErr = e
    }
  }
  throw lastErr
}

export function prefetch(url) {
  proxyFetch(url).catch(() => {})
}

function parseHtml(html) {
  return new DOMParser().parseFromString(html, 'text/html')
}

function extractApplicant(doc) {
  for (const row of doc.querySelectorAll('table.motionDataTable tr')) {
    const th = row.querySelector('th')
    if (th && th.textContent.includes('Antragsteller')) {
      return row.querySelector('td')?.textContent.trim() || ''
    }
  }
  return ''
}

// Single fetch for the overview page — returns both motions and amendments
export async function fetchConsultationData(consultationUrl) {
  const doc = parseHtml(await proxyFetch(consultationUrl))
  const motions = []
  const amendments = []

  doc.querySelectorAll('li.motion').forEach(motionEl => {
    const prefix = motionEl.querySelector('.motionPrefix')?.textContent.trim() || ''
    const title  = motionEl.querySelector('.motionTitle')?.textContent.trim() || ''
    const link   = motionEl.querySelector('a[class*="motionLink"]')
    if (!link) return

    const motionUrl = new URL(link.getAttribute('href'), consultationUrl).href
    motions.push({ id: prefix, title, url: motionUrl, fullTitle: `${prefix}: ${title}` })

    motionEl.querySelectorAll('li.amendment').forEach(amEl => {
      const amLink = amEl.querySelector('a')
      if (!amLink) return
      const amId = amLink.textContent.trim()
      amendments.push({
        id: amId,
        motionPrefix: prefix,
        motionTitle: `${prefix} ${title}`.trim(),
        url: new URL(amLink.getAttribute('href'), consultationUrl).href,
        fullTitle: `${amId} zu ${prefix} ${title}`.trim()
      })
    })
  })

  return { motions, amendments }
}

export async function fetchFullMotionData(motionUrl) {
  const doc = parseHtml(await proxyFetch(motionUrl))

  const h1Text = doc.querySelector('h1')?.textContent.trim() || ''
  const colonIdx = h1Text.indexOf(':')
  const id    = colonIdx >= 0 ? h1Text.slice(0, colonIdx).trim() : ''
  const title = colonIdx >= 0 ? h1Text.slice(colonIdx + 1).trim() : h1Text

  const applicant = extractApplicant(doc)

  let text = '', reasoning = ''
  doc.querySelectorAll('section.motionTextHolder').forEach(section => {
    const heading = section.querySelector('h2, h3')?.textContent.trim() || ''
    const paragraphs = []
    section.querySelectorAll('.textOrig').forEach(el => {
      const clone = el.cloneNode(true)
      clone.querySelectorAll('.lineNumber, .line-number, .privateParagraphNoteHolder').forEach(e => e.remove())
      const t = clone.textContent.trim()
      if (t) paragraphs.push(t)
    })
    if (/begründung/i.test(heading))   reasoning = paragraphs.join('\n\n')
    else if (/antragstext/i.test(heading)) text  = paragraphs.join('\n\n')
  })

  const amLinks = Array.from(doc.querySelectorAll('ul.amendments li a'))
    .filter(a => a.getAttribute('href'))

  const amResults = await Promise.allSettled(
    amLinks.map(async link => {
      const amUrl = new URL(link.getAttribute('href'), motionUrl).href
      const details = await fetchAmendmentDetails(amUrl)
      return { id: link.textContent.trim() || details.id, ...details }
    })
  )

  const amendments = amResults
    .filter(r => r.status === 'fulfilled').map(r => r.value)
  amResults
    .filter(r => r.status === 'rejected').forEach(r => console.error('Amendment fetch failed:', r.reason))

  return { id, title, applicant, text, reasoning, amendments }
}

export async function fetchAmendmentDetails(amendmentUrl) {
  const doc = parseHtml(await proxyFetch(amendmentUrl))

  const h1Text = doc.querySelector('h1')?.textContent.trim() || ''
  const id = h1Text.split(' zu ')[0].trim()
  const applicant = extractApplicant(doc)
  const reasoning = doc.querySelector(
    '#amendmentExplanation .text, section#amendmentExplanation .paragraph .text'
  )?.textContent.trim() || ''

  let instructions = ''
  doc.querySelectorAll('.onlyChangedText .text.motionTextFormattings').forEach(el => {
    const clone = el.cloneNode(true)
    clone.querySelectorAll('.lineNumber, .line-number').forEach(e => e.remove())
    clone.querySelectorAll('del').forEach(del => {
      del.parentNode.replaceChild(doc.createTextNode(`<del>${del.textContent}</del>`), del)
    })
    clone.querySelectorAll('ins').forEach(ins => {
      ins.parentNode.replaceChild(doc.createTextNode(`'''${ins.textContent}'''`), ins)
    })
    instructions += clone.textContent.trim() + '\n\n'
  })

  return { id, title: h1Text, applicant, reasoning, instructions: instructions.trim() }
}
