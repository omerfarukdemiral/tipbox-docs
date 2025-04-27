// Transparency & Tokenomics sayfası için işlevsellik

// Menü elemanlarına tıklandığında içeriği değiştiren fonksiyon
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
        
        // İçeriği doc-middle-content içine yerleştir
        const contentContainer = document.querySelector('.doc-middle-content');
        if (contentContainer) {
            contentContainer.innerHTML = content;
            
            // İçerik yüklendikten sonra içindekiler tablosunu oluştur
            generateTableOfContents();
            
            // MathJax'i yeniden çalıştır - formülleri işle
            if (window.MathJax) {
                window.MathJax.typeset();
            }
            
            // Scroll dinleyicisini ekle
            initScrollSpy();
            
            // İçerik yüklendikten sonra grafikleri başlat
            if (typeof initTransparencyElements === 'function' && contentFile.includes('transparency.html')) {
                // Biraz bekleyerek DOM'un tamamen yüklenmesini sağla
                setTimeout(() => {
                    initTransparencyElements();
                }, 300);
            }
        }

        // URL'i güncelle (sayfa yenilenmeden)
        const newUrl = new URL(window.location.href);
        newUrl.hash = contentFile.split('/').pop().replace('.html', '');
        window.history.pushState({}, '', newUrl);

        // Aktif menü öğesini güncelle
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

// İçindekiler tablosunu otomatik olarak oluşturan fonksiyon
function generateTableOfContents() {
    // İçeriği içeren ana elementi seç
    const contentContainer = document.querySelector('.doc-middle-content article .documentation_body');
    if (!contentContainer) {
        // Alternatif olarak sadece article içeriğini kontrol et
        const articleContainer = document.querySelector('.doc-middle-content article');
        if (!articleContainer) {
            return;
        }
        // Alternatif konteyneri kullan
        processHeadings(articleContainer);
    } else {
        // Ana konteyneri kullan
        processHeadings(contentContainer);
    }
    
    // Başlıkları işleyip içindekiler tablosunu oluşturan yardımcı fonksiyon
    function processHeadings(container) {
        // Tüm başlıkları seç (h1, h2, h3, h4)
        const headings = container.querySelectorAll('h1, h2, h3, h4');
        if (headings.length === 0) {
            return;
        }
        
        // İçindekiler tablosu için konteyner
        const tocContainer = document.querySelector('.table-of-content');
        if (!tocContainer) {
            return;
        }
        
        // İçindekiler tablosunu temizle ve başlığı ekle
        tocContainer.innerHTML = '<h6><i class="icon_ul"></i> Table of Contents </h6>';
        
        // İçindekiler listesini oluştur
        const navElement = document.createElement('nav');
        navElement.className = 'list-unstyled doc_menu';
        navElement.id = 'toc-nav';
        
        // Hierarşik yapı için alt menüleri tutacak öğeler
        let currentLevel = 1;
        let currentNav = navElement;
        let navStack = [navElement];
        
        // Her başlık için bir link oluştur
        headings.forEach((heading, index) => {
            // Başlığa benzersiz bir ID ata (eğer yoksa)
            if (!heading.id) {
                // Başlık metninden güvenli bir ID oluştur
                const safeId = heading.textContent
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '');
                heading.id = safeId || `heading-${index}`;
            } else {
            }
            
            // Başlık seviyesini belirle (h1=1, h2=2, vb.)
            const level = parseInt(heading.tagName.substring(1));
            
            // Uzun başlık metinlerini kırpma
            const headingText = heading.textContent;
            const maxLength = 40; // Maksimum uzunluk
            const displayText = headingText.length > maxLength
                ? headingText.substring(0, maxLength) + '...'
                : headingText;
            
            // Link öğesini oluştur
            const link = document.createElement('a');
            link.href = `#${heading.id}`;
            link.className = 'nav-link';
            link.textContent = displayText;
            
            // Title özelliği ile tam metni tooltip olarak göster
            link.title = headingText;
            
            // Hierarşik yapıyı oluştur
            if (level > currentLevel) {
                // Alt seviye - yeni bir alt menü oluştur
                const subNav = document.createElement('nav');
                subNav.className = 'nav flex-column';
                currentNav.appendChild(subNav);
                navStack.push(subNav);
                currentNav = subNav;
            } else if (level < currentLevel) {
                // Üst seviye - üst menüye dön
                for (let i = 0; i < (currentLevel - level); i++) {
                    if (navStack.length > 1) { // Ana nav'ı çıkarma
                        navStack.pop();
                    }
                }
                currentNav = navStack[navStack.length - 1];
            }
            
            // Linki mevcut navegasyona ekle
            currentNav.appendChild(link);
            currentLevel = level;
        });
        
        // Oluşturulan nav elementi içindekiler tablosuna ekle
        tocContainer.appendChild(navElement);
        
        // İçindekiler tablosundaki linklere tıklandığında ilgili başlığa kay
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
                    // Sabit bir offset yerine, ekranın üst kısmında görünmesini sağla
                    // Ekran yüksekliğinin %15'i kadar aşağıda olsun
                    const headerHeight = 100; // Üst menünün tahmini yüksekliği
                    const scrollPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                    
                    // Sayfayı hesaplanan pozisyona kaydır
                    window.scrollTo({
                        top: scrollPosition,
                        behavior: 'smooth'
                    });
                    
                    // URL'i güncelle (sayfa yenilenmeden)
                    const newUrl = new URL(window.location.href);
                    const baseHash = newUrl.hash.split('#')[1]?.split('-')[0];
                    newUrl.hash = baseHash ? `${baseHash}-${targetId}` : targetId;
                    window.history.pushState({}, '', newUrl);
                }
            });
        });
        
        // Scroll dinleyicisini başlat
        initScrollSpy();
    }
}

// Aktif menü öğesini güncelleme fonksiyonu
function updateActiveMenuItem(contentFile) {
    // Tüm menü öğelerinden active sınıfını kaldır
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

// Sayfa yüklendiğinde çalışacak kod
document.addEventListener('DOMContentLoaded', function() {
    // Menü elemanları yüklenmemiş olabilir, bu nedenle biraz bekleyelim
    setTimeout(() => {
        initializeTransparencyTokenomicsPage();
        // İlk içeriği yükle (eğer URL'de hash yoksa)
        if (!window.location.hash) {
            const firstLink = document.querySelector('.nav-sidebar .nav-item .nav-link');
            if (firstLink) {
                const contentFile = firstLink.getAttribute('data-content-file');
                if (contentFile) {
                    loadContent(contentFile);
                }
            }
        }
        // Scroll dinleyicisini başlat
        initScrollSpy();
    }, 1000); // 1 saniye bekle
});

async function initializeTransparencyTokenomicsPage() {
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