// Function to handle the redirection
function handleCardClick() {
    const targetURL = "/whenpopupisclicked";
    // Redirect in the same tab
    window.location.href = targetURL;
    
    // Log the action (optional, for debugging)
    console.log("Redirecting to: " + targetURL);
}

// Attach the event listener to the action card element
document.addEventListener('DOMContentLoaded', () => {
    const actionCard = document.getElementById('actionCard');
    
    if (actionCard) {
        actionCard.addEventListener('click', handleCardClick);
    }
});
