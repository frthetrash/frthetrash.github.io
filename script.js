document.addEventListener('DOMContentLoaded', () => {
    // Select the interactive elements
    const actionCard = document.getElementById('actionCard');
    const redirectPopup = document.getElementById('redirectPopup');
    const closePopupBtn = document.getElementById('closePopupBtn');

    // Variable to hold the timer ID
    let redirectTimeout;

    // --- Show Popup and Start Redirect Timer ---
    if (actionCard) {
        actionCard.addEventListener('click', () => {
            // Disable the card
            actionCard.classList.add('disabled');

            // Show the popup with a transition
            redirectPopup.classList.add('visible');

            // Set a 3-second timer to redirect
            redirectTimeout = setTimeout(() => {
                window.location.href = '/anonigview';
            }, 3000);
        });
    }

    // --- Hide Popup and Cancel Redirect ---
    if (closePopupBtn) {
        closePopupBtn.addEventListener('click', () => {
            // Cancel the scheduled redirect
            clearTimeout(redirectTimeout);

            // Hide the popup
            redirectPopup.classList.remove('visible');

            // Re-enable the action card
            actionCard.classList.remove('disabled');
        });
    }
});
