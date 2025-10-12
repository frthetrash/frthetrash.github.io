document.addEventListener('DOMContentLoaded', () => {
  const actionCard = document.getElementById('actionCard');
  const statusPopup = document.getElementById('statusPopup');
  const closePopup = document.getElementById('closePopup');

  if (actionCard && statusPopup && closePopup) {
    actionCard.addEventListener('click', () => {
      actionCard.classList.add('disabled');
      statusPopup.classList.remove('hidden');

      // Auto redirect after 3 seconds
      setTimeout(() => {
        window.location.href = '/anonigview';
      }, 3000);
    });

    // Allow user to dismiss popup manually
    closePopup.addEventListener('click', () => {
      statusPopup.classList.add('hidden');
      actionCard.classList.remove('disabled');
    });
  }
});
