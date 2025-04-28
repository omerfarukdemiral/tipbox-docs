/**
 * Transparency Page Interactive Features
 */

// Global Chart objects
let distributionChart = null;

document.addEventListener('DOMContentLoaded', () => {
    initTransparencyElements();
});

// Function defined separately to be able to initialize charts later on the page
function initTransparencyElements() {
    // Check for Chart.js library
    if (typeof Chart !== 'undefined') {
        // Check if canvas elements exist for the charts
        const tokenDistributionChartElement = document.getElementById('tokenDistributionChart');
        
        if (tokenDistributionChartElement) {
            renderDistributionChart();
        }
    } else {
        console.error('Chart.js library not found! Make sure you have loaded the library.');
    }
    
    // Token category address view buttons 
    initAddressViewButtons();
    
    // Modal controls
    initModalControls();
    
    // Scroll when Get Started button is clicked
    initGetStartedButton();
    
    // Token category visibility
    initTokenCategoryInteraction();
    
    // Expand all category descriptions on load
    expandAllCategoryDescriptions();

    // Theme Management
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const htmlElement = document.documentElement;
    
    // Check saved theme or set dark theme as default
    const savedTheme = localStorage.getItem('tipbox-theme') || 'dark';
    htmlElement.setAttribute('data-theme', savedTheme);
    
    // Theme toggle function
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = htmlElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            htmlElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('tipbox-theme', newTheme);
            
            // Recreate charts after theme change (with a slight delay)
            setTimeout(() => {
                renderDistributionChart();
            }, 100); // Small delay to let theme change complete
        });
    }
}

/**
 * Render token distribution chart
 */
function renderDistributionChart() {
    // If a previous chart exists, destroy it before creating a new one
    if (distributionChart) {
        distributionChart.destroy();
    }

    const ctx = document.getElementById('tokenDistributionChart');
    
    if (!ctx) {
        console.error('Canvas not found for distribution chart!');
        return;
    }
    
    const isDark = isDarkMode();
    
    // Category data - matches the screenshot
    const data = {
        labels: ['Reward Farming', 'Strategic Investors', 'Development', 'Ecosystem', 'Staking', 'Liquidity', 'Reserve', 'Advisors'],
        datasets: [{
            data: [40, 15, 15, 10, 10, 5, 4, 1],
            backgroundColor: [
                '#7986CB', // Reward Farming - Purple-blue
                '#4f71e7', // Strategic Investors - Blue
                '#a56bfc', // Development - Purple
                '#64FFDA', // Ecosystem - Turquoise
                '#FFA726', // Staking - Orange
                '#5CD6B1', // Liquidity - Green
                '#EF5350', // Reserve - Red
                '#80DEEA'  // Advisors - Light Blue
            ],
            borderWidth: 0,
            hoverOffset: 15
        }]
    };
    
    // Create pie chart - matches the screenshot
    distributionChart = new Chart(ctx, {
        type: 'pie',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: 20
            },
            plugins: {
                legend: {
                    display: false // Hide legend, already showing on the right
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                    titleColor: isDark ? '#FFFFFF' : '#000000',
                    bodyColor: isDark ? '#FFFFFF' : '#000000',
                    bodyFont: {
                        family: "'Jura', sans-serif",
                        size: 14
                    },
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: %${context.raw}`;
                        }
                    }
                }
            },
            elements: {
                arc: {
                    borderWidth: 0,
                }
            },
            cutout: '0%' // Full pie slice
        }
    });
}

/**
 * Address view buttons
 */
function initAddressViewButtons() {
    const addressButtons = document.querySelectorAll('.view-address a');
    
    addressButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const address = this.dataset.address || '0x1234567890abcdef1234567890abcdef12345678';
            alert(`This feature is not implemented yet. Address to be displayed: ${address}`);
        });
    });
}

/**
 * Initialize modal popup controls
 */
function initModalControls() {
    const openModalBtns = document.querySelectorAll('.open-modal');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const modals = document.querySelectorAll('.modal');
    
    openModalBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetModal = document.getElementById(this.dataset.modal);
            if (targetModal) {
                targetModal.classList.add('active');
                document.body.style.overflow = 'hidden'; // Prevent page scrolling
            }
        });
    });
    
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
                document.body.style.overflow = ''; // Re-enable page scrolling
            }
        });
    });
    
    // Close on outside click
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
    
    // Close with ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            modals.forEach(modal => {
                if (modal.classList.contains('active')) {
                    modal.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        }
    });
}

/**
 * Smooth scroll to token distribution section when "Let's Get Started" button is clicked
 */
function initGetStartedButton() {
    const getStartedBtn = document.querySelector('.get-started-btn button');
    
    if (!getStartedBtn) return;
    
    getStartedBtn.addEventListener('click', (e) => {
        // Prevent default behavior for modal opening
        // e.preventDefault();
        
        // Smooth scroll
        const tokenDistributionSection = document.querySelector('.token-distribution-section');
        
        if (tokenDistributionSection) {
            // Scroll operation happens after 300ms, so the modal opening animation completes first
            setTimeout(() => {
                tokenDistributionSection.scrollIntoView({ 
                    behavior: 'smooth' 
                });
            }, 300);
        }
    });
}

/**
 * Show/hide details when token categories are clicked
 */
function initTokenCategoryInteraction() {
    const tokenCategories = document.querySelectorAll('.token-category');
    
    tokenCategories.forEach(category => {
        const header = category.querySelector('.category-header');
        const description = category.querySelector('.category-description');
        
        if (header && description) {
            header.style.cursor = 'pointer';
            
            header.addEventListener('click', () => {
                description.classList.toggle('expanded');
                
                // Icon change when header is clicked can be added here
                const icon = header.querySelector('.toggle-icon');
                if (icon) {
                    icon.classList.toggle('active');
                }
            });
        }
    });
}

/**
 * Expand all category descriptions when page loads
 */
function expandAllCategoryDescriptions() {
    const descriptions = document.querySelectorAll('.category-description');
    
    descriptions.forEach(description => {
        description.classList.add('expanded');
    });
}

/**
 * For data to be displayed in modal
 */
function loadTokenData() {
    // This function could fetch data from API in a real application
    // Using static data for example
    
    // Show token data
    updateTokenMetrics({
        unlockedSupply: 0,
        circulatingSupply: 0,
        totalSupply: 100000000,
        categories: [
            {
                name: 'Reward Farming',
                percentage: 40,
                unlockedPercentage: 0,
                circulatingPercentage: 0,
                circulatingAmount: 0,
                address: '0x1234...'
            },
            {
                name: 'Strategic Investors',
                percentage: 15,
                unlockedPercentage: 0,
                circulatingPercentage: 0,
                circulatingAmount: 0,
                address: '0x5678...'
            },
            // Other categories can be added here
        ]
    });
}

/**
 * Update token metrics
 */
function updateTokenMetrics(data) {
    // In a real application, DOM elements would be updated with API data here
    console.log('Token metrics updated with:', data);
}

/**
 * Check if current theme is dark
 */
function isDarkMode() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
}

// Page scroll buttons
document.addEventListener('DOMContentLoaded', function() {
    const scrollLinks = document.querySelectorAll('a.scroll-link');
    
    scrollLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                window.scrollTo({
                    top: targetSection.offsetTop - 100,
                    behavior: 'smooth'
                });
            }
        });
    });
});

// Show/hide category descriptions on click
document.addEventListener('DOMContentLoaded', function() {
    const categoryDescriptions = document.querySelectorAll('.category-description');
    const categoryCards = document.querySelectorAll('.token-category-card');
    
    categoryCards.forEach(card => {
        card.addEventListener('click', function() {
            const description = this.querySelector('.category-description');
            if (description) {
                description.classList.toggle('expanded');
            }
        });
    });
});

// Update charts when theme changes
function updateChartsForTheme(theme) {
    // Access chart objects and recreate them
    renderDistributionChart();
}

/**
 * Refresh all charts
 */
function refreshAllCharts() {
    if (distributionChart) {
        distributionChart.update();
    }
} 