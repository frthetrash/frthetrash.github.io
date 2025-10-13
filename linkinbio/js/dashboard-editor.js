// /js/dashboard-editor.js

// NOTE: Relies on global variables 'auth', 'db' from firebase-config.js.

let currentUserUid = null;
window.userProfile = {}; // CRITICAL: Made global
let userLinks = [];

const PUBLIC_BASE_URL = "https://garbage.qzz.io/linkinbio/profile.html"; // Your specific base URL


// --- 1. DATA LOADING AND INITIALIZATION ---

/**
 * Fetches user profile data and links from Firestore.
 * @param {string} uid - The Firebase User ID.
 */
async function fetchUserData(uid) {
    currentUserUid = uid;
    
    // 1. Fetch Profile Data
    let profileDoc = await db.collection('users').doc(uid).get();
    
    // FIX: If the document is missing, create it immediately (Self-healing logic)
    if (!profileDoc.exists) {
        console.warn("Profile document missing. Attempting to create default profile.");
        
        await db.collection('users').doc(uid).set({
            email: auth.currentUser.email,
            displayName: auth.currentUser.email.split('@')[0], 
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            // Ensure a default username is set if none exists
            username: `user_${uid.substring(0, 8)}`, 
            isUsernameSet: true, // We assume initial setup is complete now
            bio: "Check out my links!",
            profileImageUrl: "https://raw.githubusercontent.com/frthetrash/frthetrash.github.io/refs/heads/main/png.png",
            templateId: 'vibrant',
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });

        profileDoc = await db.collection('users').doc(uid).get(); 
        if (!profileDoc.exists) return console.error("Failed to initialize profile document.");
    } 
    window.userProfile = profileDoc.data();

    // 2. Fetch Links Data 
    const linksSnapshot = await db.collection('users').doc(uid).collection('links').orderBy('order', 'asc').get();
    userLinks = linksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 3. Set up the UI
    updateUIFromProfile();
    renderLinksList();
    
    reloadPreview(); 
}

/**
 * Updates all static UI elements based on the fetched profile data.
 */
function updateUIFromProfile() {
    
    // Set Public Link Display
    const publicLinkEl = document.getElementById('public-link-display');
    const profileUrl = `${PUBLIC_BASE_URL}?username=${window.userProfile.username}`;
    publicLinkEl.textContent = profileUrl;
    publicLinkEl.href = profileUrl;

    // Appearance Tab Inputs
    document.getElementById('username-input').value = window.userProfile.username || '';
    document.getElementById('display-name-input').value = window.userProfile.displayName || ''; 
    document.getElementById('bio-input').value = window.userProfile.bio || '';
    document.getElementById('profile-image-input').value = window.userProfile.profileImageUrl || '';
    document.getElementById('template-select').value = window.userProfile.templateId || 'vibrant';
}


// --- 2. PROFILE & DESIGN MANAGEMENT (Combined Save Function) ---

/**
 * Handles all changes from the Appearance tab, including username warning.
 */
window.saveAllProfileChanges = async () => {
    const newUsername = document.getElementById('username-input').value.toLowerCase().trim();
    const oldUsername = window.userProfile.username;
    
    const displayName = document.getElementById('display-name-input').value.trim();
    const bio = document.getElementById('bio-input').value.trim().substring(0, 100);
    const imageUrl = document.getElementById('profile-image-input').value.trim();
    const templateId = document.getElementById('template-select').value;
    const errorEl = document.getElementById('username-error-message');
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

    // --- 2.2 USERNAME CHANGE LOGIC WITH WARNING POPUP ---
    let usernameChanged = false;
    if (newUsername !== oldUsername) {
        usernameChanged = true;

        const confirmChange = confirm(
            `WARNING: Changing your username will change your public link from:\n\n` + 
            `-> ${PUBLIC_BASE_URL}?username=${oldUsername}\n\n` + 
            `TO:\n\n` + 
            `-> ${PUBLIC_BASE_URL}?username=${newUsername}\n\n` + 
            `Any old links you have shared will STOP working. Do you want to proceed?`
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

        alert(`Profile saved successfully!${usernameChanged ? ' (Link updated)' : ''}`);
        reloadPreview();

    } catch (e) {
        console.error("Error updating profile:", e);
        alert("Failed to save profile changes. Check console.");
    }
}


// --- 3. LINKS MANAGEMENT ---

/**
 * Adds a new link to Firestore and the local array.
 */
window.addLink = async () => {
    const titleInput = document.getElementById('new-link-title');
    const urlInput = document.getElementById('new-link-url');
    
    const title = titleInput.value.trim();
    let url = urlInput.value.trim();

    if (!title || title.length < 2 || url.length < 5) return alert("Please provide a valid title and URL.");
    if (!url.startsWith('http')) url = 'https://' + url; // Basic safety check

    try {
        // Calculate the next order index
        const newOrder = userLinks.length > 0 ? userLinks[userLinks.length - 1].order + 1 : 0;
        
        const newLinkRef = await db.collection('users').doc(currentUserUid).collection('links').add({
            title: title,
            url: url,
            order: newOrder,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Add to local state
        userLinks.push({ id: newLinkRef.id, title, url, order: newOrder });

        // Clear inputs and refresh UI
        titleInput.value = '';
        urlInput.value = '';
        renderLinksList();
        reloadPreview();

    } catch (e) {
        console.error("Error adding link:", e);
        alert("Failed to add link. Check console.");
    }
}

/**
 * Removes a link from Firestore and the local array.
 */
window.deleteLink = async (linkId) => {
    if (!confirm("Are you sure you want to delete this link?")) return;

    try {
        await db.collection('users').doc(currentUserUid).collection('links').doc(linkId).delete();

        // Remove from local state and update UI
        userLinks = userLinks.filter(link => link.id !== linkId);
        renderLinksList();
        reloadPreview();

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
    listEl.innerHTML = ''; // Clear existing list

    if (userLinks.length === 0) {
        listEl.innerHTML = '<p class="text-gray-500 text-center p-8">No links yet. Add one above!</p>';
        return;
    }

    userLinks.forEach(link => {
        const div = document.createElement('div');
        // Tailwind styling for the list item (Emerald Green styling)
        div.className = 'flex items-center justify-between p-4 rounded-lg bg-[#2D3748] border border-[#4A5568] shadow-lg';
        div.innerHTML = `
            <div class="flex-grow min-w-0 pr-4">
                <p class="font-semibold truncate text-white">${link.title}</p>
                <a href="${link.url}" target="_blank" class="text-[#38A169] text-sm truncate hover:text-[#2F855A]">${link.url}</a>
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

// Note: fetchUserData is exposed globally for use in dashboard.html's inline script
window.fetchUserData = fetchUserData; 

// This observer initializes the dashboard after the user is confirmed logged in.
auth.onAuthStateChanged(user => {
    if (user) {
        fetchUserData(user.uid);
    } 
    // Logged out state is handled by auth.js redirect
});
