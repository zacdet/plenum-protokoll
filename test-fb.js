import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAxaC1wu2EgZP5RJ8ifip0iEEje7KmoVQ4",
  authDomain: "plenum-protokoll-d5ecb.firebaseapp.com",
  databaseURL: "https://plenum-protokoll-d5ecb-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "plenum-protokoll-d5ecb",
  appId: "1:193890933842:web:99b5c046935db6c6f0138b"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function test() {
  console.log("Testing write...");
  const testRef = ref(db, 'test/readwrite');
  try {
    await set(testRef, "Hello World " + Date.now());
    console.log("Write successful.");
    
    console.log("Testing read...");
    const snap = await get(testRef);
    console.log("Read successful. Value:", snap.val());
  } catch (e) {
    console.error("Firebase Error:", e);
  }
  process.exit(0);
}

test();
