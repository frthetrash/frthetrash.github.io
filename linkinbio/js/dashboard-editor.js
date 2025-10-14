// --- 1. Data Model and Initialization ---
let links = [
    { id: 1, title: "My Portfolio Site", url: "https://portfolio.com", isActive: true, clicks: 750 },
    { id: 2, title: "Latest YouTube Video", url: "https://youtube.com/latest", isActive: true, clicks: 320 },
    { id: 3, title: "Follow Me on X", url: "https://x.com/username", isActive: false, clicks: 180 },
    { id: 4, title: "My E-book Offer", url: "https://ebook-link.com", isActive: true, clicks: 50 }
];

let nextLinkId = 5; // Used for assigning unique IDs to new links

// --- DOM Element References ---
const linksContainer = document.getElementById('links-container');
const previewLinksContainer = document.getElementById('preview-links');
const addLinkBtn = document.getElementById('add-link-btn');

// --- 2. Core Render Functions ---

/**
 * Renders the editable link rows in the main editor area.
 */
function renderLinksEditor() {
    linksContainer.innerHTML = ''; // Clear existing links

    links.forEach(link => {
        const linkRow = document.createElement('div');
        linkRow.className = 'link-row';
        linkRow.dataset.linkId = link.id;
        
        linkRow.innerHTML = `
            <i class="fas fa-grip-vertical drag-handle"></i>
            <div class="link-details">
                <input type="text" class="link-title-input" data-id="${link.id}" data-field="title" value="${link.title}" placeholder="Enter Link Title">
                <input type="text" class="link-url-input" data-id="${link.id}" data-field="url" value="${link.url}" placeholder="Enter URL">
            </div>
            <div class="link-stats">
                <span class="click-count">Clicks: ${link.clicks.toLocaleString()}</span>
            </div>
            <label class="switch">
                <input type="checkbox" ${link.isActive ? 'checked' : ''} data-id="${link.id}" class="link-toggle">
                <span class="slider round"></span>
            </label>
            <button class="delete-btn" data-id="${link.id}"><i class="fas fa-trash"></i></button>
        `;
        linksContainer.appendChild(linkRow);
    });

    attachEventListeners(); // Re-attach listeners after rendering
}


/**
 * Renders the active links in the mobile preview pane.
 */
function renderPreview() {
    previewLinksContainer.innerHTML = ''; // Clear existing preview links

    const activeLinks = links.filter(link => link.isActive);

    if (activeLinks.length === 0) {
        previewLinksContainer.innerHTML = '<p style="color:#95a5a6; padding: 20px;">Your links will appear here.</p>';
        return;
    }

    activeLinks.forEach(link => {
        const button = document.createElement('button');
        button.className = 'preview-link-btn';
        button.textContent = link.title;
        // In a real app, this would be an actual anchor tag or handle click tracking
        button.onclick = () => console.log(`Preview clicked: ${link.title}`);
        previewLinksContainer.appendChild(button);
    });
}

/**
 * Updates the KPI metrics based on current link data.
 */
function updateKPIs() {
    const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);
    const totalViews = 25800; // Static placeholder for this demo
    
    // Calculate a dummy CTR: Clicks / Views (use totalViews placeholder)
    const ctr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

    document.getElementById('total-clicks').textContent = totalClicks.toLocaleString();
    // Re-use static placeholders for a complete look
    document.getElementById('total-views').textContent = totalViews.toLocaleString(); 
    document.getElementById('ctr').textContent = `${ctr.toFixed(2)}%`; 
}


// --- 3. CRUD Operations and Event Handlers ---

/**
 * Adds a new, blank link to the data model.
 */
function addLink() {
    const newLink = {
        id: nextLinkId++,
        title: "New Link Title",
        url: "",
        isActive: true,
        clicks: 0
    };
    links.push(newLink);
    refreshDashboard();
}

/**
 * Updates a specific link's title or URL in the data model.
 */
function updateLink(id, field, value) {
    const link = links.find(l => l.id === id);
    if (link) {
        link[field] = value;
        renderPreview(); // Only need to update preview for text changes
    }
}

/**
 * Toggles the isActive status of a link.
 */
function toggleLink(id) {
    const link = links.find(l => l.id === id);
    if (link) {
        link.isActive = !link.isActive;
        refreshDashboard();
    }
}

/**
 * Deletes a link from the data model.
 */
function deleteLink(id) {
    links = links.filter(l => l.id !== id);
    refreshDashboard();
}

/**
 * Attaches necessary event listeners to dynamically created elements.
 */
function attachEventListeners() {
    // 1. Text Input Listeners (Title & URL)
    linksContainer.querySelectorAll('.link-title-input, .link-url-input').forEach(input => {
        // Use 'input' event for real-time changes
        input.addEventListener('input', (e) => {
            const id = parseInt(e.target.dataset.id);
            const field = e.target.dataset.field;
            updateLink(id, field, e.target.value);
        });
    });

    // 2. Toggle Switch Listeners
    linksContainer.querySelectorAll('.link-toggle').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const id = parseInt(e.target.dataset.id);
            toggleLink(id);
        });
    });

    // 3. Delete Button Listeners
    linksContainer.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            if (confirm('Are you sure you want to delete this link?')) {
                 deleteLink(id);
            }
        });
    });

    // NOTE: Drag-and-drop logic for reordering is omitted for brevity but would attach to .drag-handle
}


/**
 * Main function to refresh all dynamic parts of the dashboard.
 */
function refreshDashboard() {
    renderLinksEditor();
    renderPreview();
    updateKPIs();
}

// --- Initial Setup ---

// Attach listener to the main "Add New Link" button
addLinkBtn.addEventListener('click', addLink);

// Save changes button (placeholder for a real API call)
document.querySelector('.save-changes-btn').addEventListener('click', () => {
    console.log('Publishing changes...', links);
    alert('Changes Published! (Data logged to console)');
});


// Initial render when the page loads
document.addEventListener('DOMContentLoaded', refreshDashboard);
