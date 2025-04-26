// Go To Market page functionality

// Function to load content when menu items are clicked
async function loadContent(contentFile) {
    try {
        const response = await fetch(contentFile);
        if (!response.ok) throw new Error('Content not found');
        const content = await response.text();
        
        // Place content inside doc-middle-content
        const contentContainer = document.querySelector('.doc-middle-content');
        if (contentContainer) {
            contentContainer.innerHTML = content;
            
            // Generate table of contents after content is loaded
            generateTableOfContents();
        }

        // Update URL (without page refresh)
        const newUrl = new URL(window.location.href);
        newUrl.hash = contentFile.split('/').pop().replace('.html', '');
        window.history.pushState({}, '', newUrl);

        // If hash exists in URL, scroll to related content
        if (window.location.hash) {
            // Find target heading
            const targetId = window.location.hash.substring(1);
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                // Instead of fixed offset, ensure it appears at the top of the screen
                const headerHeight = 100; // Estimated height of top menu
                const scrollPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                
                // Scroll page to calculated position
                window.scrollTo({
                    top: scrollPosition,
                    behavior: 'smooth'
                });
            } else {
                // If specific heading not found, go to beginning of content
                const docContent = document.querySelector('.doc_documentation_area');
                if (docContent) {
                    const headerHeight = 100; // Estimated height of top menu
                    window.scrollTo({
                        top: docContent.offsetTop - headerHeight,
                        behavior: 'smooth'
                    });
                }
            }
        }

        // Update active menu item
        updateActiveMenuItem(contentFile);
    } catch (error) {
        console.error('Error loading content:', error);
    }
}

// Function to automatically generate table of contents
function generateTableOfContents() {
    // Select main element containing content
    const contentContainer = document.querySelector('.doc-middle-content article .documentation_body');
    if (!contentContainer) {
        console.log("Content container not found, looking for alternative container...");
        // Alternatively check just article content
        const articleContainer = document.querySelector('.doc-middle-content article');
        if (!articleContainer) {
            console.log("No content container found.");
            return;
        }
        // Use alternative container
        processHeadings(articleContainer);
    } else {
        // Use main container
        processHeadings(contentContainer);
    }
    
    // Helper function to process headings and create table of contents
    function processHeadings(container) {
        // Select all headings (h1, h2, h3, h4)
        const headings = container.querySelectorAll('h1, h2, h3, h4');
        if (headings.length === 0) {
            console.log("No headings found in content.");
            return;
        }
        
        console.log("Number of headings found:", headings.length);
        
        // Container for table of contents
        const tocContainer = document.querySelector('.table-of-content');
        if (!tocContainer) {
            console.log("Table of contents container not found.");
            return;
        }
        
        // Clear table of contents and add heading
        tocContainer.innerHTML = '<h6><i class="icon_ul"></i> Table of Contents </h6>';
        
        // Create list for table of contents
        const navElement = document.createElement('nav');
        navElement.className = 'list-unstyled doc_menu';
        navElement.id = 'toc-nav';
        
        // Elements to hold sub-menus for hierarchical structure
        let currentLevel = 1;
        let currentNav = navElement;
        let navStack = [navElement];
        
        // Create a link for each heading
        headings.forEach((heading, index) => {
            // Assign unique ID to heading (if none exists)
            if (!heading.id) {
                // Create safe ID from heading text
                const safeId = heading.textContent
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '');
                heading.id = safeId || `heading-${index}`;
                console.log("New ID created:", heading.id);
            } else {
                console.log("Existing ID used:", heading.id);
            }
            
            // Determine heading level (h1=1, h2=2, etc.)
            const level = parseInt(heading.tagName.substring(1));
            
            // Truncate long heading text
            const headingText = heading.textContent;
            const maxLength = 40; // Maximum length
            const displayText = headingText.length > maxLength
                ? headingText.substring(0, maxLength) + '...'
                : headingText;
            
            // Create link element
            const link = document.createElement('a');
            link.href = `#${heading.id}`;
            link.className = 'nav-link';
            link.textContent = displayText;
            
            // Show full text as tooltip with title property
            link.title = headingText;
            
            // Create hierarchical structure
            if (level > currentLevel) {
                // Lower level - create new sub-menu
                const subNav = document.createElement('nav');
                subNav.className = 'nav flex-column';
                currentNav.appendChild(subNav);
                navStack.push(subNav);
                currentNav = subNav;
            } else if (level < currentLevel) {
                // Higher level - return to parent menu
                for (let i = 0; i < (currentLevel - level); i++) {
                    if (navStack.length > 1) { // Don't remove main nav
                        navStack.pop();
                    }
                }
                currentNav = navStack[navStack.length - 1];
            }
            
            // Add link to current navigation
            currentNav.appendChild(link);
            currentLevel = level;
        });
        
        // Add created nav element to table of contents
        tocContainer.appendChild(navElement);
        
        // Add click handler to table of contents links to scroll to related heading
        const tocLinks = tocContainer.querySelectorAll('a');
        tocLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    // Instead of fixed offset, ensure it appears at the top of the screen
                    // Position it about 15% down from the top of the screen
                    const headerHeight = 100; // Estimated height of top menu
                    const scrollPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                    
                    // Scroll page to calculated position
                    window.scrollTo({
                        top: scrollPosition,
                        behavior: 'smooth'
                    });
                    
                    // Update URL (without page refresh)
                    const newUrl = new URL(window.location.href);
                    const baseHash = newUrl.hash.split('#')[1]?.split('-')[0];
                    newUrl.hash = baseHash ? `${baseHash}-${targetId}` : targetId;
                    window.history.pushState({}, '', newUrl);
                }
            });
        });
        
        console.log("Table of contents created.");
    }
}

// Function to update active menu item
function updateActiveMenuItem(contentFile) {
    // Remove active class from all menu items
    document.querySelectorAll('.nav-sidebar .nav-item a').forEach(item => {
        item.classList.remove('active');
    });

    // Add active class to clicked menu item
    const activeItem = document.querySelector(`[data-content-file="${contentFile}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
        
        // If in sub-menu, also make parent menu active
        const parentItem = activeItem.closest('.dropdown_nav');
        if (parentItem) {
            const parentLink = parentItem.previousElementSibling;
            if (parentLink && parentLink.tagName === 'A') {
                parentLink.classList.add('active');
            }
        }
    }
}

// Code to run when page loads
document.addEventListener('DOMContentLoaded', function() {
    // First generate table of contents for default content
    generateTableOfContents();
    
    // Menu items may not be loaded yet, so let's wait a bit
    setTimeout(() => {
        initializeGTMPage();
    }, 1000); // Wait 1 second
});

// Load "marketing-plan.html" content by default 
async function initializeGTMPage() {
    // Select all menu items
    const menuItems = document.querySelectorAll('.nav-sidebar .nav-item a');
    
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const contentFile = this.getAttribute('data-content-file');
            if (contentFile) {
                loadContent(contentFile);
            }
        });
    });

    // Load first content by default (marketing-plan.html)
    const firstContentFile = "gtm/marketing-plan.html";
    await loadContent(firstContentFile);
    
    // Make first menu item active by default
    const firstMenuItem = document.querySelector('.nav-sidebar .nav-item a');
    if (firstMenuItem) {
        firstMenuItem.classList.add('active');
    }
} 