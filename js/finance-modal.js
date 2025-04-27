// FINANCIAL SHEET MODALS

// Fix for Tipbox documentation dynamic content loading
let sheetLinksAdded = false;

// Make sure this runs after the element is inserted into the page
function initSheetModals() {
    // Get all elements needed
    const sheetLinks = document.querySelectorAll('.sheet-link');
    const modalOverlay = document.getElementById('sheet-modal-overlay');
    
    // Check if elements exist in the DOM
    if (!modalOverlay) {
        return;
    }
    
    // If no sheet links found and we've already processed them before, don't proceed
    if (sheetLinks.length === 0) {
        return;
    }
    
    // If we've already processed sheet links, don't reattach events
    if (sheetLinksAdded && sheetLinks.length > 0) {
        return;
    }
    
    // Set flag to indicate we've processed the links
    if (sheetLinks.length > 0) {
        sheetLinksAdded = true;
    }
    
    const modalClose = modalOverlay.querySelector('.sheet-modal-close');
    const modalTitle = document.getElementById('sheet-modal-title');
    const sheetIframe = document.getElementById('sheet-iframe');
    
    if (!modalTitle) {
        console.error('📊 FINANCIAL SHEET MODALS ERROR: Modal title element not found');
    }
    
    if (!sheetIframe) {
        console.error('📊 FINANCIAL SHEET MODALS ERROR: Sheet iframe element not found');
    }
    
    // Sheet URL mapping - new published URLs
    const sheetURLs = {
        'ONE-YEAR PROJECTION (DETAILED)': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQvZWPFNOK3XffTDC-UeBbEDTdg_dWbqx8LVLFlriynicvonQyz0PFTmRV7saXINqeozH7uXTg3Xi9k/pubhtml?gid=912511127&single=true&widget=true&headers=false',
        'INCOME STATEMENT': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQvZWPFNOK3XffTDC-UeBbEDTdg_dWbqx8LVLFlriynicvonQyz0PFTmRV7saXINqeozH7uXTg3Xi9k/pubhtml?gid=1803329897&single=true&widget=true&headers=false',
        'TOKENOMICS SUMMARY': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQvZWPFNOK3XffTDC-UeBbEDTdg_dWbqx8LVLFlriynicvonQyz0PFTmRV7saXINqeozH7uXTg3Xi9k/pubhtml?gid=1846167923&single=true&widget=true&headers=false',
        'VESTING TABLE': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQvZWPFNOK3XffTDC-UeBbEDTdg_dWbqx8LVLFlriynicvonQyz0PFTmRV7saXINqeozH7uXTg3Xi9k/pubhtml?gid=444539122&single=true&widget=true&headers=false'
    };
    
    // Display titles mapping (for pretty titles)
    const displayTitles = {
        'ONE-YEAR PROJECTION (DETAILED)': 'One-Year Projection (Detailed)',
        'INCOME STATEMENT': 'Income Statement',
        'TOKENOMICS SUMMARY': 'Tokenomics Summary',
        'VESTING TABLE': 'Tokenomics & Vesting Table'
    };
    
    // Close modal functionality
    function closeModal() {
        modalOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Clear iframe source when closing to prevent issues
        if (sheetIframe) {
            sheetIframe.src = 'about:blank';
        }
    }
    
    // Handle iframe loading
    if (sheetIframe) {
        sheetIframe.addEventListener('load', function() {
            // Remove loading class when iframe is loaded
            const modalBody = document.querySelector('.sheet-modal-body');
            if (modalBody && modalBody.classList.contains('loading')) {
                modalBody.classList.remove('loading');
            }
        });
    }
    
    // Attach click events to all sheet links
    sheetLinks.forEach((link, index) => {
        // Clean up any existing event listeners to prevent duplicates
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);
        
        newLink.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const sheetName = this.getAttribute('data-sheet');
            
            // Make sure we can still access the modal
            const overlay = document.getElementById('sheet-modal-overlay');
            const title = document.getElementById('sheet-modal-title');
            const iframe = document.getElementById('sheet-iframe');
            
            if (!overlay || !title || !iframe) {
                return;
            }
            
            // Use the display title if available, otherwise use the sheet name
            title.textContent = displayTitles[sheetName] || sheetName;
            
            // Get the URL for this sheet
            const sheetURL = sheetURLs[sheetName];
            
            if (!sheetURL) {
                return;
            }
            
            // Show the modal first
            overlay.style.display = 'block';
            document.body.style.overflow = 'hidden';
            
            // Add loading class to modal body
            const modalBody = document.querySelector('.sheet-modal-body');
            if (modalBody) {
                modalBody.classList.add('loading');
            }
            
            // Set proper iframe permissions
            iframe.setAttribute('allowfullscreen', 'true');
            iframe.setAttribute('allow', 'autoplay');
            
            // Clear existing iframe content
            iframe.src = 'about:blank';
            
            // Small delay before loading new content
            setTimeout(() => {
                // Set the iframe source
                iframe.src = sheetURL;
            }, 100);
            
            return false;
        });
    });
    
    // Setup modal close functionality
    if (modalClose) {
        // Clean up existing event listeners
        const newCloseBtn = modalClose.cloneNode(true);
        modalClose.parentNode.replaceChild(newCloseBtn, modalClose);
        
        newCloseBtn.addEventListener('click', function(e) {
            e.preventDefault();
            closeModal();
        });
    } else {
        console.error('📊 FINANCIAL SHEET MODALS ERROR: Close button not found');
    }
    
    // Close modal when clicking outside content
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });
    
    // Close modal with Esc key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modalOverlay.style.display === 'block') {
            closeModal();
        }
    });
    
    // Add a global variable for external access (debugging)
    window.financialSheetModals = {
        openModal: function(sheetName) {
            const link = Array.from(document.querySelectorAll('.sheet-link')).find(l => l.getAttribute('data-sheet') === sheetName);
            if (link) {
                link.click();
                return true;
            }
            return false;
        },
        closeModal: closeModal,
        getLinks: () => Array.from(document.querySelectorAll('.sheet-link')).map(l => l.getAttribute('data-sheet')),
        reinitialize: initSheetModals
    };
}

// Define a special function to reinitialize modals when financial page is shown
window.reinitializeFinancialModals = function() {
    // Reset the flag to allow processing again
    sheetLinksAdded = false;
    // Run initialization
    setTimeout(initSheetModals, 100);
};

// Run initialization at different points to ensure capturing
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initSheetModals, 500);
});

// For dynamically loaded content
function runInitWithDelay(delay) {
    setTimeout(function() {
        initSheetModals();
    }, delay);
}

// Multiple initialization attempts to catch dynamic loading
runInitWithDelay(1000);
runInitWithDelay(2000);
runInitWithDelay(5000);

// Special handling for Tipbox documentation system
// Check for any navigation click that might load the financial projections page
document.addEventListener('click', function(e) {
    // Check if the clicked element is a navigation link
    if (e.target && (
        e.target.matches('.nav-link[data-content-file="company/financial-projections-break-even-analysis.html"]') ||
        e.target.closest('.nav-link[data-content-file="company/financial-projections-break-even-analysis.html"]')
    )) {
        // Reset the flag
        sheetLinksAdded = false;
        // Set up delayed initializations
        setTimeout(initSheetModals, 300);
        setTimeout(initSheetModals, 800);
        setTimeout(initSheetModals, 1500);
    }
});

// Add a MutationObserver to detect when financial content is loaded
const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.addedNodes && mutation.addedNodes.length > 0) {
            // Check if our financial content was added
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    // Look for the financial content ID or sheet links within this node
                    if (node.id === 'financial-projections-break-even-analysis' || 
                        (node.querySelector && node.querySelector('.sheet-link'))) {
                        // Reset the flag when new content is detected
                        sheetLinksAdded = false;
                        setTimeout(initSheetModals, 200);
                    }
                    
                    // Also check for any content that might contain our content
                    if (node.querySelector && node.querySelector('#financial-projections-break-even-analysis, .sheet-link')) {
                        // Reset the flag when new container is detected
                        sheetLinksAdded = false;
                        setTimeout(initSheetModals, 200);
                    }
                }
            });
        }
    });
});

// Start observing the document for content changes
observer.observe(document.body, { childList: true, subtree: true });

// Check for any API calls that might load content
const originalFetch = window.fetch;
if (originalFetch) {
    window.fetch = function() {
        const fetchPromise = originalFetch.apply(this, arguments);
        
        fetchPromise.then(function() {
            // After any fetch, check if we need to reinitialize
            setTimeout(function() {
                const financialContent = document.getElementById('financial-projections-break-even-analysis');
                const sheetLinks = document.querySelectorAll('.sheet-link');
                
                if (financialContent || sheetLinks.length > 0) {
                    sheetLinksAdded = false;
                    initSheetModals();
                }
            }, 500);
        });
        
        return fetchPromise;
    };
}

// Manual initialization function - can be called from outside
window.initFinancialSheetModals = function() {
    sheetLinksAdded = false;
    initSheetModals();
}; 