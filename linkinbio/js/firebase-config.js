// /js/firebase-config.js
// NOTE: This file uses the classic (compat) SDK syntax (v8.10.1) 
// and assumes the following SDK scripts are loaded via <script> tags in your HTML:
// - firebase-app.js
// - firebase-auth.js
// - firebase-firestore.js

/**
 * Your LinkSpark Firebase Project configuration credentials.
 * These values are now correctly integrated into the compatible structure.
 */
const firebaseConfig = {
    // Replaced with your provided key
    apiKey: "AIzaSyCw9OU5XnedfZTl0cec7W2jwDwImAlD_BM",
    // Replaced with your provided domain
    authDomain: "garbage-855d8.firebaseapp.com",
    // Replaced with your provided ID
    projectId: "garbage-855d8",
    // storageBucket is included here but not actively used in the JS logic
    storageBucket: "garbage-855d8.firebasestorage.app",
    // Replaced with your provided ID
    messagingSenderId: "896417031975",
    // Replaced with your provided ID
    appId: "1:896417031975:web:0398743c9f3f57af26ab02",
    // measurementId is a v9+ concept, omitted for v8 compatibility
};

// Initialize the Firebase App using the classic SDK method
const app = firebase.initializeApp(firebaseConfig);

// Initialize Firebase Services used by LinkSpark
// These variables (auth, db) are accessible globally by subsequent scripts.
const auth = app.auth();
const db = app.firestore();

console.log("🔥 LinkSpark Firebase services initialized successfully.");
