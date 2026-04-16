/**
 * Export: Clipboard + Datei-Download + Toast-Nachrichten
 */

export async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text)
  showToast('In Zwischenablage kopiert!')
}

export function downloadWiki(text, roomId) {
  const date = new Date().toISOString().slice(0, 10)
  const filename = `Protokoll_${date}.wiki`
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  showToast(`${filename} heruntergeladen`)
}

export function showToast(message, type = 'success') {
  const toast = document.getElementById('toast')
  if (!toast) return
  toast.textContent = message
  toast.className = `toast ${type}`
  toast.classList.remove('hidden')
  clearTimeout(toast._timeout)
  toast._timeout = setTimeout(() => toast.classList.add('hidden'), 3000)
}
