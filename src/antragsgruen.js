
export async function fetchFullMotionData(motionUrl) {
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(motionUrl)}`
  const response = await fetch(proxyUrl)
  const html = await response.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const title = doc.querySelector('h1')?.textContent.trim() || ''
  const applicant = doc.querySelector('.metadata .applicant, .meta .applicant')?.textContent.trim() || ''
  const reasoning = doc.querySelector('.reasoning .content, .begruendung .content')?.textContent.trim() || ''
  
  // Antragsgrün uses specific classes for the original text
  const textEl = doc.querySelector('.textOrig') || doc.querySelector('.motion-text') || doc.querySelector('.antragstext');
  let text = ''
  if (textEl) {
    // Remove line numbers if present
    const clone = textEl.cloneNode(true)
    clone.querySelectorAll('.lineNumber, .line-number').forEach(el => el.remove())
    text = clone.textContent.trim()
  }

  const amendments = []
  const amLinks = doc.querySelectorAll('.amendments li a, .amendmentRow a')
  
  for (const link of amLinks) {
    const amUrl = new URL(link.getAttribute('href'), motionUrl).href
    try {
      const amDetails = await fetchAmendmentDetails(amUrl)
      // Extract the simple ID like "Ä1" from text or title
      const amId = link.textContent.trim() || amDetails.title.split(':')[0].trim()
      amendments.push({
        id: amId,
        ...amDetails
      })
    } catch (e) {
      console.error("Failed to fetch amendment", amUrl, e)
    }
  }

  return {
    title,
    applicant,
    text,
    reasoning,
    amendments
  }
}

export async function fetchAllMotions(consultationUrl) {
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(consultationUrl)}`
  const response = await fetch(proxyUrl)
  const html = await response.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const results = []
  doc.querySelectorAll('.motion').forEach(motionEl => {
    const motionTitleEl = motionEl.querySelector('.motionTitle')
    const motionPrefixEl = motionEl.querySelector('.motionPrefix')
    const prefix = motionPrefixEl?.textContent.trim() || ''
    const title = motionTitleEl?.textContent.trim() || ''
    const motionLink = motionEl.querySelector('a.motionLink' + (motionEl.className.match(/motionRow(\d+)/)?.[1] || '')) 
      || motionEl.querySelector('.title a')

    if (motionLink) {
      results.push({
        id: prefix,
        title: title,
        url: new URL(motionLink.getAttribute('href'), consultationUrl).href,
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
  doc.querySelectorAll('.amendment').forEach(amEl => {
    const link = amEl.querySelector('a')
    const motionEl = amEl.closest('.motion')
    const motionTitle = motionEl?.querySelector('.motionTitle')?.textContent.trim() || ''
    const motionPrefix = motionEl?.querySelector('.motionPrefix')?.textContent.trim() || ''

    if (link) {
      results.push({
        id: link.textContent.trim(),
        motionTitle: `${motionPrefix} ${motionTitle}`,
        url: new URL(link.getAttribute('href'), consultationUrl).href,
        fullTitle: `${link.textContent.trim()} zu ${motionPrefix} ${motionTitle}`
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

  const title = doc.querySelector('h1')?.textContent.trim() || ''
  const reasoningEl = doc.querySelector('.reasoning .content, #amendment-reasoning') 
  // Antragsgrün often has different structures. Let's try common ones.
  const reasoning = reasoningEl?.textContent.trim() || ''
  
  // Diff parsing
  // The diff is often in .diff-container or similar.
  // In the example I saw it was inside .text.motionTextFormattings.textAmendment
  const diffEls = doc.querySelectorAll('.text.motionTextFormattings.textAmendment')
  let instructions = ''
  
  if (diffEls.length > 0) {
    diffEls.forEach(el => {
      // Clean up the diff to a readable string with markings
      // We can use [DEL: ...] and [INS: ...] or similar
      const clone = el.cloneNode(true)
      clone.querySelectorAll('del').forEach(del => {
        del.textContent = `(gelöscht: ${del.textContent})`
      })
      clone.querySelectorAll('ins').forEach(ins => {
        ins.textContent = `(neu: ${ins.textContent})`
      })
      instructions += clone.textContent.trim() + '\n\n'
    })
  } else {
    // Fallback: try to find any diff tags
    const contentEl = doc.querySelector('.amendment-content')
    if (contentEl) instructions = contentEl.textContent.trim()
  }

  return {
    title,
    reasoning,
    instructions: instructions.trim()
  }
}
