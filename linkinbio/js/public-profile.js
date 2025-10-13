// /js/public-profile.js

/**
 * Extracts the username from the URL query parameter: profile.html?username=john_doe
 * @returns {string|null} The username or null if not found.
 */
const getUsernameFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('username');
};

/**
 * Generates the elegant HTML for a single, clickable link button.
 * @param {Object} link - The link object from Firestore.
 * @returns {string} The HTML string for the button.
 */
const renderLinkButton = (link) => `
    <a href="${link.url}" target="_blank" rel="noopener noreferrer"
       class="link-button block w-full text-center text-xl font-semibold rounded-xl shadow-md 
              tracking-wide uppercase">
        ${link.title}
    </a>
`;

/**
 * Main function to fetch all profile and link data and render it to the page.
 */
async function loadPublicProfile() {
    const username = getUsernameFromUrl();
    const profileEl = document.getElementById('public-profile-container');
    const statusEl = document.getElementById('status-message');
    
    if (!profileEl) return; // Exit if the container isn't ready

    // 1. Initial Check
    if (!username) {
        statusEl.textContent = '❌ Error: No profile username specified in the URL.';
        return;
    }

    try {
        statusEl.textContent = 'Loading profile...';
        
        // 2. Query user by username (Requires a Firestore Index on 'username' field)
        const userQuery = await db.collection('users').where('username', '==', username).limit(1).get();
        
        if (userQuery.empty) {
            statusEl.textContent = `✨ Profile @${username} not found.`;
            return;
        }

        const userDoc = userQuery.docs[0];
        const profile = userDoc.data();
        
        // 3. Dynamically update SEO and Page Title
        document.title = `${profile.displayName} | LinkSpark`;
        document.querySelector('meta[name="description"]').setAttribute("content", profile.bio.substring(0, 150) + "...");

        // 4. Render Profile Header
        profileEl.innerHTML = `
            <img src="${profile.profileImageUrl}" alt="${profile.displayName}'s profile picture" 
                 class="w-36 h-36 rounded-full mx-auto mb-8 object-cover 
                        ring-4 ring-white shadow-2xl transition duration-500 hover:scale-105">
            <h1 class="text-5xl font-extrabold text-white tracking-tighter mb-2">${profile.displayName}</h1>
            <p class="text-xl text-gray-400 mb-12 max-w-md mx-auto font-light italic">${profile.bio}</p>
            <div id="links-container" class="w-full max-w-lg mx-auto space-y-6">
                </div>
        `;
        
        // 5. Fetch and Render Active Links (Ordered)
        const linksSnapshot = await userDoc.ref.collection('links')
                                              .where('active', '==', true)
                                              .orderBy('order', 'asc')
                                              .get();
                                              
        const linksContainer = document.getElementById('links-container');
        
        if (linksSnapshot.empty) {
            linksContainer.innerHTML = '<p class="text-gray-500 mt-12">No links posted yet.</p>';
        } else {
            linksSnapshot.forEach(linkDoc => {
                linksContainer.innerHTML += renderLinkButton(linkDoc.data());
            });
        }

        statusEl.remove(); // Remove the loading message on successful render
        
    } catch (error) {
        statusEl.textContent = `🚨 A service error occurred.`;
        console.error("Profile load failed:", error);
    }
}

// --- Initialization ---

// Ensure Firebase is initialized (via auth.js observer) before attempting to load data
auth.onAuthStateChanged(() => {
    loadPublicProfile();
});
