
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
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(motionUrl)}`
  const response = await fetch(proxyUrl)
  const html = await response.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const h1Text = doc.querySelector('h1')?.textContent.trim() || ''
  const colonIdx = h1Text.indexOf(':')
  const id = colonIdx >= 0 ? h1Text.slice(0, colonIdx).trim() : ''
  const title = colonIdx >= 0 ? h1Text.slice(colonIdx + 1).trim() : h1Text

  const applicant = extractApplicant(doc)

  const reasoningEl = doc.querySelector('.motionTextHolder h2, .motionTextHolder h3')
  let reasoning = ''
  if (reasoningEl && /begründung/i.test(reasoningEl.textContent)) {
    reasoning = reasoningEl.closest('.motionTextHolder')?.querySelector('.text')?.textContent.trim() || ''
  }

  const textEls = doc.querySelectorAll('.textOrig')
  let paragraphs = []
  textEls.forEach(el => {
    const clone = el.cloneNode(true)
    clone.querySelectorAll('.lineNumber, .line-number, .privateParagraphNoteHolder').forEach(e => e.remove())
    const pText = clone.textContent.trim()
    if (pText) paragraphs.push(pText)
  })
  const text = paragraphs.join('\n\n')

  const amendments = []
  const amLinks = doc.querySelectorAll('ul.amendments li a')

  for (const link of amLinks) {
    const href = link.getAttribute('href')
    if (!href) continue
    const amUrl = new URL(href, motionUrl).href
    try {
      const amDetails = await fetchAmendmentDetails(amUrl)
      const amId = link.textContent.trim() || amDetails.title.split(' ')[0].trim()
      amendments.push({ id: amId, ...amDetails })
    } catch (e) {
      console.error('Failed to fetch amendment', amUrl, e)
    }
  }

  return { id, title, applicant, text, reasoning, amendments }
}

export async function fetchAllMotions(consultationUrl) {
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(consultationUrl)}`
  const response = await fetch(proxyUrl)
  const html = await response.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const results = []
  doc.querySelectorAll('li.motion').forEach(motionEl => {
    const prefix = motionEl.querySelector('.motionPrefix')?.textContent.trim() || ''
    const title = motionEl.querySelector('.motionTitle')?.textContent.trim() || ''
    const link = motionEl.querySelector('a[class*="motionLink"]')

    if (link) {
      results.push({
        id: prefix,
        title,
        url: new URL(link.getAttribute('href'), consultationUrl).href,
        fullTitle: `${prefix}: ${title}`
      })
    }
  })
  return results
}

export async function fetchAllAmendments(consultationUrl) {
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(consultationUrl)}`
  const response = await fetch(proxyUrl)
  const html = await response.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const results = []
  doc.querySelectorAll('li.amendment').forEach(amEl => {
    const link = amEl.querySelector('a')
    const motionEl = amEl.closest('li.motion')
    const motionPrefix = motionEl?.querySelector('.motionPrefix')?.textContent.trim() || ''
    const motionTitle = motionEl?.querySelector('.motionTitle')?.textContent.trim() || ''

    if (link) {
      const amId = link.textContent.trim()
      results.push({
        id: amId,
        motionTitle: `${motionPrefix} ${motionTitle}`.trim(),
        url: new URL(link.getAttribute('href'), consultationUrl).href,
        fullTitle: `${amId} zu ${motionPrefix} ${motionTitle}`.trim()
      })
    }
  })
  return results
}

export async function fetchAmendmentDetails(amendmentUrl) {
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(amendmentUrl)}`
  const response = await fetch(proxyUrl)
  const html = await response.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const h1Text = doc.querySelector('h1')?.textContent.trim() || ''
  const title = h1Text
  const id = h1Text.split(' zu ')[0].trim()

  const applicant = extractApplicant(doc)

  const reasoningEl = doc.querySelector('#amendmentExplanation .text, section#amendmentExplanation .paragraph .text')
  const reasoning = reasoningEl?.textContent.trim() || ''

  const diffEls = doc.querySelectorAll('.changedText .text.motionTextFormattings')
  let instructions = ''

  if (diffEls.length > 0) {
    diffEls.forEach(el => {
      const clone = el.cloneNode(true)
      clone.querySelectorAll('del').forEach(del => {
        del.textContent = `(gelöscht: ${del.textContent})`
      })
      clone.querySelectorAll('ins').forEach(ins => {
        ins.textContent = `(neu: ${ins.textContent})`
      })
      instructions += clone.textContent.trim() + '\n\n'
    })
  }

  return { id, title, applicant, reasoning, instructions: instructions.trim() }
}
