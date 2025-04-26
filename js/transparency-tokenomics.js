// Transparency & Tokenomics sayfası için işlevsellik

// Menü elemanlarına tıklandığında içeriği değiştiren fonksiyon
async function loadContent(contentFile) {
    try {
        const response = await fetch(contentFile);
        if (!response.ok) throw new Error('Content not found');
        const content = await response.text();
        
        // İçeriği doc-middle-content içine yerleştir
        const contentContainer = document.querySelector('.doc-middle-content');
        if (contentContainer) {
            contentContainer.innerHTML = content;
            
            // İçerik yüklendikten sonra içindekiler tablosunu oluştur
            generateTableOfContents();
        }

        // URL'i güncelle (sayfa yenilenmeden)
        const newUrl = new URL(window.location.href);
        newUrl.hash = contentFile.split('/').pop().replace('.html', '');
        window.history.pushState({}, '', newUrl);

        // URL'de hash varsa ilgili içeriğe kaydır
        if (window.location.hash) {
            // Hedef başlığı bul
            const targetId = window.location.hash.substring(1);
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                // Sabit bir offset yerine, ekranın üst kısmında görünmesini sağla
                const headerHeight = 100; // Üst menünün tahmini yüksekliği
                const scrollPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                
                // Sayfayı hesaplanan pozisyona kaydır
                window.scrollTo({
                    top: scrollPosition,
                    behavior: 'smooth'
                });
            } else {
                // Eğer belirli bir başlık bulunamazsa, içeriğin başına git
                const docContent = document.querySelector('.doc_documentation_area');
                if (docContent) {
                    const headerHeight = 100; // Üst menünün tahmini yüksekliği
                    window.scrollTo({
                        top: docContent.offsetTop - headerHeight,
                        behavior: 'smooth'
                    });
                }
            }
        }

        // Aktif menü öğesini güncelle
        updateActiveMenuItem(contentFile);
    } catch (error) {
        console.error('Error loading content:', error);
    }
}

// İçindekiler tablosunu otomatik olarak oluşturan fonksiyon
function generateTableOfContents() {
    // İçeriği içeren ana elementi seç
    const contentContainer = document.querySelector('.doc-middle-content article .documentation_body');
    if (!contentContainer) {
        console.log("İçerik konteyneri bulunamadı, alternatif konteyner aranıyor...");
        // Alternatif olarak sadece article içeriğini kontrol et
        const articleContainer = document.querySelector('.doc-middle-content article');
        if (!articleContainer) {
            console.log("Hiçbir içerik konteyneri bulunamadı.");
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
            console.log("İçerik içinde başlık bulunamadı.");
            return;
        }
        
        console.log("Bulunan başlık sayısı:", headings.length);
        
        // İçindekiler tablosu için konteyner
        const tocContainer = document.querySelector('.table-of-content');
        if (!tocContainer) {
            console.log("İçindekiler tablosu konteyneri bulunamadı.");
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
                console.log("Yeni ID oluşturuldu:", heading.id);
            } else {
                console.log("Mevcut ID kullanıldı:", heading.id);
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
        
        console.log("İçindekiler tablosu oluşturuldu.");
    }
}

// Aktif menü öğesini güncelleme fonksiyonu
function updateActiveMenuItem(contentFile) {
    // Tüm menü öğelerinden active sınıfını kaldır
    document.querySelectorAll('.nav-sidebar .nav-item a').forEach(item => {
        item.classList.remove('active');
    });

    // Tıklanan menü öğesine active sınıfını ekle
    const activeItem = document.querySelector(`[data-content-file="${contentFile}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
        
        // Eğer alt menüdeyse, üst menüyü de aktif et
        const parentItem = activeItem.closest('.dropdown_nav');
        if (parentItem) {
            const parentLink = parentItem.previousElementSibling;
            if (parentLink && parentLink.tagName === 'A') {
                parentLink.classList.add('active');
            }
        }
    }
}

// Sayfa yüklendiğinde çalışacak kod
document.addEventListener('DOMContentLoaded', function() {
    // Önce varsayılan içerik için içindekiler tablosunu oluştur
    generateTableOfContents();
    
    // Menü elemanları yüklenmemiş olabilir, bu nedenle biraz bekleyelim
    setTimeout(() => {
        initializeTransparencyTokenomicsPage();
    }, 1000); // 1 saniye bekle
});

// Varsayılan olarak "overview-principles.html" içeriğini yükle 
async function initializeTransparencyTokenomicsPage() {
    // Tüm menü elemanlarını seç
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

    // Varsayılan olarak ilk içeriği yükle (overview-principles.html)
    const firstContentFile = "transparency/overview-principles.html";
    await loadContent(firstContentFile);
    
    // Varsayılan olarak ilk menü öğesini aktif hale getir
    const firstMenuItem = document.querySelector('.nav-sidebar .nav-item a');
    if (firstMenuItem) {
        firstMenuItem.classList.add('active');
    }
} 