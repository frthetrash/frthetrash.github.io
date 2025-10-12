// Function to handle the redirection
function handleCardClick() {
    // Updated redirection path as requested
    const targetURL = "/anonigview"; 
    
    // Redirect in the same tab, mimicking a smooth single-page application flow
    window.location.href = targetURL;
    
    // Console confirmation
    console.log("Action card clicked. Redirecting to: " + targetURL);
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
