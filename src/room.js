export function getRoomId() {
  return window.location.hash.slice(1) || null
}

export function setRoomId(id) {
  window.location.hash = id
}

export function generateShareLink() {
  return window.location.href
}
