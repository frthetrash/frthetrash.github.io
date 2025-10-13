// /js/auth.js

// NOTE: Relies on global variables 'auth' and 'db' being defined in firebase-config.js.

/**
 * Redirects the user to the dashboard page.
 */
function redirectToDashboard() {
    window.location.href = './dashboard.html';
}

/**
 * Ensures a Firestore document exists for the user upon registration/login.
 * @param {object} user - The Firebase User object.
 */
async function ensureUserProfile(user) {
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();

    if (!doc.exists) {
        console.log("Creating new user profile document.");
        await userRef.set({
            // Default values for a brand new user
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            // Important flags for the initial setup screen
            username: null, // CRITICAL: Forces setup view in dashboard
            isUsernameSet: false,
            // Default profile settings
            bio: "Check out my links!",
            profileImageUrl: "https://raw.githubusercontent.com/frthetrash/frthetrash.github.io/refs/heads/main/png.png",
            templateId: 'vibrant',
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
    } else {
        // Update last login time for existing users
        await userRef.update({
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
}


// --- 1. REGISTRATION ---
window.handleRegister = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessageEl = document.getElementById('error-message');
    errorMessageEl.classList.add('hidden');

    try {
        const response = await auth.createUserWithEmailAndPassword(email, password);
        const user = response.user;
        
        // 1. CRITICAL: Create the profile document
        await ensureUserProfile(user); 

        redirectToDashboard();

    } catch (error) {
        console.error("Registration Error:", error);
        errorMessageEl.textContent = error.message;
        errorMessageEl.classList.remove('hidden');
    }
}

// --- 2. EMAIL/PASSWORD LOGIN ---
window.handleLogin = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessageEl = document.getElementById('error-message');
    errorMessageEl.classList.add('hidden');

    try {
        await auth.signInWithEmailAndPassword(email, password);
        redirectToDashboard();

    } catch (error) {
        console.error("Login Error:", error);
        errorMessageEl.textContent = error.message;
        errorMessageEl.classList.remove('hidden');
    }
}

// --- 3. GOOGLE SIGN-IN ---
window.signInWithGoogle = async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    
    try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        
        // 1. CRITICAL: Create the profile document if it doesn't exist
        await ensureUserProfile(user); 

        redirectToDashboard();

    } catch (error) {
        console.error("Google Sign-In Error:", error);
        // Display error on login page if possible, or handle silently
        const errorMessageEl = document.getElementById('error-message');
        if (errorMessageEl) {
            errorMessageEl.textContent = error.message;
            errorMessageEl.classList.remove('hidden');
        }
    }
}

// --- 4. LOGOUT ---
window.handleLogout = async () => {
    try {
        await auth.signOut();
    } catch (error) {
        console.error("Logout Error:", error);
    }
}

// --- GLOBAL AUTH STATE OBSERVER ---
auth.onAuthStateChanged(user => {
    // Determine the current page for routing
    const path = window.location.pathname;
    const onAuthPage = path.includes('login.html') || path.includes('register.html');
    const onDashboardPage = path.includes('dashboard.html');

    if (user) {
        // User is logged in
        if (onAuthPage) {
            redirectToDashboard(); // Redirect from login/register to dashboard
        } 
        // If on dashboard, the code in dashboard-editor.js takes over to fetch data
        
    } else {
        // User is logged out
        if (onDashboardPage) {
            window.location.href = './login.html'; // Redirect from dashboard to login
        }
    }
});
