
const admin = require('firebase-admin');
const serviceAccount = require('./functions/service-account.json'); // We need to check if this exists or use default creds if running in proper env

// If no service account file, we might need to rely on application default credentials if permitted, 
// OR simpler: just use the client SDK with the hardcoded keys for a quick read check.

// Let's use the Client SDK approach as it doesn't require a service account key file which might not be local.
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");

const firebaseConfig = {
    apiKey: "AIzaSyDoGO5-IJ29T7Cg0ni4Bof47o4OF1AsmA0",
    authDomain: "good-day-bend-v6.firebaseapp.com",
    projectId: "good-day-bend-v6",
    storageBucket: "good-day-bend-v6.firebasestorage.app",
    messagingSenderId: "350578396384",
    appId: "1:350578396384:web:1c794c0624176aaf821485"
};

async function verifyData() {
    console.log("Initializing Firebase...");
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log("Checking 'events' collection...");
    try {
        const eventsSnapshot = await getDocs(collection(db, "events"));
        console.log(`Found ${eventsSnapshot.size} events.`);
        eventsSnapshot.forEach(doc => {
            console.log(` - ${doc.id}: ${doc.data().title}`);
            console.log(`   image: ${doc.data().image}`);
            console.log(`   imageUrl: ${doc.data().imageUrl}`);
            console.log(`   date: ${doc.data().eventDate || doc.data().date}`);
        });
    } catch (error) {
        console.error("Error reading events:", error);
    }
}

verifyData();
