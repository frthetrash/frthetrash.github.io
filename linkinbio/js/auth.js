// /js/auth.js

// --- Utility: Error Message Handler ---

/**
 * Displays a clean error message in the dedicated placeholder element.
 * @param {string} message The message to display.
 */
const setError = (message) => {
    const el = document.getElementById('error-message');
    if (el) el.textContent = message;
    console.error("Auth Error:", message);
};

// --- Core Auth Functions ---

/**
 * Handles user registration, username uniqueness check, and initial profile creation in Firestore.
 */
async function handleRegister() {
    setError('');
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;
    // Ensure username is clean and lowercase for database indexing/lookups
    const username = document.getElementById('username')?.value.toLowerCase().trim();

    if (!username || !email || !password) return setError('Please fill in all fields.');

    try {
        // 1. Check for Username Uniqueness (Requires a Firestore Index on 'username')
        const userQuery = await db.collection('users').where('username', '==', username).limit(1).get();
        if (!userQuery.empty) return setError('This username is already taken. Choose something unique.');

        // 2. Create User in Firebase Authentication
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // 3. Create initial Firestore Profile Document
        await db.collection('users').doc(user.uid).set({
            username: username,
            // Capitalize the first letter for a cleaner display name
            displayName: username.charAt(0).toUpperCase() + username.slice(1), 
            profileImageUrl: 'https://via.placeholder.com/150/000000/FFFFFF?text=SPARK', // Elegant B&W Default
            bio: '👋 Hello! Check out my links.',
            templateId: 'black_white'
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
        alert("Logout failed. Please try again.");
    });
}

// --- Global Auth State Observer (Secures navigation across static pages) ---

auth.onAuthStateChanged(user => {
    const path = window.location.pathname;
    
    if (user) {
        // User is logged in
        if (path.includes('login.html') || path.includes('register.html') || path.endsWith('/')) {
            // Redirect from public entry points to the dashboard
            window.location.replace('./dashboard.html');
        }
    } else {
        // User is NOT logged in
        if (path.includes('dashboard.html')) {
            // Protect the dashboard by redirecting to login
            window.location.replace('./login.html');
        }
    }
});
