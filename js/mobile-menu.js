/**
 * Mobile Menu Implementation
 * This script handles the mobile side menu functionality
 * Menu styling is controlled via mobile-menu.css
 * Theme colors: Menu background: #d8ff08 (sarı), Text color: #121318 (siyah)
 */
document.addEventListener('DOMContentLoaded', function() {
    // Gerekli elementleri seçelim
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
    
    // Menüyü açma fonksiyonu
    function openMenu() {
        if (sideNavPanel) sideNavPanel.classList.add('open');
        if (sideNavOverlay) sideNavOverlay.classList.add('active');
        if (menuToggle) menuToggle.classList.add('open');
        document.body.style.overflow = 'hidden'; // Sayfa scrollunu engelle
        menuOpen = true;
    }
    
    // Menüyü kapatma işlevi
    function closeMenu() {
        if (sideNavPanel) sideNavPanel.classList.remove('open');
        if (sideNavOverlay) sideNavOverlay.classList.remove('active');
        if (menuToggle) menuToggle.classList.remove('open');
        document.body.style.overflow = ''; // Sayfa scrollunu geri aç
        menuOpen = false;
    }
    
    // Menü toggle fonksiyonu
    function toggleMenu(e) {
        if (e) e.preventDefault();
        
        if (!menuOpen) {
            openMenu();
        } else {
            closeMenu();
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
        
        // Önce varsa eski event listener'ı temizle
        menuToggle.removeEventListener('click', toggleMenu);
        
        // Menü açma/kapama düğmesine tıklama olayı ekle
        menuToggle.addEventListener('click', toggleMenu);
    }
    
    // Overlay'e tıklama olayı
    if (sideNavOverlay) {
        sideNavOverlay.removeEventListener('click', closeMenu);
        sideNavOverlay.addEventListener('click', closeMenu);
    }
    
    // Link tıklama olayı handler fonksiyonu
    function handleLinkClick(e) {
        // Eğer aynı sayfada içerik yükleme fonksiyonu varsa
        const contentFile = this.getAttribute('data-content-file');
        if (contentFile && typeof loadContent === 'function') {
            e.preventDefault();
            
            // Önce tüm linklerden active sınıfını kaldır
            document.querySelectorAll('.side-nav-panel .nav-item a').forEach(l => l.classList.remove('active'));
            // Tıklanan linke active sınıfını ekle
            this.classList.add('active');
            
            loadContent(contentFile);
            closeMenu();
        }
    }
    
    // Yan menüdeki linklere tıklama olayı
    const sideNavLinks = document.querySelectorAll('.side-nav-panel .nav-item a');
    sideNavLinks.forEach(link => {
        // Önce varsa eski event listener'ı temizle
        link.removeEventListener('click', handleLinkClick);
        // Yeni event listener ekle
        link.addEventListener('click', handleLinkClick);
    });
}); 