
export async function fetchFullMotionData(motionUrl) {
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(motionUrl)}`
  const response = await fetch(proxyUrl)
  const html = await response.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const title = doc.querySelector('h1')?.textContent.trim() || ''
  const applicant = doc.querySelector('.metadata .applicant')?.textContent.trim() || ''
  const reasoning = doc.querySelector('.reasoning .content')?.textContent.trim() || ''
  const text = doc.querySelector('.motion-text, .textOrig')?.textContent.trim() || ''

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

export async function fetchAmendments(consultationUrl) {
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(consultationUrl)}`
  const response = await fetch(proxyUrl)
  const html = await response.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const results = []
  const motions = doc.querySelectorAll('.motion')
  
  motions.forEach(motionEl => {
    const motionTitleEl = motionEl.querySelector('.motionTitle')
    const motionPrefixEl = motionEl.querySelector('.motionPrefix')
    const prefix = motionPrefixEl?.textContent.trim() || ''
    const title = motionTitleEl?.textContent.trim() || ''
    const motionLink = motionEl.querySelector('.motionLink' + motionEl.className.match(/motionRow(\d+)/)?.[1] || 'a') 
      || motionEl.querySelector('a')

    if (motionLink) {
      results.push({
        type: 'motion',
        id: prefix,
        title: title,
        url: new URL(motionLink.getAttribute('href'), consultationUrl).href,
        fullTitle: `${prefix}: ${title}`
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
