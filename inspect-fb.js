import { initializeApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAxaC1wu2EgZP5RJ8ifip0iEEje7KmoVQ4",
  authDomain: "plenum-protokoll-d5ecb.firebaseapp.com",
  databaseURL: "https://plenum-protokoll-d5ecb-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "plenum-protokoll-d5ecb",
  appId: "1:193890933842:web:99b5c046935db6c6f0138b"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function inspectRooms() {
  console.log("Fetching rooms...");
  try {
    const snap = await get(ref(db, 'rooms'));
    if (snap.exists()) {
      const data = snap.val();
      for (const roomId in data) {
        console.log(`Room: ${roomId}`);
        const room = data[roomId];
        console.log(`  - doc:`, room.doc ? room.doc.length : 'none');
        console.log(`  - doc_v5:`, room.doc_v5 ? room.doc_v5.length : 'none');
        console.log(`  - updates:`, room.updates ? Object.keys(room.updates).length : 'none');
        console.log(`  - snap:`, room.snap ? room.snap.length : 'none');
        console.log(`  - ops:`, room.ops ? Object.keys(room.ops).length : 'none');
      }
    } else {
      console.log("No rooms found.");
    }
  } catch (e) {
    console.error("Firebase Error:", e);
  }
  process.exit(0);
}

inspectRooms();
