// Lightbox özelliği için gerekli kodlar
document.addEventListener('DOMContentLoaded', function() {
    // Güvenlik ayarlarını kontrol et
    if (window.securityConfig && window.securityConfig.disableImageInteraction) {
        return; // Resim etkileşimi devre dışı ise, Lightbox'ı başlatma
    }
    
    // Hemen başlat
    initLightbox();
    
    // Sayfa tamamen yüklendikten sonra tekrar başlatmayı dene
    setTimeout(function() {
        initLightbox();
    }, 3000);
});

// Doğrudan belge düzeyinde tıklama eventi dinleyicisi
document.addEventListener('click', function(e) {
    // Tıklanan element veya ebeveynlerinden biri bir resim mi kontrol et
    const clickedElement = e.target;
    
    if (clickedElement.tagName === 'IMG' && 
       (clickedElement.closest('.documentation_body') || 
        clickedElement.closest('.shortcode_title') || 
        clickedElement.closest('.shortcode_info'))) {
        
        const images = document.querySelectorAll('.documentation_body img, .shortcode_title img, .shortcode_info img');
        let index = Array.from(images).indexOf(clickedElement);
        
        if (index !== -1) {
            e.preventDefault();
            e.stopPropagation();
            openLightbox(clickedElement, index, images);
        }
    }
});

// Lightbox durumunu takip eden değişkenler
let currentZoom = 1;
let currentRotation = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let imagePositionX = 0;
let imagePositionY = 0;

function initLightbox() {
    // Sayfa yüklendiğinde overlay oluştur
    createLightboxOverlay();
    
    // Tüm uygun resimlere tıklama özelliği ekle
    const images = document.querySelectorAll('.documentation_body img, .shortcode_title img, .shortcode_info img');
    
    images.forEach((img, index) => {
        // Alt metin kontrolü
        const altText = img.getAttribute('alt') || 'Resim';
        
        // Önce tüm eski event listener'ları temizle
        const newImg = img.cloneNode(true);
        img.parentNode.replaceChild(newImg, img);
        
        // Resme tıklama özelliği ekle
        newImg.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation(); // Olayın daha fazla yayılmasını önle
            openLightbox(this, index, images);
            return false;
        });
        
        // Resmi tıklanabilir yap (zaten CSS'de yapıldı, burada da işaretleyelim)
        newImg.style.cursor = 'pointer';
        newImg.style.pointerEvents = 'all';
    });
    
    // Escpe tuşu ile lightbox'ı kapat
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeLightbox();
        }
        
        // Sağ ve sol ok tuşları ile gezinme
        if (document.querySelector('.img-lightbox-overlay.active')) {
            if (e.key === 'ArrowRight') {
                navigateLightbox('next');
            } else if (e.key === 'ArrowLeft') {
                navigateLightbox('prev');
            } else if (e.key === '+' || e.key === '=') {
                // + tuşu ile yakınlaştırma
                zoomImage(0.1);
            } else if (e.key === '-' || e.key === '_') {
                // - tuşu ile uzaklaştırma
                zoomImage(-0.1);
            } else if (e.key === 'r' || e.key === 'R') {
                // r tuşu ile resmi döndürme
                rotateImage(90);
            } else if (e.key === '0') {
                // 0 tuşu ile sıfırlama
                resetImage();
            }
        }
    });
}

// Lightbox overlay'ini oluştur
function createLightboxOverlay() {
    // Eğer zaten varsa, bir daha oluşturma
    if (document.querySelector('.img-lightbox-overlay')) {
        return;
    }
    
    const overlay = document.createElement('div');
    overlay.className = 'img-lightbox-overlay';
    
    const content = document.createElement('div');
    content.className = 'img-lightbox-content';
    
    const img = document.createElement('img');
    content.appendChild(img);
    
    const caption = document.createElement('div');
    caption.className = 'img-lightbox-caption';
    content.appendChild(caption);
    
    const closeBtn = document.createElement('div');
    closeBtn.className = 'img-lightbox-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', closeLightbox);
    content.appendChild(closeBtn);
    
    // Kontrol butonları
    const controls = document.createElement('div');
    controls.className = 'img-lightbox-controls';
    
    // Yakınlaştırma butonu
    const zoomInBtn = document.createElement('button');
    zoomInBtn.className = 'img-lightbox-control-btn';
    zoomInBtn.innerHTML = '+';
    zoomInBtn.title = 'Yakınlaştır';
    zoomInBtn.addEventListener('click', function() { zoomImage(0.1); });
    controls.appendChild(zoomInBtn);
    
    // Zoom seviyesi göstergesi
    const zoomLevel = document.createElement('div');
    zoomLevel.className = 'img-lightbox-zoom-level';
    zoomLevel.textContent = '100%';
    controls.appendChild(zoomLevel);
    
    // Uzaklaştırma butonu
    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.className = 'img-lightbox-control-btn';
    zoomOutBtn.innerHTML = '-';
    zoomOutBtn.title = 'Uzaklaştır';
    zoomOutBtn.addEventListener('click', function() { zoomImage(-0.1); });
    controls.appendChild(zoomOutBtn);
    
    // Döndürme butonu
    const rotateBtn = document.createElement('button');
    rotateBtn.className = 'img-lightbox-control-btn';
    rotateBtn.innerHTML = '&#x21BB;'; // Döndürme simgesi
    rotateBtn.title = 'Döndür';
    rotateBtn.addEventListener('click', function() { rotateImage(90); });
    controls.appendChild(rotateBtn);
    
    // Sıfırlama butonu
    const resetBtn = document.createElement('button');
    resetBtn.className = 'img-lightbox-control-btn';
    resetBtn.innerHTML = '&#x21BA;'; // Sıfırlama simgesi
    resetBtn.title = 'Sıfırla';
    resetBtn.addEventListener('click', resetImage);
    controls.appendChild(resetBtn);
    
    // Navigasyon düğmeleri
    const prevBtn = document.createElement('div');
    prevBtn.className = 'img-lightbox-nav img-lightbox-prev';
    prevBtn.innerHTML = '&#10094;';
    prevBtn.addEventListener('click', function() {
        navigateLightbox('prev');
    });
    
    const nextBtn = document.createElement('div');
    nextBtn.className = 'img-lightbox-nav img-lightbox-next';
    nextBtn.innerHTML = '&#10095;';
    nextBtn.addEventListener('click', function() {
        navigateLightbox('next');
    });
    
    overlay.appendChild(content);
    overlay.appendChild(controls);
    overlay.appendChild(prevBtn);
    overlay.appendChild(nextBtn);
    
    // Overlay'e tıklama özelliği ekle (kapatmak için)
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeLightbox();
        }
    });
    
    // Resim sürükleme işlemleri
    img.addEventListener('mousedown', function(e) {
        if (currentZoom > 1) {
            isDragging = true;
            dragStartX = e.clientX - imagePositionX;
            dragStartY = e.clientY - imagePositionY;
            img.style.cursor = 'grabbing';
        }
    });
    
    document.addEventListener('mousemove', function(e) {
        if (isDragging) {
            imagePositionX = e.clientX - dragStartX;
            imagePositionY = e.clientY - dragStartY;
            img.style.transform = `translate(${imagePositionX}px, ${imagePositionY}px) scale(${currentZoom}) rotate(${currentRotation}deg)`;
        }
    });
    
    document.addEventListener('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            img.style.cursor = 'grab';
        }
    });
    
    // Fare tekerleği ile yakınlaştırma
    img.addEventListener('wheel', function(e) {
        e.preventDefault();
        const delta = Math.sign(e.deltaY) * -0.1;
        zoomImage(delta);
    });
    
    document.body.appendChild(overlay);
}

// Lightbox'ı aç
function openLightbox(imgElement, index, allImages) {
    const overlay = document.querySelector('.img-lightbox-overlay');
    const contentImg = overlay.querySelector('.img-lightbox-content img');
    const caption = overlay.querySelector('.img-lightbox-caption');
    const zoomLevel = overlay.querySelector('.img-lightbox-zoom-level');
    
    // Mevcut resim indeksini ve tüm resimleri saklayalım
    overlay.dataset.currentIndex = index;
    overlay.dataset.totalImages = allImages.length;
    
    // Resmi ve alt metnini ayarla
    contentImg.src = imgElement.src;
    caption.textContent = imgElement.alt || '';
    
    // Overlay'i göster
    overlay.classList.add('active');
    
    // Body scroll'u engelle
    document.body.style.overflow = 'hidden';
    
    // Değişkenleri sıfırla
    resetImage();
    
    // Navigasyon düğmelerini göster/gizle
    updateNavigationButtons();
}

// Lightbox'ı kapat
function closeLightbox() {
    const overlay = document.querySelector('.img-lightbox-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        // Body scroll'u geri aç
        document.body.style.overflow = '';
        // Değişkenleri sıfırla
        resetImage();
    }
}

// Lightbox içinde gezinme
function navigateLightbox(direction) {
    const overlay = document.querySelector('.img-lightbox-overlay');
    if (!overlay) return;
    
    const currentIndex = parseInt(overlay.dataset.currentIndex);
    const totalImages = parseInt(overlay.dataset.totalImages);
    
    let newIndex;
    if (direction === 'next') {
        newIndex = (currentIndex + 1) % totalImages;
    } else {
        newIndex = (currentIndex - 1 + totalImages) % totalImages;
    }
    
    // Tüm uygun resimleri seç
    const allImages = document.querySelectorAll('.documentation_body img, .shortcode_title img, .shortcode_info img');
    
    // Yeni resmi göster
    openLightbox(allImages[newIndex], newIndex, allImages);
}

// Navigasyon düğmelerini güncelle
function updateNavigationButtons() {
    const overlay = document.querySelector('.img-lightbox-overlay');
    if (!overlay) return;
    
    const currentIndex = parseInt(overlay.dataset.currentIndex);
    const totalImages = parseInt(overlay.dataset.totalImages);
    
    const prevBtn = overlay.querySelector('.img-lightbox-prev');
    const nextBtn = overlay.querySelector('.img-lightbox-next');
    
    // Tek resim varsa, navigasyon düğmelerini gizle
    if (totalImages <= 1) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        return;
    }
    
    // Navigasyon düğmelerini göster
    prevBtn.style.display = 'flex';
    nextBtn.style.display = 'flex';
}

// Resmi yakınlaştır/uzaklaştır
function zoomImage(delta) {
    const overlay = document.querySelector('.img-lightbox-overlay');
    if (!overlay || !overlay.classList.contains('active')) return;
    
    const contentImg = overlay.querySelector('.img-lightbox-content img');
    const zoomLevel = overlay.querySelector('.img-lightbox-zoom-level');
    
    // Zoom limitlerini belirle (min: 0.5, max: 3)
    const newZoom = Math.max(0.5, Math.min(3, currentZoom + delta));
    
    if (newZoom !== currentZoom) {
        currentZoom = newZoom;
        
        // Zoom seviyesi göstergesini güncelle
        zoomLevel.textContent = `${Math.round(currentZoom * 100)}%`;
        
        // Resmi güncelle
        contentImg.style.transform = `translate(${imagePositionX}px, ${imagePositionY}px) scale(${currentZoom}) rotate(${currentRotation}deg)`;
        
        // Zoom seviyesine göre cursor'ı ayarla
        if (currentZoom > 1) {
            contentImg.classList.add('zoomed');
        } else {
            contentImg.classList.remove('zoomed');
        }
    }
}

// Resmi döndür
function rotateImage(degrees) {
    const overlay = document.querySelector('.img-lightbox-overlay');
    if (!overlay || !overlay.classList.contains('active')) return;
    
    const contentImg = overlay.querySelector('.img-lightbox-content img');
    
    // Yeni rotasyon değerini hesapla
    currentRotation = (currentRotation + degrees) % 360;
    
    // Resmi güncelle
    contentImg.style.transform = `translate(${imagePositionX}px, ${imagePositionY}px) scale(${currentZoom}) rotate(${currentRotation}deg)`;
    contentImg.classList.add('rotated');
}

// Resmi sıfırla
function resetImage() {
    const overlay = document.querySelector('.img-lightbox-overlay');
    if (!overlay) return;
    
    const contentImg = overlay.querySelector('.img-lightbox-content img');
    const zoomLevel = overlay.querySelector('.img-lightbox-zoom-level');
    
    // Değişkenleri sıfırla
    currentZoom = 1;
    currentRotation = 0;
    imagePositionX = 0;
    imagePositionY = 0;
    isDragging = false;
    
    // Göstergeleri güncelle
    zoomLevel.textContent = '100%';
    
    // Resmi sıfırla
    contentImg.style.transform = '';
    contentImg.classList.remove('zoomed', 'rotated');
} 