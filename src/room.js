/**
 * Room-Management: ID aus URL-Hash, Share-Link
 */

const ADJECTIVES = ['Lila', 'Grüne', 'Blaue', 'Rote', 'Gelbe', 'Türkise', 'Orange', 'Silberne']
const NOUNS = ['Feder', 'Stift', 'Blatt', 'Welle', 'Flamme', 'Stern', 'Wolke', 'Brücke']

export function getRoomId() {
  let hash = window.location.hash.slice(1)
  if (!hash) {
    hash = generateRoomId()
    window.location.hash = hash
  }
  return hash
}

function generateRoomId() {
  const date = new Date().toISOString().slice(0, 10)
  const rand = Math.random().toString(36).slice(2, 6)
  return `plenum-${date}-${rand}`
}

export function generateShareLink() {
  return window.location.href
}

export function generateUserName() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  return `${adj}e ${noun}`
}
