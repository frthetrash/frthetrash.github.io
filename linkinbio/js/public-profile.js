// /js/public-profile.js

/**
 * Extracts the username from the URL query parameter: profile.html?username=john_doe
 * @returns {string|null} The username or null if not found.
 */
const getUsernameFromUrl = () => {
    // Correctly uses the standard URLSearchParams for query parameters
    const params = new URLSearchParams(window.location.search);
    const username = params.get('username');
    
    if (!username) {
        // Also check if the old, incorrect path format was used (as a friendly fix)
        const pathSegments = window.location.pathname.split('/');
        // If the last segment is not 'profile.html', assume it's the username
        if (pathSegments.length > 1 && pathSegments[pathSegments.length - 1] !== 'profile.html') {
             return pathSegments[pathSegments.length - 1];
        }
    }
    return username;
};

/**
 * Generates the vibrant HTML for a single, clickable link button.
 * Uses the CSS class '.link-button' defined in profile.html.
 */
const renderLinkButton = (link) => `
    <a href="${link.url}" target="_blank" rel="noopener noreferrer"
       class="link-button block w-full text-center text-xl font-semibold rounded-xl 
              shadow-lg tracking-wide uppercase transition duration-300">
        ${link.title}
    </a>
`;

/**
 * Handles errors and prints them to both the console and the webpage status element.
 * @param {string} message - The user-friendly message.
 * @param {object} error - The raw error object for the console.
 */
const handleProfileError = (message, error = null) => {
    const statusEl = document.getElementById('status-message');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.classList.remove('animate-pulse');
        statusEl.classList.add('text-red-400', 'font-bold');
    }
    if (error) {
        console.error("LinkShare Profile Error:", message, error);
    } else {
        console.warn("LinkShare Profile Warning:", message);
    }
};

/**
 * Main function to fetch all profile and link data and render it to the page.
 */
async function loadPublicProfile() {
    const username = getUsernameFromUrl();
    const profileEl = document.getElementById('public-profile-container');
    
    if (!profileEl) return; 
    
    // Reset status message area
    const statusEl = document.getElementById('status-message');
    statusEl.textContent = 'Loading profile...';
    statusEl.classList.add('animate-pulse');

    // 1. Check for Username
    if (!username) {
        return handleProfileError(
            '❌ URL Error: No username found. Use the format: ?username=YOUR_USERNAME'
        );
    }

    try {
        // 2. Query user by username (Requires a Firestore Index)
        const userQuery = await db.collection('users').where('username', '==', username).limit(1).get();
        
        if (userQuery.empty) {
            return handleProfileError(`✨ Profile @${username} not found.`);
        }

        const userDoc = userQuery.docs[0];
        const profile = userDoc.data();
        
        // 3. Dynamically update HTML/SEO
        document.title = `${profile.displayName} | LinkShare`;
        document.querySelector('meta[name="description"]').setAttribute("content", profile.bio.substring(0, 150) + "...");

        // 4. Render Profile Header (using updated classes)
        profileEl.innerHTML = `
            <img src="${profile.profileImageUrl}" alt="${profile.displayName}'s profile picture" 
                 class="w-28 h-28 sm:w-36 sm:h-36 rounded-full mx-auto mb-8 object-cover 
                        ring-4 ring-pink-500 shadow-xl transition duration-500 hover:scale-105 profile-img-glow">
            <h1 class="text-4xl sm:text-5xl font-extrabold text-gradient tracking-tighter mb-2">${profile.displayName}</h1>
            <p class="text-base sm:text-xl text-gray-400 mb-12 max-w-md mx-auto font-light italic">${profile.bio}</p>
            <div id="links-container" class="w-full max-w-lg mx-auto space-y-4 sm:space-y-6">
                </div>
        `;
        
        // 5. Fetch and Render Active Links (Ordered)
        const linksSnapshot = await userDoc.ref.collection('links')
                                              .where('active', '==', true)
                                              .orderBy('order', 'asc')
                                              .get();
                                              
        const linksContainer = document.getElementById('links-container');
        
        if (linksSnapshot.empty) {
            linksContainer.innerHTML = '<p class="text-gray-500 mt-12 text-lg">No links posted yet.</p>';
        } else {
            linksSnapshot.forEach(linkDoc => {
                linksContainer.innerHTML += renderLinkButton(linkDoc.data());
            });
        }

        statusEl.remove(); // Remove the loading message on successful render
        
    } catch (error) {
        handleProfileError('🚨 Critical Error: Could not load data.', error);
    }
}

// --- Initialization ---

// auth.onAuthStateChanged is used as a reliable way to ensure Firebase is ready
auth.onAuthStateChanged(() => {
    loadPublicProfile();
});
