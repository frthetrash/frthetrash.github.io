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
        // Apply styling for the dark/sleek theme
        el.textContent = message;
        el.classList.remove('hidden'); // Ensure it's visible
        el.classList.add('text-red-400', 'bg-red-900/50', 'p-3', 'rounded');
        
        // Clear the error message and styling after 5 seconds
        setTimeout(() => {
            el.textContent = '';
            el.classList.add('hidden');
        }, 5000);
    }
    console.error("Auth Error:", message);
};

// --- Core Auth Functions ---

/**
 * Ensures a Firestore user profile exists for new sign-ins. 
 * Initializes new profiles with username: null and isUsernameSet: false.
 * @param {Object} user - The Firebase User object.
 */
async function createOrUpdateUserProfile(user) {
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();
    
    // If the document does NOT exist (new user via email/pass or Google)
    if (!doc.exists) {
        const emailPrefix = user.email ? user.email.split('@')[0] : 'new_user';
        
        // Initial creation sets username to null, prompting permanent setup on dashboard
        await userRef.set({
            username: null, // Set permanently during dashboard setup
            isUsernameSet: false, // Tracks if setup is complete
            displayName: user.displayName || emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1), 
            profileImageUrl: user.photoURL || 'https://raw.githubusercontent.com/frthetrash/frthetrash.github.io/refs/heads/main/png.png', 
            bio: '👋 Check out my links!',
            templateId: 'vibrant'
        });
    } else {
        // Existing user: Merge to update dynamic fields (like photo/display name from provider)
        await userRef.set({
            displayName: user.displayName || doc.data().displayName,
            profileImageUrl: user.photoURL || doc.data().profileImageUrl
        }, { merge: true });
    }
}

/**
 * Handles user registration with Email and Password.
 */
async function handleRegister() {
    setError('');
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;

    if (!email || !password) return setError('Please fill in all fields.');

    try {
        // 1. Create User in Firebase Authentication
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // 2. Create initial Firestore Profile Document 
        await createOrUpdateUserProfile(user);

        // Redirect on success (dashboard handles the username setup interception)
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
        
        // Ensure profile is created/updated 
        await createOrUpdateUserProfile(user);

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
