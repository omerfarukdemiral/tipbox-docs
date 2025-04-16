// Project Blueprint sayfası için işlevsellik

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
        }

        // URL'i güncelle (sayfa yenilenmeden)
        const newUrl = new URL(window.location.href);
        newUrl.hash = contentFile.split('/').pop().replace('.html', '');
        window.history.pushState({}, '', newUrl);

        // URL'de hash varsa ilgili içeriğe kaydır
        if (window.location.hash) {
            // Sayfayı içeriğin başladığı yere kaydır (Search Banner'ın altı)
            const docContent = document.querySelector('.doc_documentation_area');
            if (docContent) {
                const offset = 20; // Biraz boşluk bırakmak için
                const topPosition = docContent.offsetTop - offset;
                window.scrollTo({
                    top: topPosition,
                    behavior: 'smooth'
                });
            }
        }

        // Aktif menü öğesini güncelle
        updateActiveMenuItem(contentFile);
    } catch (error) {
        console.error('Error loading content:', error);
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
    // Menü elemanları yüklenmemiş olabilir, bu nedenle biraz bekleyelim
    setTimeout(() => {
        initializeProjectBlueprintPage();
    }, 1000); // 1 saniye bekle
});

function initializeProjectBlueprintPage() {
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

    let isExecutiveSummaryLoaded = false; // Bayrak değişkeni

    // URL'de hash varsa ilgili içeriği yükle
    if (window.location.hash) {
        const contentFile = window.location.hash.slice(1) + '.html';
        loadContent(contentFile);
    } else {
        // Varsayılan olarak executive-summary'yi yükle
        isExecutiveSummaryLoaded = true; // Bayrağı ayarla
        loadContent('project-blueprint/executive-summary.html');
    }

    // İçerik yüklendikten sonra kaydırma işlemi
    if (isExecutiveSummaryLoaded) {
        window.scrollTo(0, 0); // Sayfayı en üste kaydır
    } else if (window.location.hash) {
        // Sayfayı içeriğin başladığı yere kaydır (Search Banner'ın altı)
        const docContent = document.querySelector('.doc_documentation_area');
        if (docContent) {
            const offset = 20; // Biraz boşluk bırakmak için
            const topPosition = docContent.offsetTop - offset;
            window.scrollTo({
                top: topPosition,
                behavior: 'smooth'
            });
        }
    }
} 