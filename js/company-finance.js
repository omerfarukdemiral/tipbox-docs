// Company & Finance page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    console.log('Company & Finance page scripts loaded');
    setupContentNavigation();
});

// Set up navigation and content loading
function setupContentNavigation() {
    // Handle nav-link clicks to load content
    document.querySelectorAll('.nav-sidebar .nav-link, .side-nav-panel .nav-link').forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const contentFile = this.getAttribute('data-content-file');
            
            if (contentFile) {
                loadContent(contentFile);
                
                // Update active state on sidebars
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                document.querySelectorAll(`.nav-link[data-content-file="${contentFile}"]`).forEach(l => {
                    l.classList.add('active');
                });
                
                // Close mobile menus if open
                const sideNavPanel = document.querySelector('.side-nav-panel');
                const sideNavOverlay = document.querySelector('.side-nav-overlay');
                if (sideNavPanel && sideNavPanel.classList.contains('show')) {
                    sideNavPanel.classList.remove('show');
                    if (sideNavOverlay) sideNavOverlay.classList.remove('show');
                }
            }
        });
    });
    
    // Load initial content (first nav item)
    const firstNavLink = document.querySelector('.nav-sidebar .nav-link');
    if (firstNavLink) {
        firstNavLink.click();
    } else {
        console.warn('No navigation links found for initial content loading');
    }
}

// Load content from specified file
function loadContent(contentFile) {
    console.log('Loading content:', contentFile);
    const contentArea = document.querySelector('.doc-middle-content article');
    
    if (!contentArea) {
        console.error('Content area not found');
        return;
    }
    
    // Show loading state
    contentArea.innerHTML = '<div class="documentation_body"><div class="shortcode_title"><h1>Loading...</h1></div></div>';
    
    // Fetch and load the content file
    fetch(contentFile)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(html => {
            contentArea.innerHTML = html;
            
            // Extract ID and heading from the loaded content
            const articleId = contentArea.querySelector('article')?.id;
            const heading = contentArea.querySelector('h1')?.textContent;
            
            // Update article ID and heading ID
            if (articleId) {
                contentArea.id = articleId;
            }
            
            if (contentArea.querySelector('h1')) {
                contentArea.querySelector('h1').id = (articleId || 'page') + '-heading';
            }
            
            // Update document title
            document.title = (heading || 'Company & Finance') + ' | TipBox Documentation';
            
            // Generate table of contents
            generateTOC();
            
            // Initialize financial sheet modals if this is the financial projections page
            if (contentFile === 'company/financial-projections-break-even-analysis.html') {
                console.log('Financial projections page loaded, initializing modals...');
                if (window.reinitializeFinancialModals) {
                    // Use a delay to ensure DOM is updated
                    setTimeout(function() {
                        window.reinitializeFinancialModals();
                    }, 300);
                } else {
                    console.warn('reinitializeFinancialModals function not found');
                }
            }
        })
        .catch(error => {
            console.error('Error loading content:', error);
            contentArea.innerHTML = `
                <div class="documentation_body">
                    <div class="shortcode_title">
                        <h1>Error Loading Content</h1>
                        <p>Sorry, we couldn't load the requested content. Please try again later.</p>
                        <p class="error-details">${error.message}</p>
                    </div>
                </div>
            `;
        });
}

// Generate Table of Contents from page headings
function generateTOC() {
    const contentArea = document.querySelector('.doc-middle-content article');
    const tocNav = document.getElementById('toc-nav');
    
    if (!contentArea || !tocNav) {
        return;
    }
    
    // Clear existing TOC
    tocNav.innerHTML = '';
    
    // Find all headings in the content area
    const headings = contentArea.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    if (headings.length <= 1) { // Skip if only the title is present
        return;
    }
    
    // Create TOC items for each heading
    headings.forEach(function(heading) {
        // Skip the main title (h1)
        if (heading.tagName === 'H1') {
            return;
        }
        
        // Ensure heading has an ID for linking
        if (!heading.id) {
            heading.id = 'heading-' + heading.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        }
        
        // Create TOC item
        const item = document.createElement('li');
        const link = document.createElement('a');
        
        link.href = '#' + heading.id;
        link.textContent = heading.textContent;
        link.classList.add('nav-link');
        
        // Add appropriate class based on heading level
        item.classList.add('nav-item', 'nav-item-' + heading.tagName.toLowerCase());
        
        item.appendChild(link);
        tocNav.appendChild(item);
        
        // Add click handler for smooth scrolling
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetElement = document.getElementById(heading.id);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
} 