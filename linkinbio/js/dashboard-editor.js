// /js/dashboard-editor.js

let currentUserUid = null;
let userProfile = {};
let userLinks = [];
let unsubscribeLinks = null;

// --- Utility: Link Rendering ---

/**
 * Generates the elegant HTML structure for a single link item in the dashboard list.
 * @param {Object} link - The link object from Firestore.
 * @returns {string} The HTML string.
 */
const getLinkHtml = (link) => `
    <div data-id="${link.id}" class="flex items-center justify-between p-4 bg-gray-900 rounded-lg my-3 border border-gray-700 transition duration-200 hover:bg-gray-800/70 shadow-md">
        <div class="flex-1 min-w-0 mr-4">
            <p class="font-bold text-white text-lg truncate">${link.title}</p>
            <p class="text-sm text-gray-400 truncate">${link.url}</p>
        </div>
        
        <div class="flex items-center space-x-4">
            <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" ${link.active ? 'checked' : ''} class="sr-only peer" onchange="toggleLinkActive('${link.id}', event.target.checked)">
                <div class="w-14 h-8 bg-gray-700 rounded-full peer peer-checked:bg-white transition duration-300 after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-black after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:after:translate-x-full"></div>
                <span class="ml-3 text-sm font-medium text-gray-300">${link.active ? 'LIVE' : 'OFF'}</span>
            </label>
            
            <button onclick="deleteLink('${link.id}')" class="text-red-400 hover:text-red-300 p-2 rounded-full hover:bg-gray-700 transition">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3"></path></svg>
            </button>
        </div>
    </div>
`;

/**
 * Renders the current list of links to the DOM.
 */
function renderLinks() {
    const listEl = document.getElementById('link-list');
    if (!listEl) return;
    
    listEl.innerHTML = '';
    
    // Sort links by 'order' (which simulates drag-and-drop order)
    userLinks.sort((a, b) => a.order - b.order).forEach(link => {
        listEl.innerHTML += getLinkHtml(link);
    });
}


// --- Firebase Data Fetching and Real-time Listeners ---

/**
 * Fetches user profile data and sets up a real-time listener for the links subcollection.
 * @param {string} uid - The current user's Firebase UID.
 */
function fetchUserData(uid) {
    currentUserUid = uid;
    const profileRef = db.collection('users').doc(uid);
    
    // 1. Real-time Profile Listener (Updates fields immediately if changed)
    profileRef.onSnapshot(doc => {
        if (doc.exists) {
            userProfile = doc.data();
            document.getElementById('display-name-input').value = userProfile.displayName || '';
            document.getElementById('bio-input').value = userProfile.bio || '';
            document.getElementById('profile-url-input').value = userProfile.profileImageUrl || '';
            
            const publicLink = `${window.location.origin}/profile.html?username=${userProfile.username}`;
            document.getElementById('public-link-display').textContent = publicLink;
            document.getElementById('public-link-display').href = publicLink;
        }
    });

    // 2. Real-time Link Listener (Updates the list whenever a link is added, deleted, or updated)
    if (unsubscribeLinks) unsubscribeLinks(); // Clean up previous listener if switching users
    
    const linksRef = profileRef.collection('links').orderBy('order', 'asc');
    
    unsubscribeLinks = linksRef.onSnapshot(snapshot => {
        userLinks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderLinks();
    }, error => {
        console.error("Link snapshot error:", error);
        alert("Error loading your links. Please refresh.");
    });
}


// --- CRUD Operations ---

/**
 * Updates the user's profile information in Firestore.
 */
async function updateProfile() {
    if (!currentUserUid) return alert('User not authenticated.');

    const displayName = document.getElementById('display-name-input').value;
    const bio = document.getElementById('bio-input').value;
    const profileImageUrl = document.getElementById('profile-url-input').value;

    try {
        await db.collection('users').doc(currentUserUid).update({ displayName, bio, profileImageUrl });
        
        // Use the native browser alert for simplicity in a static project
        alert('✅ Profile updated successfully!'); 
    } catch (e) {
        console.error("Profile update failed:", e);
        alert('❌ Failed to update profile. Check your input and network connection.');
    }
}

/**
 * Adds a new link document to the user's links subcollection.
 */
async function addNewLink() {
    if (!currentUserUid) return;

    const title = document.getElementById('new-link-title').value.trim();
    const url = document.getElementById('new-link-url').value.trim();

    if (!title || !url) return alert('Please enter both title and URL.');
    if (!url.startsWith('http')) return alert('URL must start with http:// or https://');

    // Calculate the next order number to append the link to the bottom
    const newOrder = userLinks.length > 0 ? Math.max(...userLinks.map(l => l.order)) + 1 : 1;

    try {
        await db.collection('users').doc(currentUserUid).collection('links').add({
            title, 
            url, 
            order: newOrder, 
            active: true
        });
        
        // Clear inputs on success
        document.getElementById('new-link-title').value = '';
        document.getElementById('new-link-url').value = '';

    } catch (e) {
        console.error("Add link failed:", e);
        alert('❌ Could not add link. Please try again.');
    }
}

/**
 * Toggles the 'active' status of a link.
 */
async function toggleLinkActive(linkId, isActive) {
    if (!currentUserUid) return;
    try {
        await db.collection('users').doc(currentUserUid).collection('links').doc(linkId).update({ active: isActive });
    } catch (e) {
        console.error("Toggle link failed:", e);
        alert('❌ Failed to toggle link status.');
    }
}

/**
 * Deletes a link from the subcollection.
 */
async function deleteLink(linkId) {
    if (!currentUserUid) return;
    if (!confirm('Are you sure you want to permanently delete this link?')) return;

    try {
        await db.collection('users').doc(currentUserUid).collection('links').doc(linkId).delete();
    } catch (e) {
        console.error("Delete link failed:", e);
        alert('❌ Failed to delete link.');
    }
}


// --- Initialization ---

// Note: The main call to fetchUserData(user.uid) is deliberately intercepted 
// in the <script> block of dashboard.html to manage the loading screen transition.
// The auth.js observer ensures the user is present before this script runs.
