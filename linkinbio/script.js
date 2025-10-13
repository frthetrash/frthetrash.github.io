/*
 * script.js (Final - Firebase Blueprint)
 * WARNING: THIS REQUIRES YOU TO INJECT YOUR FIREBASE CONFIGURATION
 * USING GITHUB SECRETS AND A GITHUB ACTIONS WORKFLOW.
 */

// --- Firebase Configuration Template ---
const firebaseConfig = {
    apiKey: "##FIREBASE_API_KEY##",
    authDomain: "##FIREBASE_AUTH_DOMAIN##",
    databaseURL: "https://##FIREBASE_PROJECT_ID##.firebaseio.com",
    projectId: "##FIREBASE_PROJECT_ID##",
};

// Initialize Firebase (will throw error if config is missing)
let auth;
let database;
try {
    const app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    database = firebase.database();
} catch (e) {
    console.warn("Firebase Initialization Warning: Missing configuration. Using local fallback for routing only.");
}
// --- END Firebase Configuration ---


// --- Constants and Global Variables ---
const MAX_LINKS = 5;
const PROFILE_LOCAL_FALLBACK_KEY = 'biolink_profiles_fallback'; // Used only when Firebase fails to load
let currentStep = 1;
let currentProfileKey = null; // Stores the Firebase Auth UID when logged in

// DOM Elements
const body = document.body;
const profileContainer = document.getElementById('profile-container');
const setupContainer = document.getElementById('setup-container');
const loginModal = document.getElementById('login-modal');
const setupForm = document.getElementById('profile-setup-form');
const loginForm = document.getElementById('firebase-login-form');
const linkFieldsContainer = document.getElementById('link-fields');
const setupError = document.getElementById('setup-error');
const loginError = document.getElementById('login-error');

const setupSteps = document.querySelectorAll('.setup-step');
const prevBtn = document.querySelector('.prev-btn');
const nextBtn = document.querySelector('.next-btn');

const usernameInput = document.getElementById('setup-username');
const usernameValidationStatus = document.getElementById('username-validation-status');
const setupEmailInput = document.getElementById('setup-email');
const showLoginLink = document.getElementById('show-login-link');
const showRegisterLink = document.getElementById('show-register-link');


// --- Firebase & Utility Functions ---

/**
 * Utility to get profile data based on username (FALLBACK ONLY).
 */
function getProfileDataFromLocalFallback(username) {
    return JSON.parse(localStorage.getItem(PROFILE_LOCAL_FALLBACK_KEY) || '{}')[username] || null;
}

/**
 * BLUEPRINT: Fetch profile data from Firebase by UID.
 */
async function fetchProfileByUID(uid) {
    // In a real app:
    // const snapshot = await database.ref('profiles/' + uid).once('value');
    // return snapshot.val();

    // Local Fallback:
    const allProfiles = JSON.parse(localStorage.getItem(PROFILE_LOCAL_FALLBACK_KEY) || '{}');
    return Object.values(allProfiles).find(p => p.uid === uid);
}

/**
 * BLUEPRINT: Fetch profile data from Firebase by username.
 */
async function fetchProfileByUsername(username) {
    // In a real app: 
    // 1. Get UID: const uidSnapshot = await database.ref('usernames/' + username).once('value');
    // 2. Fetch Profile: return await fetchProfileByUID(uidSnapshot.val());

    // Local Fallback:
    return getProfileDataFromLocalFallback(username);
}

/**
 * BLUEPRINT: User Registration and Profile Storage.
 */
async function registerUserAndSaveProfile(email, password, profileData) {
    setupError.classList.add('hidden');
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;
        
        // Save to Database
        profileData.uid = uid;
        await database.ref('profiles/' + uid).set(profileData);
        await database.ref('usernames/' + profileData.username).set(uid);

        return uid;

    } catch (error) {
        throw new Error(error.message);
    }
}

/**
 * BLUEPRINT: Log the user out and clear state.
 */
function logoutUser() {
    if (auth) {
        auth.signOut();
    }
    currentProfileKey = null;
    window.location.hash = '';
    window.location.reload();
}


// --- Core View Management ---

/**
 * Handles the main view logic based on Auth state and URL hash.
 */
function handleRouting() {
    const username = window.location.hash.substring(1).toLowerCase();

    // Listen for Auth changes if Firebase is initialized
    if (auth) {
        auth.onAuthStateChanged(user => {
            if (user) {
                // Editor Mode (Logged In)
                currentProfileKey = user.uid;
                loadProfileForEditing(username); 
            } else {
                // Public Viewer Mode (Logged Out)
                currentProfileKey = null;
                handlePublicRouting(username);
            }
        });
    } else {
        // Fallback for when Firebase initialization fails
        handlePublicRouting(username);
    }
}

/**
 * Handles rendering for public, unauthenticated profiles.
 */
async function handlePublicRouting(username) {
    const profileData = await fetchProfileByUsername(username);

    // Reset visibility of auth buttons for the public
    document.getElementById('template-selector').classList.add('hidden');
    document.getElementById('edit-profile-btn').classList.add('hidden');
    document.getElementById('logout-btn').classList.add('hidden');

    if (username && profileData) {
        // Show Profile
        renderProfile(profileData);
        setupContainer.classList.add('hidden');
        loginModal.classList.add('hidden');
        profileContainer.classList.remove('hidden');
    } else {
        // Show Registration Prompt (Default)
        clearSetupForm();
        profileContainer.classList.add('hidden');
        loginModal.classList.add('hidden');
        setupContainer.classList.remove('hidden');
        updateSetupView();
    }
}

/**
 * Loads profile data for the logged-in user and enables editing UI.
 */
async function loadProfileForEditing(username) {
    // In a real app, we fetch the data associated with the currentProfileKey (UID)
    const profileData = await fetchProfileByUsername(username);
    
    if (profileData) {
        renderProfile(profileData);
        setupContainer.classList.add('hidden');
        loginModal.classList.add('hidden');
        profileContainer.classList.remove('hidden');
        
        // Enable editing UI
        document.getElementById('template-selector').classList.remove('hidden');
        document.getElementById('edit-profile-btn').classList.remove('hidden');
        document.getElementById('logout-btn').classList.remove('hidden');
    } else {
        // Logged in but no profile data found (error state)
        logoutUser();
    }
}

// ... (renderProfile, loadProfileDataIntoForm, addLinkField, displayError functions remain the same) ...

/**
 * Renders the user's profile data onto the page.
 */
function renderProfile(data) {
    // Apply Theme
    body.setAttribute('data-theme', data.theme || 'default');

    // Profile Header
    document.getElementById('user-avatar').src = data.avatarUrl;
    document.getElementById('user-name').textContent = data.displayName;
    document.getElementById('user-bio').textContent = data.bio;
    document.getElementById('user-goal').textContent = data.goal || 'User';

    // Links
    const linkButtonsContainer = document.getElementById('link-buttons');
    linkButtonsContainer.innerHTML = ''; 
    (data.links || []).forEach(link => {
        const btn = document.createElement('a');
        btn.href = link.url;
        btn.target = '_blank'; 
        btn.rel = 'noopener noreferrer';
        btn.classList.add('link-button');
        btn.innerHTML = `<i class="${link.iconClass || 'fa-solid fa-link'}"></i> ${link.label}`;
        linkButtonsContainer.appendChild(btn);
    });

    // Socials
    const socialIconsContainer = document.getElementById('social-icons');
    socialIconsContainer.innerHTML = '';
    const socialPlatforms = [
        { key: 'instagram', icon: 'fa-brands fa-instagram', urlPrefix: 'https://instagram.com/' },
        { key: 'twitter', icon: 'fa-brands fa-x-twitter', urlPrefix: 'https://x.com/' },
        { key: 'youtube', icon: 'fa-brands fa-youtube', urlPrefix: '' },
    ];

    socialPlatforms.forEach(platform => {
        let handle = data.socials[platform.key];
        if (handle) {
            const isYouTube = platform.key === 'youtube';
            if (platform.key === 'instagram' || platform.key === 'twitter') {
                handle = handle.startsWith('@') ? handle.substring(1) : handle;
            }
            const link = document.createElement('a');
            link.href = isYouTube ? handle : `${platform.urlPrefix}${handle}`;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.innerHTML = `<i class="${platform.icon}"></i>`;
            socialIconsContainer.appendChild(link);
        }
    });

    // Embeds
    const embedsContainer = document.getElementById('embeds-section');
    embedsContainer.innerHTML = '';
    if (data.embedCode) {
        const embedDiv = document.createElement('div');
        embedDiv.classList.add('embed-item');
        embedDiv.innerHTML = data.embedCode;
        embedsContainer.appendChild(embedDiv);
    }
    
    // Theme Switcher Logic (Only visible in edit mode)
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-theme') === (data.theme || 'default')) {
            btn.classList.add('active');
        }
        btn.onclick = async () => {
            if (!currentProfileKey) return; // Must be logged in to change theme

            const newTheme = btn.getAttribute('data-theme');
            body.setAttribute('data-theme', newTheme);
            
            // BLUEPRINT: Update theme in Firebase
            // await database.ref('profiles/' + currentProfileKey + '/theme').set(newTheme);

            // Local Fallback Update:
            const allProfiles = JSON.parse(localStorage.getItem(PROFILE_LOCAL_FALLBACK_KEY) || '{}');
            const targetProfile = Object.values(allProfiles).find(p => p.uid === currentProfileKey);
            if (targetProfile) {
                targetProfile.theme = newTheme;
                localStorage.setItem(PROFILE_LOCAL_FALLBACK_KEY, JSON.stringify(allProfiles));
            }


            document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
    });
}

/**
 * Helper to populate the form for editing.
 */
function loadProfileDataIntoForm(data) {
    // Clear the form and reset step
    clearSetupForm(); 
    currentStep = 1;
    updateSetupView();
    
    // 1. Details
    usernameInput.value = data.username;
    usernameInput.disabled = true; 
    setupEmailInput.value = data.email || 'user@example.com'; // Email should come from Auth context
    document.getElementById('setup-password').value = '********'; 
    document.getElementById('setup-avatar').value = data.avatarUrl;
    document.getElementById('setup-name').value = data.displayName;
    document.getElementById('setup-bio').value = data.bio;
    document.getElementById('setup-embed').value = data.embedCode;

    // 2. Goal
    const goalRadio = document.querySelector(`input[name="goal"][value="${data.goal}"]`);
    if(goalRadio) goalRadio.checked = true;

    // 3. Links (Repopulate)
    linkFieldsContainer.innerHTML = '';
    if (data.links && data.links.length > 0) {
        data.links.forEach(link => addLinkField(link));
    } else {
        addLinkField();
    }
    
    // 4. Socials
    document.getElementById('social-instagram').value = data.socials.instagram || '';
    document.getElementById('social-twitter').value = data.socials.twitter || '';
    document.getElementById('social-youtube').value = data.socials.youtube || '';
}

/**
 * Clears the profile data from the form inputs, ready for a new setup.
 */
function clearSetupForm() {
    setupForm.reset();
    linkFieldsContainer.innerHTML = '';
    addLinkField(); 
    usernameInput.disabled = false;
    currentStep = 1;
    updateSetupView();
}

/**
 * Adds a new set of link input fields to the setup form.
 */
function addLinkField(linkData = {}) {
    const currentLinks = linkFieldsContainer.querySelectorAll('.link-input-group').length;
    if (!linkData.label && currentLinks >= MAX_LINKS) { 
        alert(`You can only add up to ${MAX_LINKS} links.`);
        return;
    }

    const newGroup = document.createElement('div');
    newGroup.classList.add('link-input-group');
    const labelValue = linkData.label || '';
    const urlValue = linkData.url || '';
    const iconValue = linkData.iconClass || '';

    newGroup.innerHTML = `
        <input type="text" class="link-label" placeholder="Link Label" required value="${labelValue}">
        <input type="url" class="link-url" placeholder="URL (https://...)" required value="${urlValue}">
        <input type="text" class="link-icon" placeholder="Icon Class (e.g., fa-solid fa-code)" value="${iconValue}">
    `;
    linkFieldsContainer.appendChild(newGroup);
}

/**
 * Displays an error message in the setup form.
 */
function displayError(message) {
    setupError.textContent = `Error: ${message}`;
    setupError.classList.remove('hidden');
}


// --- Interactive Setup Logic ---

function updateSetupView() {
    setupSteps.forEach(step => step.classList.remove('active'));
    const activeStep = document.querySelector(`[data-step="${currentStep}"]`);
    if (activeStep) activeStep.classList.add('active');

    setupError.classList.add('hidden');

    prevBtn.classList.toggle('hidden', currentStep === 1);
    nextBtn.classList.toggle('hidden', currentStep === setupSteps.length);
}

function validateStep(step) {
    const currentStepElement = document.querySelector(`[data-step="${step}"]`);
    const inputs = currentStepElement.querySelectorAll('[required]');

    for (let input of inputs) {
        if (!input.value.trim() || !input.reportValidity()) {
            displayError("Please fill out all required fields in this step.");
            return false;
        }
    }

    if (step === 1) {
        const username = usernameInput.value.trim().toLowerCase();
        if (!/^[a-zA-Z0-9_]{3,18}$/.test(username)) {
            displayError("Username must be 3-18 alphanumeric characters.");
            return false;
        }
        // In a real app, this is where you'd check Firebase for username availability.
    }

    return true;
}

function handleNextStep() {
    if (validateStep(currentStep) && currentStep < setupSteps.length) {
        currentStep++;
        updateSetupView();
    }
}

function handlePrevStep() {
    if (currentStep > 1) {
        currentStep--;
        updateSetupView();
    }
}


// --- Form Handlers ---

/**
 * Handles the final form submission (Registration and Profile Save).
 */
async function handleProfileSubmit(e) {
    e.preventDefault();

    if (!validateStep(setupSteps.length)) return; 
    
    const username = usernameInput.value.trim().toLowerCase();
    const email = setupEmailInput.value.trim();
    const password = document.getElementById('setup-password').value.trim();
    
    // Final check for username availability (local fallback)
    if (getProfileDataFromLocalFallback(username)) {
        displayError(`The username "/${username}" is already taken.`);
        return;
    }

    // 1. Collect all data
    const links = [];
    linkFieldsContainer.querySelectorAll('.link-input-group').forEach(group => {
        const label = group.querySelector('.link-label').value.trim();
        const url = group.querySelector('.link-url').value.trim();
        const iconClass = group.querySelector('.link-icon').value.trim();
        if (label && url) { links.push({ label, url, iconClass }); }
    });

    const profileData = {
        username: username,
        email: email,
        goal: document.querySelector('input[name="goal"]:checked').value,
        theme: body.getAttribute('data-theme') || 'default',
        avatarUrl: document.getElementById('setup-avatar').value.trim(),
        displayName: document.getElementById('setup-name').value.trim(),
        bio: document.getElementById('setup-bio').value.trim(),
        embedCode: document.getElementById('setup-embed').value.trim(),
        links: links,
        socials: {
            instagram: document.getElementById('social-instagram').value.trim(),
            twitter: document.getElementById('social-twitter').value.trim(),
            youtube: document.getElementById('social-youtube').value.trim(),
        }
    };
    
    try {
        // BLUEPRINT: Register user and save profile to Firebase
        // await registerUserAndSaveProfile(email, password, profileData);
        
        // Local Fallback for successful registration simulation:
        const uid = `local_${Math.random().toString(36).substring(2, 9)}`; 
        profileData.uid = uid;
        let allProfiles = JSON.parse(localStorage.getItem(PROFILE_LOCAL_FALLBACK_KEY) || '{}');
        allProfiles[username] = profileData;
        localStorage.setItem(PROFILE_LOCAL_FALLBACK_KEY, JSON.stringify(allProfiles));
        
        window.location.hash = username;
        // In a real app, Firebase Auth takes over here and redirects to loadProfileForEditing

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
        // BLUEPRINT: Sign in with Firebase
        // await auth.signInWithEmailAndPassword(email, password);
        
        // Local Fallback simulation (cannot fully work without DB)
        console.warn("Simulating Login. Need real Firebase Auth.");
        loginModal.classList.add('hidden');
        window.location.hash = 'testuser'; // Redirect to a placeholder profile
        
    } catch (e) {
        loginError.textContent = `Login failed: ${e.message || "Invalid credentials."}`;
        loginError.classList.remove('hidden');
    }
    document.getElementById('login-password').value = '';
}


// --- Event Listeners and Initialization ---

// Navigation links
showLoginLink.addEventListener('click', (e) => { e.preventDefault(); setupContainer.classList.add('hidden'); loginModal.classList.remove('hidden'); });
showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); loginModal.classList.add('hidden'); setupContainer.classList.remove('hidden'); clearSetupForm(); });

// Form submissions
setupForm.addEventListener('submit', handleProfileSubmit);
loginForm.addEventListener('submit', handleFirebaseLogin);
document.getElementById('logout-btn').addEventListener('click', logoutUser); 

// Edit Profile Button (Loads the interactive form with current data)
document.getElementById('edit-profile-btn').addEventListener('click', async () => {
    const username = window.location.hash.substring(1).toLowerCase();
    const profileData = await fetchProfileByUsername(username);
    if (profileData) {
        setupContainer.classList.remove('hidden');
        profileContainer.classList.add('hidden');
        loadProfileDataIntoForm(profileData);
    }
});

// Interactive Setup Navigation
nextBtn.addEventListener('click', handleNextStep);
prevBtn.addEventListener('click', handlePrevStep);

// Username Validation Interaction
usernameInput.addEventListener('input', async () => {
    const username = usernameInput.value.trim().toLowerCase();
    const isValid = /^[a-zA-Z0-9_]{3,18}$/.test(username);
    const profileExists = await fetchProfileByUsername(username); // Real check needed here

    if (isValid && !profileExists) {
        usernameValidationStatus.textContent = "✅ Name is available!";
        usernameValidationStatus.classList.add('username-valid');
    } else if (profileExists) {
        usernameValidationStatus.textContent = `❌ The name "/${username}" is taken.`;
        usernameValidationStatus.classList.remove('username-valid');
    } else {
        usernameValidationStatus.textContent = "Choose a unique name (3-18 alpha-numeric).";
        usernameValidationStatus.classList.remove('username-valid');
    }
});

// Initial Call
handleRouting();

console.log('BioLink System Ready. Next step: Implement Firebase and GitHub Secrets.');
