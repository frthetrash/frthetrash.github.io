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
 * Generates the elegant HTML for a single, clickable link button, styled for the VIBRANT theme.
 * @param {Object} link - The link object from Firestore.
 * @returns {string} The HTML string for the button.
 */
const renderLinkButton = (link) => `
    <a href="${link.url}" target="_blank" rel="noopener noreferrer"
       class="link-button block w-full text-center text-xl font-semibold rounded-xl shadow-lg 
              tracking-wide uppercase transition duration-300 hover:shadow-2xl hover:shadow-pink-500/20">
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
    
    if (!profileEl) return; 

    // 1. Initial Check
    if (!username) {
        statusEl.textContent = '❌ Error: No profile username specified in the URL.';
        return;
    }

    try {
        statusEl.textContent = 'Loading profile...';
        
        // 2. Query user by username
        const userQuery = await db.collection('users').where('username', '==', username).limit(1).get();
        
        if (userQuery.empty) {
            statusEl.textContent = `✨ Profile @${username} not found.`;
            return;
        }

        const userDoc = userQuery.docs[0];
        const profile = userDoc.data();
        
        // 3. Dynamically update SEO and Page Title
        document.title = `${profile.displayName} | LinkShare`;
        document.querySelector('meta[name="description"]').setAttribute("content", profile.bio.substring(0, 150) + "...");

        // 4. Render Profile Header with Gradient Text and Sleek Image
        profileEl.innerHTML = `
            <img src="${profile.profileImageUrl}" alt="${profile.displayName}'s profile picture" 
                 class="w-32 h-32 rounded-full mx-auto mb-8 object-cover 
                        ring-4 ring-pink-500 shadow-xl transition duration-500 hover:scale-105">
            <h1 class="text-5xl font-extrabold text-gradient tracking-tighter mb-2">${profile.displayName}</h1>
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

// Ensure Firebase is initialized before attempting to load data
auth.onAuthStateChanged(() => {
    loadPublicProfile();
});
