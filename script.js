// Function to handle the delayed redirection
function handleCardClick() {
    const targetURL = "/anonigview";
    const delayMilliseconds = 3000; // 3 seconds delay
    
    const actionCard = document.getElementById('actionCard');
    const statusMessage = document.getElementById('statusMessage');

    // 1. Disable the card and change cursor
    actionCard.style.pointerEvents = 'none';
    actionCard.style.cursor = 'default';
    
    // 2. Display the status message
    statusMessage.textContent = "Hang on! We are redirecting you...";
    statusMessage.classList.add('visible');
    
    // 3. Set the timed redirect
    setTimeout(() => {
        window.location.href = targetURL;
    }, delayMilliseconds);
    
    console.log(`Action card clicked. Starting ${delayMilliseconds / 1000}s redirect to: ${targetURL}`);
}

// Attach the event listener when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const actionCard = document.getElementById('actionCard');
    
    if (actionCard) {
        actionCard.addEventListener('click', handleCardClick);
    } else {
        console.error("Action card element not found. Check ID 'actionCard'.");
    }
});
