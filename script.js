document.addEventListener('DOMContentLoaded', () => {
    // Select the interactive elements from the DOM
    const actionCard = document.getElementById('actionCard');
    const statusMessage = document.getElementById('statusMessage');

    // Check if the required elements exist before adding an event listener
    if (actionCard && statusMessage) {
        actionCard.addEventListener('click', () => {
            // 1. Immediately disable the card visually and functionally
            actionCard.classList.add('disabled');

            // 2. Make the status message visible
            statusMessage.classList.add('visible');

            // 3. Set a 3-second delay before redirection
            setTimeout(() => {
                // 4. Redirect the user to the target URL
                window.location.href = '/linkinbio';
            }, 3000); // 3000 milliseconds = 3 seconds
        });
    }
});
