// Firebase Configuration
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
// Your web app's Firebase configuration
const defaultFirebaseConfig = {
    apiKey: "AIzaSyDoGO5-IJ29T7Cg0ni4Bof47o4OF1AsmA0",
    authDomain: "good-day-bend-v6.firebaseapp.com",
    projectId: "good-day-bend-v6",
    storageBucket: "good-day-bend-v6.firebasestorage.app",
    messagingSenderId: "350578396384",
    appId: "1:350578396384:web:1c794c0624176aaf821485"
};

// Check for client-specific config (injected by GHL) or use default
// Check for client-specific config (injected by GHL) or use default
let firebaseConfig = defaultFirebaseConfig;

if (window.CLIENT_CONFIG) {
    // Validate: If the keys still look like handlebars {{ ... }} or are empty, ignore them
    const isPlaceholder = (val) => val && typeof val === 'string' && val.includes('{{');

    if (!isPlaceholder(window.CLIENT_CONFIG.apiKey) && window.CLIENT_CONFIG.apiKey) {
        console.log("Using Client Configuration for Firebase");
        firebaseConfig = window.CLIENT_CONFIG;
    } else {
        console.warn("CLIENT_CONFIG detected but contains placeholders. Falling back to default config.");
    }
} else {
    console.log("Using Default/Local Configuration for Firebase");
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Make app available globally if needed, or just for debugging
window.firebaseApp = app;
window.firebaseAnalytics = analytics;
window.db = db;

console.log("Firebase initialized:", app);

export { app, analytics, db };

