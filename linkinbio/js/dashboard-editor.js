// /js/dashboard-editor.js

let currentUserUid = null;
window.userProfile = {}; // Global store for profile data
let userLinks = [];

// CRITICAL: Set your actual public profile URL base
const PUBLIC_BASE_URL = "https://garbage.qzz.io/linkinbio/profile.html"; 


// --- 1. DATA LOADING AND INITIALIZATION ---
async function fetchUserData(uid) {
    currentUserUid = uid;
    
    let profileDoc = await db.collection('users').doc(uid).get();
    
    // Self-healing logic for missing profile: initializes with a default username
    if (!profileDoc.exists) {
        console.warn("Profile document missing. Creating default profile.");
        await db.collection('users').doc(uid).set({
            email: auth.currentUser.email,
            displayName: auth.currentUser.email.split('@')[0] || 'My LinkShare Profile', 
            username: `user_${uid.substring(0, 8)}`, // Initial unique ID
            bio: "Check out my links!",
            profileImageUrl: "https://raw.githubusercontent.com/frthetrash/frthetrash.github.io/refs/heads/main/png.png",
            templateId: 'dark-teal',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        profileDoc = await db.collection('users').doc(uid).get(); 
    } 
    window.userProfile = profileDoc.data();

    // Fetch Links Data 
    const linksSnapshot = await db.collection('users').doc(uid).collection('links').orderBy('order', 'asc').get();
    userLinks = linksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    updateUIFromProfile();
    renderLinksList();
}

/**
 * Updates all static UI elements based on the fetched profile data.
 */
function updateUIFromProfile() {
    
    // Set Public Link Display in the Sidebar
    const publicLinkEl = document.getElementById('public-link-display');
    const username = window.userProfile.username || 'loading...';
    const profileUrl = `${PUBLIC_BASE_URL}?username=${username}`;
    
    if (publicLinkEl) {
        publicLinkEl.textContent = `${username}`; // Only show the username part
        publicLinkEl.href = profileUrl;
    }

    // Populate Editor Inputs
    const elements = {
        'username-input': username,
        'display-name-input': window.userProfile.displayName || '',
        'bio-input': window.userProfile.bio || '',
        'profile-image-input': window.userProfile.profileImageUrl || '',
        'template-select': window.userProfile.templateId || 'dark-teal'
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.value = value;
    }
}


// --- 2. CORE ACTIONS: SAVE, PREVIEW, AND USERNAME LOGIC ---

/**
 * Handles all changes from the dashboard and performs save/preview actions.
 * @param {string} action - 'save' or 'preview'
 */
window.saveAllChanges = async (action) => {
    // Collect all inputs
    const newUsername = document.getElementById('username-input').value.toLowerCase().trim();
    const displayName = document.getElementById('display-name-input').value.trim();
    const bio = document.getElementById('bio-input').value.trim().substring(0, 100);
    const imageUrl = document.getElementById('profile-image-input').value.trim();
    const templateId = document.getElementById('template-select').value;
    const errorEl = document.getElementById('username-error-message');
    
    const oldUsername = window.userProfile.username;
    errorEl.textContent = '';
    
    // --- 2.1 VALIDATION ---
    if (newUsername.length < 3 || displayName.length < 3) {
        errorEl.textContent = 'Username and Display Name must be at least 3 characters.';
        return;
    }
    if (!/^[a-z0-9_-]+$/.test(newUsername)) {
        errorEl.textContent = 'Username can only contain lowercase letters, numbers, hyphen (-), and underscore (_).';
        return;
    }

    let updates = { displayName, bio, profileImageUrl: imageUrl, templateId };
    let usernameChanged = false;

    // --- 2.2 USERNAME CHANGE LOGIC WITH WARNING ---
    if (newUsername !== oldUsername) {
        usernameChanged = true;

        const confirmChange = confirm(
            `⚠️ WARNING: You are changing your public link ID.\n\n` + 
            `Your old link (linkshare.com/${oldUsername}) will STOP working.\n\n` + 
            `Do you want to proceed with the new link ID: ${newUsername}?`
        );
        
        if (!confirmChange) {
            document.getElementById('username-input').value = oldUsername; // Revert input field
            return;
        }

        // Check uniqueness for the NEW username
        try {
            const userQuery = await db.collection('users').where('username', '==', newUsername).limit(1).get();
            if (!userQuery.empty && userQuery.docs[0].id !== currentUserUid) {
                errorEl.textContent = 'That username is already taken. Try another.';
                return;
            }
        } catch(e) {
            console.error("Username Check Failed:", e);
            errorEl.textContent = 'Could not verify username availability.';
            return;
        }

        updates.username = newUsername;
    }

    // --- 2.3 EXECUTION ---
    try {
        await db.collection('users').doc(currentUserUid).set(updates, { merge: true });

        // Update local state and UI
        window.userProfile = { ...window.userProfile, ...updates };
        updateUIFromProfile();

        // Check if any links need saving (though link CRUD handles itself, good practice)
        // If links were modified but not explicitly saved, they remain in the list
        // and are available for the profile.

        alert(`Profile details and links saved successfully!${usernameChanged ? ' (Link ID updated)' : ''}`);

        // --- 2.4 LIVE PREVIEW ACTION ---
        if (action === 'preview') {
            const profileUrl = `${PUBLIC_BASE_URL}?username=${window.userProfile.username}`;
            window.open(profileUrl, '_blank');
        }

    } catch (e) {
        console.error("Error saving all changes:", e);
        alert("Failed to save all changes. Check console.");
    }
}


// --- 3. LINKS MANAGEMENT (CRUD) ---

/**
 * Adds a new link to Firestore and the local array.
 */
window.addLink = async () => {
    const titleInput = document.getElementById('new-link-title');
    const urlInput = document.getElementById('new-link-url');
    
    if (!titleInput || !urlInput) return alert("Error: Link input fields not found.");

    const title = titleInput.value.trim();
    let url = urlInput.value.trim();

    if (!title || title.length < 2 || url.length < 5) return alert("Please provide a valid title and URL.");
    if (!url.startsWith('http')) url = 'https://' + url; 

    try {
        // Find the next highest order value
        const maxOrder = userLinks.reduce((max, link) => (link.order > max ? link.order : max), -1);
        const newOrder = maxOrder + 1;
        
        const newLinkRef = await db.collection('users').doc(currentUserUid).collection('links').add({
            title: title,
            url: url,
            order: newOrder,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        userLinks.push({ id: newLinkRef.id, title, url, order: newOrder });

        titleInput.value = '';
        urlInput.value = '';
        renderLinksList();
        alert('Link added! Click "Save & Live Preview" to publish.');

    } catch (e) {
        console.error("Error adding link:", e);
        alert("Failed to add link.");
    }
}

/**
 * Deletes a link from Firestore and the local array.
 */
window.deleteLink = async (linkId) => {
    if (!confirm("Are you sure you want to delete this link?")) return;

    try {
        await db.collection('users').doc(currentUserUid).collection('links').doc(linkId).delete();

        userLinks = userLinks.filter(link => link.id !== linkId);
        renderLinksList();

    } catch (e) {
        console.error("Error deleting link:", e);
        alert("Failed to delete link.");
    }
}

/**
 * Renders the list of links in the links-list div.
 */
function renderLinksList() {
    const listEl = document.getElementById('links-list');
    if (!listEl) return;
    
    listEl.innerHTML = ''; 

    if (userLinks.length === 0) {
        listEl.innerHTML = '<p class="text-gray-500 text-center p-8">No links yet. Add one above!</p>';
        return;
    }

    userLinks.forEach(link => {
        const div = document.createElement('div');
        // Styling matches the Black & Teal theme
        div.className = 'flex items-center justify-between p-4 rounded-lg bg-[#374151] border border-[#4B5563] shadow-md';
        div.innerHTML = `
            <div class="flex-grow min-w-0 pr-4">
                <p class="font-semibold truncate text-white">${link.title}</p>
                <a href="${link.url}" target="_blank" class="text-teal-accent text-sm truncate hover:underline">${link.url}</a>
            </div>
            <div class="flex space-x-2">
                <button onclick="deleteLink('${link.id}')" class="text-red-400 hover:text-red-500 transition p-1" title="Delete Link">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 10-2 0v6a1 1 0 102 0V8z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
        `;
        listEl.appendChild(div);
    });
}


// --- 4. AUTH STATE INTEGRATION ---
window.fetchUserData = fetchUserData; 

auth.onAuthStateChanged(user => {
    if (user) {
        fetchUserData(user.uid);
    } 
    // Logged out state is handled by auth.js redirect
});
