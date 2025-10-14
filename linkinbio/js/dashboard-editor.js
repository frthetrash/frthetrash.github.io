// dashboard-editor.js

// --- 1. CORE DATA STORE ---
let linkData = [
    { id: 1, title: 'My Portfolio', url: 'https://myportfolio.com', clicks: 10, editable: false },
    { id: 2, title: 'Latest Project Demo', url: 'https://demo.project.io', clicks: 25, editable: false },
    { id: 3, title: 'Connect on X/Twitter', url: 'https://twitter.com/myhandle', clicks: 5, editable: false }
];

let totalViews = 150; // Placeholder for total page views
let nextLinkId = linkData.length + 1;


// --- 2. INITIALIZATION AND UI CONTROL ---

document.addEventListener('DOMContentLoaded', () => {
    // Initial rendering on load
    renderLinkManagement();
    updateLivePreview();
    updateAnalytics();

    // Event listener for Appearance: Background Color
    const colorInput = document.getElementById('preview-bg-color');
    if (colorInput) {
        colorInput.addEventListener('input', (e) => {
            const previewPane = document.getElementById('preview-pane');
            if (previewPane) {
                previewPane.style.backgroundColor = e.target.value;
            }
        });
    }

    // Default to showing the Links section
    showSection('links');
});

/**
 * Handles Sidebar Navigation to show the correct content section.
 * @param {string} sectionId - The ID of the section to show ('links', 'dashboard', 'appearance', 'settings').
 */
window.showSection = (sectionId) => {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
    const target = document.getElementById(sectionId + '-section');
    if (target) {
        target.classList.remove('hidden');
    }
}


// --- 3. LINK DATA MANAGEMENT (CRUD) ---

/**
 * Adds a new link to the linkData array.
 */
window.addLink = () => {
    const titleInput = document.getElementById('new-link-title');
    const urlInput = document.getElementById('new-link-url');
    
    const title = titleInput.value.trim();
    const url = urlInput.value.trim();

    if (!title || !url) {
        alert("Please enter both a title and a URL.");
        return;
    }

    const newLink = {
        id: nextLinkId++,
        title: title,
        url: url,
        clicks: 0,
        editable: false
    };

    linkData.push(newLink);

    // Clear inputs and refresh UI
    titleInput.value = '';
    urlInput.value = '';
    renderLinkManagement();
    updateLivePreview();
    updateAnalytics();
};

/**
 * Deletes a link from the linkData array by its ID.
 * @param {number} linkId - The ID of the link to delete.
 */
window.deleteLink = (linkId) => {
    linkData = linkData.filter(link => link.id !== linkId);
    renderLinkManagement();
    updateLivePreview();
    updateAnalytics();
};

/**
 * Updates a link's properties based on changes in the input fields.
 * This is bound to input changes in the management area.
 * @param {number} linkId - The ID of the link to update.
 * @param {string} field - The field to update ('title' or 'url').
 * @param {string} value - The new value.
 */
window.updateLink = (linkId, field, value) => {
    const linkIndex = linkData.findIndex(link => link.id === linkId);
    if (linkIndex > -1) {
        linkData[linkIndex][field] = value;
        updateLivePreview(); // Synchronize the preview immediately
    }
};


// --- 4. DYNAMIC DOM UPDATES (Link Management Area) ---

/**
 * Renders the editable link items in the central Link Management area.
 */
function renderLinkManagement() {
    const container = document.getElementById('link-management-area');
    if (!container) return;
    container.innerHTML = '';

    linkData.forEach(link => {
        const linkItem = document.createElement('div');
        linkItem.className = 'p-4 border border-gray-200 rounded-lg bg-gray-50/70 shadow-sm';
        linkItem.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <span class="text-xs text-gray-500">Clicks: ${link.clicks}</span>
                <button onclick="deleteLink(${link.id})" class="text-red-500 hover:text-red-700 text-sm">Delete</button>
            </div>
            <input type="text" value="${link.title}" 
                   oninput="updateLink(${link.id}, 'title', this.value)"
                   placeholder="Link Title" 
                   class="w-full p-2 border border-gray-300 rounded-lg mb-2 focus:ring-blue-500 focus:border-blue-500">
            <input type="url" value="${link.url}" 
                   oninput="updateLink(${link.id}, 'url', this.value)"
                   placeholder="Link URL" 
                   class="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500">
        `;
        container.appendChild(linkItem);
    });
}


// --- 5. LIVE PREVIEW SYNCHRONIZATION ---

/**
 * Renders the live preview in the mock phone screen.
 */
function updateLivePreview() {
    const container = document.getElementById('preview-links-container');
    if (!container) return;
    container.innerHTML = '';

    linkData.forEach(link => {
        const linkButton = document.createElement('a');
        linkButton.href = link.url;
        linkButton.target = '_blank';
        linkButton.className = 'block w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-full shadow-md text-sm transition duration-200 truncate px-4';
        linkButton.textContent = link.title;
        container.appendChild(linkButton);
    });
}


// --- 6. ANALYTICS PLACEHOLDER ---

/**
 * Updates the placeholder analytics displays.
 */
function updateAnalytics() {
    const totalLinks = linkData.length;
    const totalClicks = linkData.reduce((sum, link) => sum + link.clicks, 0);

    // Update DOM elements
    document.getElementById('total-links-display').textContent = totalLinks;
    document.getElementById('total-views-display').textContent = totalViews;
    document.getElementById('total-clicks-display').textContent = totalClicks;
}
