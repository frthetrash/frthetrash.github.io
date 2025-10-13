/*
 * script.js
 * BioLink Client-Side Logic (Updated for Login/Logout/Edit)
 * Features: Client-Side Routing (Hash), Profile Persistence (localStorage), Dynamic Content Rendering, Profile Management
 */

// --- Constants and Global Variables ---
const PROFILE_KEY = 'biolink_profiles';
const MAX_LINKS = 5;

// DOM Elements
const profileContainer = document.getElementById('profile-container');
const setupContainer = document.getElementById('setup-container');
const setupForm = document.getElementById('profile-setup-form');
const linkFieldsContainer = document.getElementById('link-fields');
const addLinkBtn = document.getElementById('add-link-btn');
const setupError = document.getElementById('setup-error');

// Action Buttons
const editProfileBtn = document.getElementById('edit-profile-btn');
const logoutBtn = document.getElementById('logout-btn');


// --- Client-Side Routing and Main Logic ---

/**
 * Loads the currently active profile data from localStorage.
 * @param {string} username - The unique identifier from the hash.
 * @returns {object|null} The profile data or null if not found.
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
    // Ensure at least one empty link field exists for a clean start
    addLinkField(); 
    document.getElementById('setup-username').disabled = false;
    document.getElementById('setup-username').value = '';
}

/**
 * Handles the hash change event to determine which view to show (Profile or Setup).
 */
function handleRouting() {
    const username = window.location.hash.substring(1).toLowerCase();
    const profileData = getProfileData(username);

    // Reset button states
    editProfileBtn.classList.add('hidden');
    logoutBtn.classList.add('hidden');
    
    if (username && profileData) {
        // 1. Profile Exists: Render the profile view
        renderProfile(profileData);
        setupContainer.classList.add('hidden');
        profileContainer.classList.remove('hidden');
        editProfileBtn.classList.remove('hidden'); // Show Edit button for this profile
    } else if (username && !profileData) {
        // 2. Profile Requested but Missing (First-Time Setup for this username)
        clearSetupForm(); // Clear form before setting new user
        document.getElementById('setup-username').value = username;
        document.getElementById('setup-username').disabled = true; // Lock username for creation
        setupContainer.classList.remove('hidden');
        profileContainer.classList.add('hidden');
    } else {
        // 3. No Hash: Landing Page / Prompt for Setup
        clearSetupForm();
        setupContainer.classList.remove('hidden');
        profileContainer.classList.add('hidden');
        document.getElementById('setup-username').disabled = false; // Allow user to type new username
    }
}

/**
 * Populates the setup form with the existing profile data for editing.
 * This is triggered by the 'Edit' button click.
 * @param {object} data - The user's profile data.
 */
function loadProfileForEditing(data) {
    clearSetupForm();
    
    // 1. Profile Details
    document.getElementById('setup-username').value = data.username;
    document.getElementById('setup-username').disabled = true; // Cannot change username on edit
    document.getElementById('setup-avatar').value = data.avatarUrl;
    document.getElementById('setup-name').value = data.displayName;
    document.getElementById('setup-bio').value = data.bio;
    document.getElementById('setup-embed').value = data.embedCode;

    // 2. Links (Clear and Repopulate with saved data)
    linkFieldsContainer.innerHTML = '';
    if (data.links.length > 0) {
        data.links.forEach(link => {
            addLinkField(link);
        });
    } else {
        addLinkField(); // Add an empty one if no links exist
    }

    // 3. Socials
    document.getElementById('social-instagram').value = data.socials.instagram || '';
    document.getElementById('social-twitter').value = data.socials.twitter || '';
    document.getElementById('social-youtube').value = data.socials.youtube || '';

    // Switch to setup view and manage buttons
    setupContainer.classList.remove('hidden');
    profileContainer.classList.add('hidden');
    editProfileBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden'); // Show Logout when in edit mode
}

/**
 * Handles the "Logout" (Profile Clear) operation for the current user.
 */
function handleLogout() {
    const username = document.getElementById('setup-username').value.trim().toLowerCase();
    
    // Safety confirmation before deleting data
    if (confirm(`Are you sure you want to delete and log out of the profile /${username}? This action cannot be undone.`)) {
        // Load all profiles, delete the current one
        const allProfiles = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
        delete allProfiles[username];
        localStorage.setItem(PROFILE_KEY, JSON.stringify(allProfiles));
        
        // Redirect to the base URL (no hash) to prompt for new creation
        window.location.hash = '';
        window.location.reload(); 
    }
}

/**
 * Renders the user's profile data onto the page. (Function contents remain the same)
 * @param {object} data - The user's profile data.
 */
function renderProfile(data) {
    // 1. Profile Header
    document.getElementById('user-avatar').src = data.avatarUrl;
    document.getElementById('user-avatar').alt = `${data.displayName}'s Avatar`;
    document.getElementById('user-name').textContent = data.displayName;
    document.getElementById('user-bio').textContent = data.bio;

    // 2. Link Buttons
    const linkButtonsContainer = document.getElementById('link-buttons');
    linkButtonsContainer.innerHTML = ''; 
    data.links.forEach(link => {
        const btn = document.createElement('a');
        btn.href = link.url;
        btn.target = '_blank'; 
        btn.rel = 'noopener noreferrer';
        btn.classList.add('link-button');
        btn.innerHTML = `<i class="${link.iconClass || 'fa-solid fa-link'}"></i> ${link.label}`;
        linkButtonsContainer.appendChild(btn);
    });

    // 3. Social Icons
    const socialIconsContainer = document.getElementById('social-icons');
    socialIconsContainer.innerHTML = '';
    const socialPlatforms = [
        { key: 'instagram', icon: 'fa-brands fa-instagram', urlPrefix: 'https://instagram.com/' },
        { key: 'twitter', icon: 'fa-brands fa-x-twitter', urlPrefix: 'https://x.com/' },
        { key: 'youtube', icon: 'fa-brands fa-youtube', urlPrefix: '' },
        { key: 'tiktok', icon: 'fa-brands fa-tiktok', urlPrefix: 'https://tiktok.com/@' },
        { key: 'linkedin', icon: 'fa-brands fa-linkedin', urlPrefix: 'https://linkedin.com/in/' },
    ];

    socialPlatforms.forEach(platform => {
        let handle = data.socials[platform.key];
        if (handle) {
            const isYouTube = platform.key === 'youtube';
            if (platform.key === 'instagram' || platform.key === 'twitter' || platform.key === 'tiktok') {
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

    // 4. Optional Embeds
    const embedsContainer = document.getElementById('embeds-section');
    embedsContainer.innerHTML = '';
    if (data.embedCode) {
        const embedDiv = document.createElement('div');
        embedDiv.classList.add('embed-item');
        
        if (data.embedCode.includes('<iframe') || data.embedCode.includes('<blockquote')) {
            embedDiv.innerHTML = data.embedCode;
        } else if (data.embedCode.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
            const img = document.createElement('img');
            img.src = data.embedCode;
            img.alt = 'Embedded Image';
            embedDiv.appendChild(img);
        } else {
             embedDiv.innerHTML = `<p style="color:var(--color-text-muted);">Custom Content/Link: ${data.embedCode}</p>`;
        }
        
        embedsContainer.appendChild(embedDiv);
    }
}

/**
 * Validates and saves the user profile data to localStorage. (Function contents remain the same)
 * @param {Event} e - The form submission event.
 */
function handleProfileSubmit(e) {
    e.preventDefault();

    setupError.classList.add('hidden');
    const usernameInput = document.getElementById('setup-username');
    const username = usernameInput.value.trim().toLowerCase();
    
    if (!/^[a-zA-Z0-9_]{3,15}$/.test(username)) {
        displayError("Invalid username. Must be 3-15 alphanumeric characters or underscore.");
        return;
    }

    const allProfiles = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
    
    if (!usernameInput.disabled && allProfiles[username]) {
        displayError(`The username "/${username}" is already taken. Please choose another.`);
        return;
    }

    // 1. Collect Link Data
    const linkInputs = linkFieldsContainer.querySelectorAll('.link-input-group');
    const links = [];
    let linkError = false;
    linkInputs.forEach(group => {
        const label = group.querySelector('.link-label').value.trim();
        const url = group.querySelector('.link-url').value.trim();
        const iconClass = group.querySelector('.link-icon').value.trim();

        if (label && url) {
            try { new URL(url); } catch (e) {
                displayError(`Invalid URL provided for link "${label}".`);
                linkError = true;
                return;
            }
            links.push({ label, url, iconClass });
        }
    });

    if (linkError) return;


    // 2. Compile Final Profile Data
    const newProfileData = {
        username: username,
        avatarUrl: document.getElementById('setup-avatar').value.trim(),
        displayName: document.getElementById('setup-name').value.trim(),
        bio: document.getElementById('setup-bio').value.trim(),
        links: links,
        socials: {
            instagram: document.getElementById('social-instagram').value.trim(),
            twitter: document.getElementById('social-twitter').value.trim(),
            youtube: document.getElementById('social-youtube').value.trim(),
        },
        embedCode: document.getElementById('setup-embed').value.trim()
    };
    
    // 3. Save to localStorage
    allProfiles[username] = newProfileData;
    localStorage.setItem(PROFILE_KEY, JSON.stringify(allProfiles));

    // 4. Redirect to the new profile URL
    window.location.hash = username;
}

/**
 * Displays an error message in the setup form. (Function contents remain the same)
 * @param {string} message - The error message.
 */
function displayError(message) {
    setupError.textContent = `Error: ${message}`;
    setupError.classList.remove('hidden');
}

/**
 * Adds a new set of link input fields to the setup form, optionally pre-filled.
 * @param {object} [linkData] - Optional data to pre-fill the fields.
 */
function addLinkField(linkData = {}) {
    const currentLinks = linkFieldsContainer.querySelectorAll('.link-input-group').length;

    if (!linkData.label && currentLinks >= MAX_LINKS) { 
        alert(`You can only add up to ${MAX_LINKS} links.`);
        return;
    }

    const newGroup = document.createElement('div');
    newGroup.classList.add('link-input-group');
    
    // Use optional chaining/default values for pre-filling
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

// 1. Client-Side Routing Listener
window.addEventListener('hashchange', handleRouting);

// 2. Profile Setup Form Listener
setupForm.addEventListener('submit', handleProfileSubmit);

// 3. Dynamic Link Addition
addLinkBtn.addEventListener('click', () => addLinkField());

// 4. Edit and Logout Handlers
editProfileBtn.addEventListener('click', () => {
    const username = window.location.hash.substring(1).toLowerCase();
    const profileData = getProfileData(username);
    if (profileData) {
        loadProfileForEditing(profileData);
    }
});

logoutBtn.addEventListener('click', handleLogout);

// Initial Call to handle the URL on page load
handleRouting();

console.log('BioLink System Initialized with Client-Side Profile Management.');
