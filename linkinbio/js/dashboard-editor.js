// /js/dashboard-editor.js

// NOTE: Relies on global variables 'auth', 'db', and function 'reloadPreview()' 
// being defined in firebase-config.js and dashboard.html.

let currentUserUid = null;
window.userProfile = {}; // Made global for dashboard.html script access (CRITICAL for setup check)
let userLinks = [];

// --- 1. DATA LOADING AND INITIALIZATION ---

/**
 * Fetches user profile data and links from Firestore.
 * This function is called by auth.js and overridden in dashboard.html for UI switching.
 * @param {string} uid - The Firebase User ID.
 */
async function fetchUserData(uid) {
    currentUserUid = uid;
    
    // 1. Fetch Profile Data
    const profileDoc = await db.collection('users').doc(uid).get();
    if (!profileDoc.exists) {
        console.error("Profile document not found.");
        return;
    }
    window.userProfile = profileDoc.data();

    // 2. Fetch Links Data (using subcollection)
    const linksSnapshot = await db.collection('users').doc(uid).collection('links').orderBy('order', 'asc').get();
    userLinks = linksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 3. Set up the UI (This runs *after* the dashboard.html script decides whether to show the setup view)
    updateUIFromProfile();
    renderLinksList();
    
    // 4. Load Live Preview
    reloadPreview();
}

/**
 * Updates all static UI elements based on the fetched profile data.
 */
function updateUIFromProfile() {
    // Top Header Display
    document.getElementById('profile-name-display').textContent = userProfile.displayName || 'User Profile';

    // Profile & Bio Tab Inputs
    document.getElementById('display-name-input').value = userProfile.displayName || '';
    document.getElementById('bio-input').value = userProfile.bio || '';
    document.getElementById('profile-image-input').value = userProfile.profileImageUrl || '';
    
    // Design Tab Input
    document.getElementById('template-select').value = userProfile.templateId || 'vibrant';
}

// --- 2. PROFILE & DESIGN MANAGEMENT (Tabs 'profile' and 'design') ---

/**
 * Saves changes to Display Name, Bio, and Image URL.
 */
async function updateProfileDetails() {
    const saveButton = document.querySelector('#tab-content-profile button');
    saveButton.disabled = true;

    const displayName = document.getElementById('display-name-input').value.trim();
    const bio = document.getElementById('bio-input').value.trim().substring(0, 100);
    const imageUrl = document.getElementById('profile-image-input').value.trim();

    if (displayName.length < 3) {
        alert("Display Name must be at least 3 characters.");
        saveButton.disabled = false;
        return;
    }

    try {
        await db.collection('users').doc(currentUserUid).set({
            displayName: displayName,
            bio: bio,
            profileImageUrl: imageUrl,
        }, { merge: true });

        // Update local state and UI
        window.userProfile.displayName = displayName;
        window.userProfile.bio = bio;
        window.userProfile.profileImageUrl = imageUrl;
        updateUIFromProfile();

        alert("Profile details saved successfully!");
        reloadPreview();

    } catch (e) {
        console.error("Error updating profile:", e);
        alert("Failed to save profile details. Check console.");
    } finally {
        saveButton.disabled = false;
    }
}

/**
 * Saves the selected design template.
 */
async function updateDesign() {
    const saveButton = document.querySelector('#tab-content-design button');
    saveButton.disabled = true;
    
    const templateId = document.getElementById('template-select').value;
    
    try {
        await db.collection('users').doc(currentUserUid).set({
            templateId: templateId
        }, { merge: true });

        window.userProfile.templateId = templateId; // Update local state
        alert(`Design template updated to '${templateId}'!`);
        reloadPreview();

    } catch (e) {
        console.error("Error updating design:", e);
        alert("Failed to save design changes.");
    } finally {
        saveButton.disabled = false;
    }
}


// --- 3. LINKS MANAGEMENT (Tab 'links') ---

/**
 * Adds a new link to Firestore and the local array.
 */
async function addLink() {
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
 * This is exposed globally via 'window.' for the inline HTML onclick.
 * @param {string} linkId - The ID of the link document.
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
        // Tailwind styling for the list item
        div.className = 'flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700 shadow-md';
        div.innerHTML = `
            <div class="flex-grow min-w-0 pr-4">
                <p class="font-semibold truncate text-white">${link.title}</p>
                <a href="${link.url}" target="_blank" class="text-indigo-400 text-sm truncate hover:text-pink-400">${link.url}</a>
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

// We rely on auth.onAuthStateChanged in auth.js to call fetchUserData(user.uid)
// when the user successfully logs in/registers and lands on dashboard.html.
auth.onAuthStateChanged(user => {
    if (user) {
        // User is logged in, begin data loading and UI setup via the fetchUserData function
        fetchUserData(user.uid);
    } else {
        // Logged out state is handled by the redirect logic in auth.js
    }
});
