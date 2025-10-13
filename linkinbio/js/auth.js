// /js/auth.js

// NOTE: This script relies on global variables 'auth' and 'db' being initialized 
// in /js/firebase-config.js.

// --- Utility: Error Message Handler ---

/**
 * Displays a clean, temporary error message in the dedicated placeholder element.
 * @param {string} message The message to display.
 */
const setError = (message) => {
    const el = document.getElementById('error-message');
    if (el) {
        // Apply styling for the dark/frosted theme
        el.textContent = message;
        el.classList.add('text-red-400', 'font-medium', 'bg-red-900/20', 'p-2', 'rounded-lg');
        
        // Clear the error message and styling after 5 seconds
        setTimeout(() => {
            el.textContent = '';
            el.classList.remove('text-red-400', 'font-medium', 'bg-red-900/20', 'p-2', 'rounded-lg');
        }, 5000);
    }
    console.error("Auth Error:", message);
};

// --- Core Auth Functions ---

/**
 * Ensures a Firestore user profile exists for new sign-ins (used by both Email/Password and Google).
 * @param {Object} user - The Firebase User object.
 * @param {string} username - The desired username (provided by input or derived from email/name).
 */
async function createOrUpdateUserProfile(user, username) {
    const userRef = db.collection('users').doc(user.uid);
    
    // Use .set with {merge: true} to safely create or update the document without overwriting links.
    await userRef.set({
        // CRITICALLY IMPORTANT: The username field for public profile queries
        username: username, 
        displayName: user.displayName || username.charAt(0).toUpperCase() + username.slice(1), 
        profileImageUrl: user.photoURL || 'https://raw.githubusercontent.com/frthetrash/frthetrash.github.io/refs/heads/main/png.png', 
        bio: '👋 Check out my links!',
        templateId: 'vibrant'
    }, { merge: true });
}

/**
 * Handles user registration with Email and Password.
 */
async function handleRegister() {
    setError('');
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;
    const username = document.getElementById('username')?.value.toLowerCase().trim();

    if (!username || !email || !password) return setError('Please fill in all fields.');

    try {
        // 1. Check for Username Uniqueness
        const userQuery = await db.collection('users').where('username', '==', username).limit(1).get();
        if (!userQuery.empty) return setError('This username is already taken. Choose something unique.');

        // 2. Create User in Firebase Authentication
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // 3. Create initial Firestore Profile Document
        await createOrUpdateUserProfile(user, username);

        // Redirect on success
        window.location.replace('./dashboard.html');

    } catch (error) {
        let message = 'An error occurred during sign up.';
        if (error.code === 'auth/weak-password') message = 'Password must be at least 6 characters.';
        else if (error.code === 'auth/email-already-in-use') message = 'This email is already registered.';
        
        setError(message);
        console.error("Registration Error:", error);
    }
}

/**
 * Handles Google Authentication Sign-In/Sign-Up.
 */
async function signInWithGoogle() {
    setError('');
    const provider = new firebase.auth.GoogleAuthProvider();

    try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        
        // Derive a clean username from the Google display name or email prefix
        let suggestedUsername = user.email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase();

        // 1. Check if user already exists in Firestore (via UID, which always exists after Google sign-in)
        const userRef = db.collection('users').doc(user.uid);
        const doc = await userRef.get();

        if (doc.exists) {
            // Existing user: proceed to dashboard
        } else {
            // New user: ensure username is unique before creating profile
            let usernameIsUnique = false;
            let counter = 0;
            let finalUsername = suggestedUsername;
            
            while (!usernameIsUnique && counter < 5) {
                const query = await db.collection('users').where('username', '==', finalUsername).limit(1).get();
                if (query.empty) {
                    usernameIsUnique = true;
                } else {
                    counter++;
                    finalUsername = `${suggestedUsername}${counter}`;
                }
            }
            
            // 2. Create profile with the derived/unique username
            await createOrUpdateUserProfile(user, finalUsername);
        }

        window.location.replace('./dashboard.html');

    } catch (error) {
        let message = 'Google sign-in failed. Please try again.';
        if (error.code === 'auth/popup-closed-by-user') message = 'Sign-in window closed. Please try again.';
        
        setError(message);
        console.error("Google Sign-In Error:", error);
    }
}


/**
 * Handles user login with Email and Password.
 */
async function handleLogin() {
    setError('');
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;
    if (!email || !password) return setError('Please enter your email and password.');

    try {
        await auth.signInWithEmailAndPassword(email, password);
        // Redirect on success
        window.location.replace('./dashboard.html');
    } catch (error) {
        // Generic error message for security reasons
        setError('Invalid credentials. Please check your email and password.');
    }
}

/**
 * Handles user logout.
 */
function handleLogout() {
    auth.signOut().then(() => {
        // Redirect to login page after signing out
        window.location.replace('./login.html');
    }).catch(e => {
        console.error("Logout failed:", e);
        alert("Logout failed. Please check your connection.");
    });
}

// --- GLOBAL AUTH STATE OBSERVER (Secures navigation across static pages) ---

/**
 * Listens for any change in the user's login state and handles routing.
 */
auth.onAuthStateChanged(user => {
    const path = window.location.pathname;
    
    if (user) {
        // USER IS LOGGED IN
        if (path.includes('login.html') || path.includes('register.html') || path.endsWith('/')) {
            window.location.replace('./dashboard.html');
        }
    } else {
        // USER IS NOT LOGGED IN
        if (path.includes('dashboard.html')) {
            // Protect the dashboard by redirecting to login
            window.location.replace('./login.html');
        }
        else if (path.endsWith('/') || path.endsWith('index.html')) {
             window.location.replace('./register.html');
        }
    }
});
