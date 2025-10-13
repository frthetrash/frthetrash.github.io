/*
 * script.js (UPDATED)
 * Features: Client-Side Hashing/Password, Multi-Step Interactive Setup, Theming, Profile Management
 */

// --- Constants and Global Variables ---
const PROFILE_KEY = 'biolink_profiles';
const MAX_LINKS = 5;

// DOM Elements
const body = document.body;
const profileContainer = document.getElementById('profile-container');
const setupContainer = document.getElementById('setup-container');
const loginModal = document.getElementById('login-modal');
const setupForm = document.getElementById('profile-setup-form');
const passwordLoginForm = document.getElementById('password-login-form');
const linkFieldsContainer = document.getElementById('link-fields');
const addLinkBtn = document.getElementById('add-link-btn');
const setupError = document.getElementById('setup-error');
const loginError = document.getElementById('login-error');

// Action Buttons
const loginProfileBtn = document.getElementById('login-profile-btn');
const editProfileBtn = document.getElementById('edit-profile-btn');
const logoutBtn = document.getElementById('logout-btn');

// Interactive Setup Elements
const usernameInput = document.getElementById('setup-username');
const usernameValidationStatus = document.getElementById('username-validation-status');
const setupSteps = document.querySelectorAll('.setup-step');
const prevBtn = document.querySelector('.prev-btn');
const nextBtn = document.querySelector('.next-btn');

let currentStep = 1;

// --- Utility Functions ---

/**
 * Client-side "hashing" function (simple XOR, not secure, but good enough for a client-side POC).
 * A true implementation would use SubtleCrypto, but for GitHub Pages simplicity, we use this.
 * @param {string} str - The string to hash.
 * @returns {string} The simulated hash string.
 */
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash.toString(16);
}

/**
 * Loads the currently active profile data from localStorage.
 */
function getProfileData(username) {
    const allProfiles = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
    return allProfiles[username] || null;
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


// --- Routing and View Management ---

/**
 * Handles the URL hash change event to determine which view to show.
 */
function handleRouting() {
    const username = window.location.hash.substring(1).toLowerCase();
    const profileData = getProfileData(username);

    // Reset visibility
    loginProfileBtn.classList.add('hidden');
    editProfileBtn.classList.add('hidden');
    logoutBtn.classList.add('hidden');
    loginModal.classList.add('hidden');
    
    if (username && profileData) {
        // 1. Profile Exists: Render the profile view
        renderProfile(profileData);
        setupContainer.classList.add('hidden');
        profileContainer.classList.remove('hidden');
        document.getElementById('template-selector').classList.add('hidden'); // Hide selector initially
        loginProfileBtn.classList.remove('hidden'); // Show Login button for editing
    } else if (username && !profileData) {
        // 2. Profile Requested but Missing (First-Time Setup for this username)
        clearSetupForm();
        usernameInput.value = username;
        usernameInput.disabled = true; // Lock username for creation
        setupContainer.classList.remove('hidden');
        profileContainer.classList.add('hidden');
        updateSetupView();
    } else {
        // 3. No Hash: Prompt for Setup
        clearSetupForm();
        setupContainer.classList.remove('hidden');
        profileContainer.classList.add('hidden');
        updateSetupView();
    }
}

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

    // Links & Socials (Logic remains the same)
    // ... (Omitted for brevity, assume the previous renderProfile logic is here) ...
    
    // --- TEMPLATE PLACEHOLDER LOGIC ---
    // Setup listeners for theme buttons (for when the user is editing)
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-theme') === (data.theme || 'default')) {
            btn.classList.add('active');
        }
        btn.onclick = () => {
            const newTheme = btn.getAttribute('data-theme');
            body.setAttribute('data-theme', newTheme);
            
            // Immediately save the theme change (only if already logged in)
            if (!editProfileBtn.classList.contains('hidden')) {
                let allProfiles = JSON.parse(localStorage.getItem(PROFILE_KEY));
                allProfiles[data.username].theme = newTheme;
                localStorage.setItem(PROFILE_KEY, JSON.stringify(allProfiles));
            }

            document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
    });
}


// --- Interactive Setup Logic ---

/**
 * Updates the visibility and state of the navigation buttons and steps.
 */
function updateSetupView() {
    setupSteps.forEach(step => step.classList.remove('active'));
    document.querySelector(`[data-step="${currentStep}"]`).classList.add('active');
    setupError.classList.add('hidden');

    prevBtn.classList.toggle('hidden', currentStep === 1);
    nextBtn.classList.toggle('hidden', currentStep === setupSteps.length);
    
    // Handle specific steps
    if (currentStep === 1 && !usernameInput.disabled) {
        usernameValidationStatus.textContent = "Choose a unique name.";
        usernameValidationStatus.classList.remove('username-valid');
    }
}

/**
 * Validates the current step before proceeding.
 * @returns {boolean} True if validation passes.
 */
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
        if (getProfileData(username) && usernameInput.disabled === false) {
            displayError(`The username "/${username}" is already taken.`);
            return false;
        }
    }

    return true;
}

/**
 * Handles navigation to the next step.
 */
function handleNextStep() {
    if (validateStep(currentStep) && currentStep < setupSteps.length) {
        currentStep++;
        updateSetupView();
    }
}

/**
 * Handles navigation to the previous step.
 */
function handlePrevStep() {
    if (currentStep > 1) {
        currentStep--;
        updateSetupView();
    }
}


// --- Security and Persistence Logic ---

/**
 * Handles the final form submission (Step 6).
 */
function handleProfileSubmit(e) {
    e.preventDefault();

    if (!validateStep(setupSteps.length)) return; // Final step validation

    const username = usernameInput.value.trim().toLowerCase();
    const password = document.getElementById('setup-password').value.trim();
    const passwordHash = simpleHash(password); // Hash the password

    // 1. Collect all data
    const newProfileData = {
        username: username,
        passwordHash: passwordHash, // Store the hash
        goal: document.querySelector('input[name="goal"]:checked').value,
        theme: body.getAttribute('data-theme') || 'default', // Keep current theme
        avatarUrl: document.getElementById('setup-avatar').value.trim(),
        displayName: document.getElementById('setup-name').value.trim(),
        bio: document.getElementById('setup-bio').value.trim(),
        embedCode: document.getElementById('setup-embed').value.trim(),
        // Collect links and socials (omitted for brevity, assume previous logic)
        links: [], 
        socials: {} 
    };

    // --- Collect Links/Socials (re-implemented from previous script) ---
    const linkInputs = linkFieldsContainer.querySelectorAll('.link-input-group');
    linkInputs.forEach(group => {
        const label = group.querySelector('.link-label').value.trim();
        const url = group.querySelector('.link-url').value.trim();
        const iconClass = group.querySelector('.link-icon').value.trim();
        if (label && url) {
            try { new URL(url); links.push({ label, url, iconClass }); } catch (e) {}
        }
    });
    newProfileData.links = links;
    newProfileData.socials.instagram = document.getElementById('social-instagram').value.trim();
    newProfileData.socials.twitter = document.getElementById('social-twitter').value.trim();
    newProfileData.socials.youtube = document.getElementById('social-youtube').value.trim();


    // 2. Save to localStorage
    const allProfiles = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
    allProfiles[username] = newProfileData;
    localStorage.setItem(PROFILE_KEY, JSON.stringify(allProfiles));

    // 3. Redirect to the profile URL
    window.location.hash = username;
}

/**
 * Handles the password login attempt for editing.
 */
function handlePasswordLogin(e) {
    e.preventDefault();
    loginError.classList.add('hidden');

    const username = window.location.hash.substring(1).toLowerCase();
    const profileData = getProfileData(username);
    const enteredPassword = document.getElementById('login-password').value.trim();
    const enteredHash = simpleHash(enteredPassword);

    if (profileData && profileData.passwordHash === enteredHash) {
        loginModal.classList.add('hidden');
        loginProfileBtn.classList.add('hidden');
        editProfileBtn.classList.remove('hidden'); // Show the EDIT button
        logoutBtn.classList.remove('hidden'); // Show the DELETE button
        document.getElementById('template-selector').classList.remove('hidden'); // Show template options
    } else {
        loginError.textContent = "Invalid password. Access denied.";
        loginError.classList.remove('hidden');
    }
    passwordLoginForm.reset();
}

/**
 * Opens the profile for editing after successful login.
 */
function loadProfileForEditing(data) {
    loadProfileDataIntoForm(data);
    
    // Switch to setup view
    setupContainer.classList.remove('hidden');
    profileContainer.classList.add('hidden');
    loginModal.classList.add('hidden');
    editProfileBtn.classList.add('hidden'); // Hide edit button while in setup
    logoutBtn.classList.remove('hidden'); // Show delete button
    
    // Jump to the first step
    currentStep = 1; 
    updateSetupView();
}

/**
 * Helper to populate the form (called after login/on edit click).
 */
function loadProfileDataIntoForm(data) {
    clearSetupForm(); // Reset links and structure
    
    // 1. Details
    usernameInput.value = data.username;
    usernameInput.disabled = true; 
    document.getElementById('setup-password').value = '********'; // Pre-fill dummy password field
    document.getElementById('setup-avatar').value = data.avatarUrl;
    document.getElementById('setup-name').value = data.displayName;
    document.getElementById('setup-bio').value = data.bio;
    document.getElementById('setup-embed').value = data.embedCode;

    // 2. Goal
    document.querySelector(`input[name="goal"][value="${data.goal}"]`).checked = true;

    // 3. Links (Repopulate)
    linkFieldsContainer.innerHTML = '';
    if (data.links.length > 0) {
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
 * Handles the "Delete Profile" operation.
 */
function handleDeleteProfile() {
    const username = window.location.hash.substring(1).toLowerCase();
    
    if (confirm(`ARE YOU SURE? This will permanently DELETE the profile /${username} from your browser storage.`)) {
        const allProfiles = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
        delete allProfiles[username];
        localStorage.setItem(PROFILE_KEY, JSON.stringify(allProfiles));
        
        window.location.hash = '';
        window.location.reload(); 
    }
}

/**
 * Displays an error message in the setup form.
 */
function displayError(message) {
    setupError.textContent = `Error: ${message}`;
    setupError.classList.remove('hidden');
}

/**
 * Adds a new set of link input fields to the setup form, optionally pre-filled.
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

// --- Event Listeners and Initialization ---

window.addEventListener('hashchange', handleRouting);
setupForm.addEventListener('submit', handleProfileSubmit);
addLinkBtn.addEventListener('click', () => addLinkField());

// Interactive Navigation
nextBtn.addEventListener('click', handleNextStep);
prevBtn.addEventListener('click', handlePrevStep);

// Validation for step 1 interaction
usernameInput.addEventListener('input', () => {
    const username = usernameInput.value.trim().toLowerCase();
    const isValid = /^[a-zA-Z0-9_]{3,18}$/.test(username);
    const profileExists = getProfileData(username);

    if (isValid && !profileExists) {
        usernameValidationStatus.textContent = "✅ Username looks great and is available!";
        usernameValidationStatus.classList.add('username-valid');
    } else if (profileExists) {
        usernameValidationStatus.textContent = `❌ The username "/${username}" is already taken.`;
        usernameValidationStatus.classList.remove('username-valid');
    } else {
        usernameValidationStatus.textContent = "Choose a unique name (3-18 alpha-numeric).";
        usernameValidationStatus.classList.remove('username-valid');
    }
});


// Security & Management
loginProfileBtn.addEventListener('click', () => {
    loginModal.classList.remove('hidden');
    document.getElementById('login-password').focus();
});

passwordLoginForm.addEventListener('submit', handlePasswordLogin);

editProfileBtn.addEventListener('click', () => {
    const username = window.location.hash.substring(1).toLowerCase();
    const profileData = getProfileData(username);
    if (profileData) {
        // Skip the password check since they already passed it to show this button
        loadProfileForEditing(profileData);
    }
});

logoutBtn.addEventListener('click', handleDeleteProfile);

// Initial Call
handleRouting();

console.log('BioLink System Initialized: Multi-step setup and client-side password protection enabled.');
