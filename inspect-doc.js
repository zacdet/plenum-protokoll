import { initializeApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";
import * as Y from 'yjs';

const firebaseConfig = {
  apiKey: "AIzaSyAxaC1wu2EgZP5RJ8ifip0iEEje7KmoVQ4",
  authDomain: "plenum-protokoll-d5ecb.firebaseapp.com",
  databaseURL: "https://plenum-protokoll-d5ecb-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "plenum-protokoll-d5ecb",
  appId: "1:193890933842:web:99b5c046935db6c6f0138b"
};

function fromBase64(b64) {
  const s = atob(b64)
  const uint8 = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) uint8[i] = s.charCodeAt(i)
  return uint8
}

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function inspectRooms() {
  try {
    const snap = await get(ref(db, 'rooms/protokoll-mo1n0rt4-ztkn/doc_v5'));
    if (snap.exists()) {
      const b64 = snap.val();
      const bytes = fromBase64(b64);
      const doc = new Y.Doc();
      Y.applyUpdate(doc, bytes);
      console.log("Content:", doc.getText('protokoll').toString());
    } else {
      console.log("No rooms found.");
    }
  } catch (e) {
    console.error("Firebase Error:", e);
  }
  process.exit(0);
}

inspectRooms();
