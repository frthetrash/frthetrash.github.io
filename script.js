document.addEventListener('DOMContentLoaded', () => {

    // --- Element Selection ---
    const actionCard = document.getElementById('action-card');
    const redirectModal = document.getElementById('redirect-modal');
    const cancelButton = document.getElementById('cancel-btn');

    // --- State Variable ---
    let redirectTimer = null;
    const REDIRECT_DELAY = 3000; // 3 seconds
    const REDIRECT_URL = '/anonigview';

    /**
     * Shows the redirection modal and starts the countdown.
     */
    function showModalAndRedirect() {
        // 1. Disable the card to prevent multiple clicks
        actionCard.style.pointerEvents = 'none';

        // 2. Show the modal with a fade-in effect
        redirectModal.classList.remove('hidden');
        
        // 3. Start the 3-second timer for redirection
        redirectTimer = setTimeout(() => {
            // This is where the actual page navigation happens
            window.location.href = REDIRECT_URL;
        }, REDIRECT_DELAY);
    }

    /**
     * Hides the modal and cancels the pending redirection.
     */
    function cancelRedirection() {
        // 1. Clear the active timer
        if (redirectTimer) {
            clearTimeout(redirectTimer);
        }

        // 2. Hide the modal
        redirectModal.classList.add('hidden');

        // 3. Re-enable the action card
        actionCard.style.pointerEvents = 'auto';
    }

    // --- Event Listeners ---
    actionCard.addEventListener('click', showModalAndRedirect);
    cancelButton.addEventListener('click', cancelRedirection);

});
