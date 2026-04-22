
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
    const motionTitle = (motionPrefixEl?.textContent || '') + ' ' + (motionTitleEl?.textContent || '')
    
    const amendments = motionEl.querySelectorAll('.amendment')
    amendments.forEach(amEl => {
      const link = amEl.querySelector('a')
      if (link) {
        const rawHref = link.getAttribute('href')
        const absoluteUrl = new URL(rawHref, consultationUrl).href
        results.push({
          id: link.textContent.trim(),
          motionTitle: motionTitle.trim(),
          url: absoluteUrl,
          fullTitle: `${link.textContent.trim()} zu ${motionTitle.trim()}`
        })
      }
    })
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
