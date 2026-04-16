import * as Y from 'yjs';

function toBase64(uint8) {
  return btoa(String.fromCharCode.apply(null, uint8))
}

function fromBase64(b64) {
  const s = atob(b64)
  const uint8 = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) uint8[i] = s.charCodeAt(i)
  return uint8
}

const doc1 = new Y.Doc();
const text1 = doc1.getText('protokoll');
text1.insert(0, 'Hello World ' + '🔥'.repeat(10));

const update = Y.encodeStateAsUpdate(doc1);
console.log("Original length:", update.length);

try {
  const b64 = toBase64(update);
  console.log("Base64:", b64);
  const decoded = fromBase64(b64);
  console.log("Decoded length:", decoded.length);

  const doc2 = new Y.Doc();
  Y.applyUpdate(doc2, decoded);
  console.log("Doc2 text:", doc2.getText('protokoll').toString());
} catch(e) {
  console.error("Error:", e);
}
