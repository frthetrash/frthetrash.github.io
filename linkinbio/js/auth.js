// /js/auth.js

// NOTE: This script relies on global variables 'auth' and 'db' being initialized 
// in /js/firebase-config.js, and the SDKs being loaded in the HTML.

// --- Utility: Error Message Handler (Updated for Sleek Theme) ---

/**
 * Displays a clean, temporary error message in the dedicated placeholder element.
 * @param {string} message The message to display.
 */
const setError = (message) => {
    const el = document.getElementById('error-message');
    if (el) {
        // Apply styling for a visually sleek, temporary error box
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
 * Handles user registration, including username uniqueness check and initial profile creation.
 */
async function handleRegister() {
    setError('');
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;
    // Ensure username is clean and lowercase for database indexing/lookups
    const username = document.getElementById('username')?.value.toLowerCase().trim();

    if (!username || !email || !password) return setError('Please fill in all fields.');

    try {
        // 1. Check for Username Uniqueness (Crucial for public profile URLs)
        const userQuery = await db.collection('users').where('username', '==', username).limit(1).get();
        if (!userQuery.empty) return setError('This username is already taken. Choose something unique.');

        // 2. Create User in Firebase Authentication
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // 3. Create initial Firestore Profile Document (Crucial step for new user data)
        await db.collection('users').doc(user.uid).set({
            username: username, // <-- MUST BE PRESENT for the public profile query to work
            displayName: username.charAt(0).toUpperCase() + username.slice(1), 
            profileImageUrl: 'https://raw.githubusercontent.com/frthetrash/frthetrash.github.io/refs/heads/main/png.png', 
            bio: '👋 Check out my links!',
            templateId: 'vibrant'
        });

        // Redirect on success
        window.location.replace('./dashboard.html');

    } catch (error) {
        // Handle common Firebase Auth errors gracefully
        let message = 'An unknown error occurred. Please try again.';
        if (error.code === 'auth/weak-password') message = 'Password must be at least 6 characters.';
        else if (error.code === 'auth/email-already-in-use') message = 'This email is already registered.';
        else if (error.code === 'auth/invalid-email') message = 'The email address is not valid.';

        setError(message);
    }
}

/**
 * Handles user login.
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
        // Fallback alert for network errors
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
            // Redirect from public entry points to the dashboard
            window.location.replace('./dashboard.html');
        }
    } else {
        // USER IS NOT LOGGED IN
        if (path.includes('dashboard.html')) {
            // Protect the dashboard by redirecting to login
            window.location.replace('./login.html');
        }
        // If the path ends in '/' (i.e., index.html), send them to the register page.
        else if (path.endsWith('/') || path.endsWith('index.html')) {
             window.location.replace('./register.html');
        }
    }
});
