// Go To Market page functionality

// Function to load content when menu items are clicked
async function loadContent(contentFile) {
    try {
        const response = await fetch(contentFile);
        if (!response.ok) throw new Error('Content not found');
        const content = await response.text();
        
        // Sayfayı en üste kaydır
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        
        // Place content inside doc-middle-content
        const contentContainer = document.querySelector('.doc-middle-content');
        if (contentContainer) {
            contentContainer.innerHTML = content;
            
            // Generate table of contents after content is loaded
            generateTableOfContents();
            
            // MathJax'i yeniden çalıştır - formülleri işle
            if (window.MathJax) {
                window.MathJax.typeset();
            }
            
            // Scroll dinleyicisini ekle
            initScrollSpy();
        }

        // Update URL (without page refresh)
        const newUrl = new URL(window.location.href);
        newUrl.hash = contentFile.split('/').pop().replace('.html', '');
        window.history.pushState({}, '', newUrl);

        // Update active menu item
        updateActiveMenuItem(contentFile);
    } catch (error) {
        console.error('Error loading content:', error);
    }
}

// Scroll pozisyonuna göre içindekiler tablosundaki elemanları aktif hale getiren fonksiyon
function initScrollSpy() {
    const headings = document.querySelectorAll('.doc-middle-content h1, .doc-middle-content h2, .doc-middle-content h3, .doc-middle-content h4');
    if (headings.length === 0) return;
    
    // Önceki scroll olayını temizle
    window.removeEventListener('scroll', scrollHandler);
    
    // Scroll olayını dinle
    window.addEventListener('scroll', scrollHandler);
    
    // İlk kez kontrol et
    scrollHandler();
    
    function scrollHandler() {
        // Viewport'un en üstünden belirli bir uzaklık (header yüksekliği kadar)
        const scrollPosition = window.scrollY + 150;
        
        // Viewport içinde görünen başlıkları bul
        let currentHeading = null;
        
        // En çok görünen başlığı bul (viewport'un üstüne en yakın olan)
        headings.forEach(heading => {
            if (heading.offsetTop <= scrollPosition) {
                currentHeading = heading;
            }
        });
        
        if (currentHeading) {
            // İçindekiler tablosunda tüm active sınıflarını kaldır
            document.querySelectorAll('.table-of-content a.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            
            // İlgili başlığa ait linki aktif et
            const currentLink = document.querySelector(`.table-of-content a[href="#${currentHeading.id}"]`);
            if (currentLink) {
                currentLink.classList.add('active');
            }
        }
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
                
                // Tüm linklerdeki active sınıfını kaldır
                tocLinks.forEach(l => l.classList.remove('active'));
                
                // Tıklanan linke active sınıfını ekle
                this.classList.add('active');
                
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
        
        // Scroll dinleyicisini başlat
        initScrollSpy();
    }
}

// Function to update active menu item
function updateActiveMenuItem(contentFile) {
    // Remove active class from all menu items
    document.querySelectorAll('.nav-sidebar .nav-item .nav-link').forEach(item => {
        item.classList.remove('active');
    });

    // Hem mobil menüdeki hem de normal menüdeki öğeleri kapsayacak şekilde seçici güncelle
    const activeItems = document.querySelectorAll(`[data-content-file="${contentFile}"]`);
    activeItems.forEach(activeItem => {
        if (activeItem) {
            activeItem.classList.add('active');
        }
    });
}

// Code to run when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Menu items may not be loaded yet, so let's wait a bit
    setTimeout(() => {
        initializeGTMPage();
        // İlk içeriği yükle
        const firstLink = document.querySelector('.nav-sidebar .nav-item .nav-link');
        if (firstLink) {
            const contentFile = firstLink.getAttribute('data-content-file');
            if (contentFile) {
                loadContent(contentFile);
            }
        }
        // Scroll dinleyicisini başlat
        initScrollSpy();
    }, 1000); // Wait 1 second
});

function initializeGTMPage() {
    // Tüm menü elemanlarını seç (hem ana menüden hem de mobil menüden)
    const allMenuItems = document.querySelectorAll('.nav-sidebar .nav-item .nav-link');
    
    allMenuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Önce tüm menü öğelerinden active sınıfını kaldır
            allMenuItems.forEach(menuItem => {
                menuItem.classList.remove('active');
            });
            
            // Tıklanan öğeye active sınıfını ekle
            this.classList.add('active');
            
            const contentFile = this.getAttribute('data-content-file');
            if (contentFile) {
                loadContent(contentFile);
            }
        });
    });
} 