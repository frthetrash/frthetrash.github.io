/*
 * script.js (Updated for Firebase Blueprint)
 * WARNING: THIS REQUIRES YOU TO ADD YOUR FIREBASE CONFIGURATION.
 * The functions below are placeholders for real Firebase SDK calls.
 */

// --- Firebase Configuration ---
// !!! IMPORTANT: REPLACE WITH YOUR ACTUAL FIREBASE CONFIG !!!
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
};

// Initialize Firebase (will throw error if config is missing)
let auth;
let database;
try {
    const app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    database = firebase.database();
} catch (e) {
    console.error("Firebase Initialization Failed. Please update firebaseConfig.", e);
}
// --- END Firebase Configuration ---


// --- Constants and Global Variables ---
const MAX_LINKS = 5;
let currentStep = 1;
let currentProfileKey = null; // Stores the unique profile ID (e.g., the Firebase Auth UID)

// DOM Elements
// ... (All previous DOM element declarations remain the same) ...
const setupSteps = document.querySelectorAll('.setup-step');
const prevBtn = document.querySelector('.prev-btn');
const nextBtn = document.querySelector('.next-btn');
const loginForm = document.getElementById('firebase-login-form');
const showLoginLink = document.getElementById('show-login-link');
const showRegisterLink = document.getElementById('show-register-link');
const setupEmailInput = document.getElementById('setup-email');


// --- Utility Functions ---

/**
 * Utility to get profile data based on username.
 * In a real Firebase app, this would query the Database by username.
 */
function getProfileData(username) {
    // This function will rely on a Firebase database call in the final version.
    // For local testing BEFORE Firebase is implemented, we revert to localStorage for basic routing.
    return JSON.parse(localStorage.getItem('biolink_profiles') || '{}')[username] || null;
}

// ... (clearSetupForm and addLinkField remain the same) ...

// --- Firebase Authentication Placeholders ---

/**
 * Blueprint for user registration and profile data storage.
 */
async function registerUserAndSaveProfile(email, password, profileData) {
    try {
        // 1. Firebase Auth: Register the user
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;
        
        // 2. Firebase Database: Save the profile data using UID as the key
        const profileRef = database.ref('profiles/' + uid);
        await profileRef.set(profileData);
        
        // 3. Optional: Map username to UID for public URL routing
        const usernameRef = database.ref('usernames/' + profileData.username);
        await usernameRef.set(uid);

        console.log("Registration successful. UID:", uid);
        return uid;

    } catch (error) {
        console.error("Firebase Registration Error:", error.message);
        throw new Error(error.message);
    }
}

/**
 * Blueprint for user login.
 */
async function loginUser(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        return userCredential.user.uid;
    } catch (error) {
        console.error("Firebase Login Error:", error.message);
        throw new Error(error.message);
    }
}

/**
 * Blueprint for logging out.
 */
function logoutUser() {
    auth.signOut();
    currentProfileKey = null;
    window.location.hash = '';
    window.location.reload();
}
// --- END Firebase Authentication Placeholders ---


// --- Routing and View Management ---

/**
 * Handles the main routing logic, checking for the public profile URL and Auth state.
 */
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in (Editor mode)
        currentProfileKey = user.uid;
        loadProfileFromDatabase(user.uid, true); // Load data and enable editing features
    } else {
        // User is signed out (Public Viewer mode or initial state)
        currentProfileKey = null;
        handlePublicRouting(); 
    }
});

/**
 * Handles rendering for public, unauthenticated profiles based on the URL hash.
 */
function handlePublicRouting() {
    const username = window.location.hash.substring(1).toLowerCase();
    
    // In a final app, this would call a Firebase Database query: 
    // const profileData = await getProfileDataByUsername(username);
    const profileData = getProfileData(username); // Fallback to localStorage for now

    if (username && profileData) {
        // Public Profile View
        renderProfile(profileData);
        setupContainer.classList.add('hidden');
        loginModal.classList.add('hidden');
        profileContainer.classList.remove('hidden');
    } else {
        // Default View: Show Registration
        clearSetupForm();
        profileContainer.classList.add('hidden');
        loginModal.classList.add('hidden');
        setupContainer.classList.remove('hidden');
        updateSetupView();
    }
}

/**
 * Loads profile data from the database (UID) and renders it.
 * @param {string} uid - The Firebase Auth User ID.
 * @param {boolean} isEditor - If true, enables edit/logout buttons.
 */
function loadProfileFromDatabase(uid, isEditor) {
    // In a real app: database.ref('profiles/' + uid).once('value').then(snapshot => { ...
    
    // For local testing: 
    const allProfiles = JSON.parse(localStorage.getItem('biolink_profiles') || '{}');
    const profileData = Object.values(allProfiles).find(p => p.uid === uid);
    
    if (profileData) {
        renderProfile(profileData);
        setupContainer.classList.add('hidden');
        loginModal.classList.add('hidden');
        profileContainer.classList.remove('hidden');
        
        // Show/Hide editing features based on Auth status
        document.getElementById('template-selector').classList.toggle('hidden', !isEditor);
        document.getElementById('edit-profile-btn').classList.toggle('hidden', !isEditor);
        document.getElementById('logout-btn').classList.toggle('hidden', !isEditor);
    } else {
        // User is logged in but profile data is missing (e.g., new registration but save failed)
        // Redirect to initial setup or error page
        handlePublicRouting();
    }
}
// ... (renderProfile, updateSetupView, validateStep, handleNextStep, handlePrevStep remain the same) ...


// --- Setup & Login Form Handlers ---

/**
 * Handles the final form submission (Registration and Profile Save).
 */
async function handleProfileSubmit(e) {
    e.preventDefault();
    if (!validateStep(setupSteps.length)) return; 
    
    const username = usernameInput.value.trim().toLowerCase();
    const email = setupEmailInput.value.trim();
    const password = document.getElementById('setup-password').value.trim();
    
    // Check if username is already mapped (requires a Firebase database check)
    // For now, rely on local storage check:
    const existingProfile = getProfileData(username);
    if (existingProfile) {
        displayError(`The username "/${username}" is already taken.`);
        return;
    }

    const profileData = {
        username: username,
        email: email,
        goal: document.querySelector('input[name="goal"]:checked').value,
        theme: body.getAttribute('data-theme') || 'default',
        avatarUrl: document.getElementById('setup-avatar').value.trim(),
        displayName: document.getElementById('setup-name').value.trim(),
        bio: document.getElementById('setup-bio').value.trim(),
        embedCode: document.getElementById('setup-embed').value.trim(),
        // ... (links and socials collection logic) ...
    };
    
    // Placeholder call to Firebase registration
    try {
        // const uid = await registerUserAndSaveProfile(email, password, profileData);
        // Fallback for client-side local testing:
        const uid = `local_${Math.random().toString(36).substring(2, 9)}`; 
        profileData.uid = uid;
        let allProfiles = JSON.parse(localStorage.getItem('biolink_profiles') || '{}');
        allProfiles[username] = profileData;
        localStorage.setItem('biolink_profiles', JSON.stringify(allProfiles));
        
        console.log("Registered/Saved locally. Next step is real Firebase.");
        window.location.hash = username;

    } catch (e) {
        displayError(`Registration failed: ${e.message}`);
    }
}

/**
 * Handles the Firebase login attempt.
 */
async function handleFirebaseLogin(e) {
    e.preventDefault();
    loginError.classList.add('hidden');

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();

    try {
        // const uid = await loginUser(email, password);
        // loadProfileFromDatabase(uid, true);
        
        // Fallback local login: find matching email/password hash (if we stored it)
        console.log("Simulating Login successful. Please implement Firebase.");
        loginModal.classList.add('hidden');
        
        // For local simulation, we must figure out *which* profile they logged into.
        // This relies on the database, which we don't have. We'll simply redirect to a known profile hash.
        window.location.hash = 'testuser'; 

    } catch (e) {
        loginError.textContent = `Login failed: ${e.message || "Invalid credentials."}`;
        loginError.classList.remove('hidden');
    }
    document.getElementById('login-password').value = '';
}

// ... (loadProfileForEditing and handleDeleteProfile removed, as they rely on client-side password) ...


// --- Event Listeners and Initialization ---

// Navigation links
showLoginLink.addEventListener('click', (e) => { e.preventDefault(); setupContainer.classList.add('hidden'); loginModal.classList.remove('hidden'); });
showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); loginModal.classList.add('hidden'); setupContainer.classList.remove('hidden'); clearSetupForm(); });

// Form submissions
setupForm.addEventListener('submit', handleProfileSubmit);
loginForm.addEventListener('submit', handleFirebaseLogin);
document.getElementById('logout-btn').addEventListener('click', logoutUser); 
document.getElementById('edit-profile-btn').addEventListener('click', () => {
    // When editing, redirect to the setup form with the current data loaded
    if (currentProfileKey) {
        // In a real app, you'd fetch the latest data before loading the form
        const profileData = getProfileData(window.location.hash.substring(1).toLowerCase());
        if (profileData) loadProfileDataIntoForm(profileData);
    }
});

// Interactive Setup Navigation
nextBtn.addEventListener('click', handleNextStep);
prevBtn.addEventListener('click', handlePrevStep);

// Initial Call
// The auth.onAuthStateChanged listener now controls the initial state, 
// but we call handlePublicRouting initially to check for an existing hash before Auth loads.
handlePublicRouting(); 

console.log('BioLink System Initialized: Firebase blueprint ready for implementation.');
