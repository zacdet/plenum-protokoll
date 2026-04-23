
const PROXY = url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
const TIMEOUT_MS = 12000

async function proxyFetch(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const resp = await fetch(PROXY(url), { signal: controller.signal })
    clearTimeout(timer)
    return resp
  } catch (e) {
    clearTimeout(timer)
    throw e
  }
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

export async function fetchFullMotionData(motionUrl) {
  const doc = parseHtml(await (await proxyFetch(motionUrl)).text())

  const h1Text = doc.querySelector('h1')?.textContent.trim() || ''
  const colonIdx = h1Text.indexOf(':')
  const id = colonIdx >= 0 ? h1Text.slice(0, colonIdx).trim() : ''
  const title = colonIdx >= 0 ? h1Text.slice(colonIdx + 1).trim() : h1Text

  const applicant = extractApplicant(doc)

  let text = ''
  let reasoning = ''

  doc.querySelectorAll('section.motionTextHolder').forEach(section => {
    const heading = section.querySelector('h2, h3')?.textContent.trim() || ''
    const paragraphs = []
    section.querySelectorAll('.textOrig').forEach(el => {
      const clone = el.cloneNode(true)
      clone.querySelectorAll('.lineNumber, .line-number, .privateParagraphNoteHolder').forEach(e => e.remove())
      const t = clone.textContent.trim()
      if (t) paragraphs.push(t)
    })
    if (/begründung/i.test(heading)) reasoning = paragraphs.join('\n\n')
    else if (/antragstext/i.test(heading)) text = paragraphs.join('\n\n')
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
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)

  amResults
    .filter(r => r.status === 'rejected')
    .forEach(r => console.error('Amendment fetch failed:', r.reason))

  return { id, title, applicant, text, reasoning, amendments }
}

export async function fetchAllMotions(consultationUrl) {
  const doc = parseHtml(await (await proxyFetch(consultationUrl)).text())

  return Array.from(doc.querySelectorAll('li.motion')).flatMap(motionEl => {
    const prefix = motionEl.querySelector('.motionPrefix')?.textContent.trim() || ''
    const title = motionEl.querySelector('.motionTitle')?.textContent.trim() || ''
    const link = motionEl.querySelector('a[class*="motionLink"]')
    if (!link) return []
    return [{
      id: prefix,
      title,
      url: new URL(link.getAttribute('href'), consultationUrl).href,
      fullTitle: `${prefix}: ${title}`
    }]
  })
}

export async function fetchAllAmendments(consultationUrl) {
  const doc = parseHtml(await (await proxyFetch(consultationUrl)).text())

  return Array.from(doc.querySelectorAll('li.amendment')).flatMap(amEl => {
    const link = amEl.querySelector('a')
    if (!link) return []
    const motionEl = amEl.closest('li.motion')
    const motionPrefix = motionEl?.querySelector('.motionPrefix')?.textContent.trim() || ''
    const motionTitle = motionEl?.querySelector('.motionTitle')?.textContent.trim() || ''
    const amId = link.textContent.trim()
    return [{
      id: amId,
      motionPrefix,
      motionTitle: `${motionPrefix} ${motionTitle}`.trim(),
      url: new URL(link.getAttribute('href'), consultationUrl).href,
      fullTitle: `${amId} zu ${motionPrefix} ${motionTitle}`.trim()
    }]
  })
}

export async function fetchAmendmentDetails(amendmentUrl) {
  const doc = parseHtml(await (await proxyFetch(amendmentUrl)).text())

  const h1Text = doc.querySelector('h1')?.textContent.trim() || ''
  const id = h1Text.split(' zu ')[0].trim()
  const applicant = extractApplicant(doc)
  const reasoning = doc.querySelector('#amendmentExplanation .text, section#amendmentExplanation .paragraph .text')?.textContent.trim() || ''

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
