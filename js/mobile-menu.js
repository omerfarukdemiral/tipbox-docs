/**
 * Mobile Menu Implementation
 * This script handles the mobile side menu functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.querySelector('.fixed-menu-toggle');
    const breadcrumbSection = document.querySelector('.page_breadcrumb');
    const sideNavPanel = document.querySelector('.side-nav-panel');
    const sideNavOverlay = document.querySelector('.side-nav-overlay');
    const header = document.querySelector('.sticky-nav');
    let menuOpen = false;
    
    // Header yüksekliğini alma - sabit 74px kullan
    function getHeaderHeight() {
        return 74; // Sabit header yüksekliği
    }
    
    // Pozisyonları güncelleme
    function updatePositions() {
        const headerHeight = getHeaderHeight();
        // Menü toggle butonunun pozisyonunu güncelleme
        if (menuToggle && menuToggle.classList.contains('visible')) {
            menuToggle.style.top = headerHeight + 'px';
        }
        
        // Yan menü padding-top değerini güncelleme
        if (sideNavPanel) {
            sideNavPanel.style.paddingTop = headerHeight + 'px';
        }
    }
    
    // Mobil kontrolü
    function isMobile() {
        return window.innerWidth < 568;
    }
    
    function checkScrollPosition() {
        // Sadece mobil görünümde kontrolü yap
        if (breadcrumbSection && menuToggle && isMobile()) {
            const breadcrumbPosition = breadcrumbSection.getBoundingClientRect().top;
            
            // Breadcrumb'ın üstüne gelindiğinde veya geçildiğinde
            if (breadcrumbPosition <= getHeaderHeight()) {
                menuToggle.classList.add('visible');
                updatePositions();
            } else {
                menuToggle.classList.remove('visible');
            }
        } else if (menuToggle && !isMobile()) {
            // Mobil değilse gizle
            menuToggle.classList.remove('visible');
        }
    }
    
    // Sayfa yüklendiğinde pozisyonu kontrol et
    if (menuToggle) {
        checkScrollPosition();
        
        // Scroll olayında pozisyonu kontrol et
        window.addEventListener('scroll', function() {
            checkScrollPosition();
        });
        
        // Ekran boyutu değiştiğinde pozisyonu kontrol et
        window.addEventListener('resize', function() {
            checkScrollPosition();
        });
        
        // Menü açma/kapama düğmesine tıklama olayı
        menuToggle.addEventListener('click', function() {
            if (!menuOpen) {
                // Menüyü aç
                if (sideNavPanel) sideNavPanel.classList.add('open');
                if (sideNavOverlay) sideNavOverlay.classList.add('active');
                menuToggle.classList.add('open');
                document.body.style.overflow = 'hidden'; // Sayfa scrollunu engelle
                menuOpen = true;
            } else {
                // Menüyü kapat
                closeMenu();
            }
        });
    }
    
    // Menüyü kapatma işlevi
    function closeMenu() {
        if (sideNavPanel) sideNavPanel.classList.remove('open');
        if (sideNavOverlay) sideNavOverlay.classList.remove('active');
        if (menuToggle) menuToggle.classList.remove('open');
        document.body.style.overflow = ''; // Sayfa scrollunu geri aç
        menuOpen = false;
    }
    
    // Overlay'e tıklama olayı
    if (sideNavOverlay) {
        sideNavOverlay.addEventListener('click', closeMenu);
    }
    
    // Yan menüdeki linklere tıklama olayı
    const sideNavLinks = document.querySelectorAll('.side-nav-panel .nav-item a');
    sideNavLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Eğer aynı sayfada içerik yükleme fonksiyonu varsa
            const contentFile = this.getAttribute('data-content-file');
            if (contentFile && typeof loadContent === 'function') {
                e.preventDefault();
                
                // Önce tüm linklerden active sınıfını kaldır
                sideNavLinks.forEach(l => l.classList.remove('active'));
                // Tıklanan linke active sınıfını ekle
                this.classList.add('active');
                
                loadContent(contentFile);
                closeMenu();
            }
        });
    });
}); 