// /js/dashboard-editor.js

let currentUserUid = null;
let userProfile = {};
let userLinks = [];
let unsubscribeLinks = null;

// --- Utility: Link Rendering ---

/**
 * Generates the vibrant, interactive HTML structure for a single link item.
 * @param {Object} link - The link object from Firestore.
 * @returns {string} The HTML string.
 */
const getLinkHtml = (link) => `
    <div data-id="${link.id}" class="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl my-3 border border-slate-600/50 
         transition duration-200 hover:bg-slate-700 hover:shadow-lg hover:shadow-indigo-500/10">
        <div class="flex-1 min-w-0 mr-4">
            <p class="font-bold text-lg ${link.active ? 'text-white' : 'text-gray-400'} truncate">${link.title}</p>
            <p class="text-sm text-indigo-300 truncate">${link.url}</p>
        </div>
        
        <div class="flex items-center space-x-4">
            <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" ${link.active ? 'checked' : ''} class="sr-only peer" onchange="toggleLinkActive('${link.id}', event.target.checked)">
                <div class="w-12 h-6 bg-slate-600 rounded-full peer peer-checked:bg-pink-500 transition duration-300 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
            
            <button onclick="deleteLink('${link.id}')" 
                    class="text-red-400 hover:text-red-300 p-2 rounded-full hover:bg-slate-800 transition">
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
    
    // Sort links by 'order'
    userLinks.sort((a, b) => a.order - b.order).forEach(link => {
        listEl.innerHTML += getLinkHtml(link);
    });
}


// --- Firebase Data Fetching and Real-time Listeners ---

/**
 * Fetches user profile data and sets up real-time listeners.
 * @param {string} uid - The current user's Firebase UID.
 */
function fetchUserData(uid) {
    currentUserUid = uid;
    const profileRef = db.collection('users').doc(uid);
    
    // 1. Real-time Profile Listener
    profileRef.onSnapshot(doc => {
        if (doc.exists) {
            userProfile = doc.data();
            
            // Update main editor inputs
            const displayNameInput = document.getElementById('display-name-input');
            if (displayNameInput) displayNameInput.value = userProfile.displayName || '';
            
            const bioInput = document.getElementById('bio-input');
            if (bioInput) bioInput.value = userProfile.bio || '';
            
            const profileUrlInput = document.getElementById('profile-url-input');
            if (profileUrlInput) profileUrlInput.value = userProfile.profileImageUrl || '';
            
            // Update public link display
            const publicLink = `${window.location.origin}/profile.html?username=${userProfile.username}`;
            const publicLinkDisplay = document.getElementById('public-link-display');
            if (publicLinkDisplay) {
                publicLinkDisplay.textContent = publicLink;
                publicLinkDisplay.href = publicLink;
            }
        }
    });

    // 2. Real-time Link Listener
    if (unsubscribeLinks) unsubscribeLinks();
    
    const linksRef = profileRef.collection('links').orderBy('order', 'asc');
    
    unsubscribeLinks = linksRef.onSnapshot(snapshot => {
        userLinks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderLinks();
        
        // This check is part of the interactive setup logic (handled in dashboard.html script)
        // Ensure the setup view is correctly shown/hidden based on links count
        const initialSetupView = document.getElementById('initial-setup-view');
        const linkEditorView = document.getElementById('link-editor-view');

        if (initialSetupView && linkEditorView) {
            // Check if profile is initialized AND links exist
            if (userProfile.displayName && userLinks.length > 0) {
                linkEditorView.classList.remove('hidden');
                initialSetupView.classList.add('hidden');
            } else if (!userProfile.displayName || userLinks.length === 0) {
                // If profile is NOT initialized OR no links exist, show setup
                linkEditorView.classList.add('hidden');
                initialSetupView.classList.remove('hidden');
            }
        }

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

    const displayName = document.getElementById('display-name-input').value.trim();
    const bio = document.getElementById('bio-input').value.trim();
    const profileImageUrl = document.getElementById('profile-url-input').value.trim();

    if (displayName.length < 3) return alert('Display Name must be at least 3 characters.');

    try {
        await db.collection('users').doc(currentUserUid).update({ displayName, bio, profileImageUrl });
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

// Expose core functions globally (they will be called by dashboard.html)
window.fetchUserData = fetchUserData;
window.updateProfile = updateProfile;
window.addNewLink = addNewLink;
window.toggleLinkActive = toggleLinkActive;
window.deleteLink = deleteLink;
// The initial call is managed by the script in dashboard.html.
