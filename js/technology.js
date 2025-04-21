/**
 * Teknoloji sayfası için özel JavaScript fonksiyonları
 */

document.addEventListener("DOMContentLoaded", async function() {
    try {
        // Menü öğelerine tıklama olay dinleyicileri ekle
        setupMenuListeners();
        
        // Varsayılan içeriği yükle (ilk başta)
        if (document.getElementById('technology-content-area')) {
            loadTechnologyContent('multi-layered-architecture');
        }
    } catch (error) {
        console.error("Teknoloji sayfası başlatma hatası:", error);
    }
});

/**
 * Menü öğelerine tıklama olay dinleyicileri ekler
 */
function setupMenuListeners() {
    const menuItems = document.querySelectorAll('.nav-sidebar .nav-item a[data-content]');
    
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const contentFile = this.getAttribute('data-content');
            if (contentFile) {
                loadTechnologyContent(contentFile);
            }
        });
    });
}

/**
 * Teknoloji içeriğini belirtilen dosyadan yükler
 * @param {string} contentFile - Yüklenecek içerik dosyasının adı (uzantısız)
 */
function loadTechnologyContent(contentFile) {
    const contentArea = document.getElementById('technology-content-area');
    if (!contentArea) return;
    
    // Aktif menü öğesini güncelle
    document.querySelectorAll('.nav-sidebar .nav-item a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-content') === contentFile) {
            link.classList.add('active');
        }
    });
    
    // İçeriği yükle - proje ana klasöründeki technology klasöründen yükle
    fetch(`technology/${contentFile}.html`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            contentArea.innerHTML = html;
            
            // Başlık güncellemesini yapmak isterseniz:
            // updatePageTitle(contentFile);
            
            // URL güncellemesi yapmak isterseniz:
            // window.history.pushState({}, '', `technology.html?content=${contentFile}`);
        })
        .catch(error => {
            console.error("İçerik yükleme hatası:", error);
            contentArea.innerHTML = `<div class="alert alert-danger">İçerik yüklenirken bir hata oluştu: ${error.message}</div>`;
        });
}

/**
 * URL'deki parametreye göre sayfa içeriğini yükler (sayfa yenilendiğinde kullanılabilir)
 */
function loadContentFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const contentParam = urlParams.get('content');
    
    if (contentParam) {
        loadTechnologyContent(contentParam);
    } else {
        // Varsayılan içeriği yükle
        loadTechnologyContent('multi-layered-architecture');
    }
}

/**
 * Sayfa başlığını içerik dosyasına göre günceller (isteğe bağlı)
 * @param {string} contentFile - İçerik dosyasının adı
 */
function updatePageTitle(contentFile) {
    let pageTitle = 'Teknoloji | TipBox Documentation';
    
    switch(contentFile) {
        case 'multi-layered-architecture':
            pageTitle = 'Çok Katmanlı Mimari | Teknoloji | TipBox';
            break;
        case 'application-architecture':
            pageTitle = 'Uygulama Mimarisi | Teknoloji | TipBox';
            break;
        case 'network-infrastructure':
            pageTitle = 'Ağ Altyapısı | Teknoloji | TipBox';
            break;
        case 'core-architectural-principles':
            pageTitle = 'Temel Mimari Prensipler | Teknoloji | TipBox';
            break;
    }
    
    document.title = pageTitle;
} 