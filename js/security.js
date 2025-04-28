// Geliştirme modunu ve güvenlik ayarlarını merkezi yapılandırmadan al
const isDevelopment = false;
const securityConfig = window.AppConfig ? window.AppConfig.security : {
    enableWatermark: true,
    enableCopyProtection: true,
    enableDevToolsDetection: true,
    enableExtensionDetection: true,
    enablePrintProtection: true,
    enableContextMenuProtection: true,
    enableDragProtection: true,
    enableSelectionProtection: true,
    enableKeyboardShortcuts: true,
    disableImageInteraction: false // Resim etkileşimini engellemek için (false: etkileşim açık, true: etkileşim kapalı)
};

// securityConfig'i global olarak erişilebilir yap
window.securityConfig = securityConfig;

// Güvenlik durumunu kontrol et
let isSecurityCompromised = false;
let extensionDetected = false;
let devToolsOpened = false;

// Tehlikeli eklentilerin listesi
const dangerousExtensions = [
    'screen-recorder',
    'screenshot',
    'capture',
    'downloader',
    'save',
    'download',
    'scraper',
    'grabber',
    'copier',
    'picker'
];

// Güvenlik uyarı popup'ı
function showSecurityAlert(action, isWarning = true) {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: ${isWarning ? 'rgba(255, 59, 48, 0.95)' : 'rgba(255, 193, 7, 0.95)'};
        color: white;
        padding: 20px 30px;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 100000;
        text-align: center;
        font-family: Arial, sans-serif;
        backdrop-filter: blur(5px);
        animation: fadeIn 0.3s ease;
        filter: none !important;
    `;
    
}

// Güvenlik durumunu güncelle
function updateSecurityState() {
    if (!isDevelopment && (extensionDetected || devToolsOpened)) {
        isSecurityCompromised = true;
        document.body.classList.add('security-compromised');
        showSecurityAlert('Security breach detected. Please disable extensions or close developer tools.', true);
    } else {
        isSecurityCompromised = false;
        document.body.classList.remove('security-compromised');
    }
}

// Gelişmiş eklenti kontrolü
function detectExtensions() {
    if (!isDevelopment && securityConfig.enableExtensionDetection) {
        // Chrome eklenti API kontrolü
        if (window.chrome && window.chrome.runtime) {
            const extensionElements = document.querySelectorAll('div[id*="ext-"], div[class*="ext-"], div[class*="extension"], div[id*="extension"]');
            
            extensionElements.forEach(element => {
                const elementText = (element.id + ' ' + element.className).toLowerCase();
                const isDangerous = dangerousExtensions.some(keyword => elementText.includes(keyword));
                
                if (isDangerous) {
                    extensionDetected = true;
                }
            });
        }

        // Tehlikeli eklenti fonksiyonları kontrolü
        const dangerousAPIs = [
            'chrome.downloads',
            'chrome.desktopCapture',
            'chrome.tabs.captureVisibleTab'
        ];

        for (const api of dangerousAPIs) {
            try {
                if (eval(`typeof ${api} !== 'undefined'`)) {
                    extensionDetected = true;
                    break;
                }
            } catch (e) {}
        }

        if (extensionDetected) {
            showSecurityAlert('Content protection extension detected. Please disable the extension.');
            updateSecurityState();
        }
    }
}

// DevTools kontrolü
function detectDevTools() {
    if (!isDevelopment && securityConfig.enableDevToolsDetection) {
        const widthThreshold = window.outerWidth - window.innerWidth > 160;
        const heightThreshold = window.outerHeight - window.innerHeight > 160;
        
        if (widthThreshold || heightThreshold) {
            if (!devToolsOpened) {
                devToolsOpened = true;
                showSecurityAlert('Developer tools detected. Content is hidden for security reasons.', true);
                updateSecurityState();
            }
        } else {
            if (devToolsOpened) {
                devToolsOpened = false;
                updateSecurityState();
            }
        }
    }
}

// Watermark oluşturma
function createWatermark() {
    if (securityConfig.enableWatermark) {
        const watermarks = document.querySelectorAll('.watermark');
        watermarks.forEach(watermark => {
            const text = isDevelopment ? 'Tipbox Blueprints - CONFIDENTIAL' : 'Tipbox Blueprints - CONFIDENTIAL';
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.style.position = 'absolute';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.pointerEvents = 'none';
            
            function updateCanvas() {
                canvas.width = watermark.offsetWidth;
                canvas.height = watermark.offsetHeight;
                
                ctx.font = '16px Arial';
                ctx.fillStyle = isDevelopment ? 'rgba(255, 255, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)';
                ctx.textAlign = 'center';
                
                // Diagonal watermarks
                for(let i = -canvas.height; i < canvas.width; i += 150) {
                    ctx.save();
                    ctx.translate(i, 0);
                    ctx.rotate(-45 * Math.PI / 180);
                    ctx.fillText(text, 0, canvas.height);
                    ctx.restore();
                }
            }
            
            updateCanvas();
            window.addEventListener('resize', updateCanvas);
            watermark.appendChild(canvas);
        });
    }
}

// Development mode göstergesini ekle/kaldır
function toggleDevelopmentMode() {
    if (isDevelopment) {
        document.body.classList.add('development-mode');
    } else {
        document.body.classList.remove('development-mode');
    }
}

// Bir elementin görsel olup olmadığını kontrol et
function isImageElement(element) {
    // Eğer resim etkileşimi devre dışı bırakıldıysa, hiçbir şekilde resim etkileşimine izin verme
    if (securityConfig.disableImageInteraction) {
        return false;
    }
    
    // Element bir IMG mi kontrol et
    const isImg = element.tagName === 'IMG';
    
    // Element bir resim container'ı içinde mi kontrol et
    const isInImgContainer = element.closest('.documentation_body img, .shortcode_title img, .shortcode_info img, .img-lightbox-overlay, .img-lightbox-content') !== null;
    
    // Eğer event.target doğrudan bir img değilse, parent'larını kontrol et
    if (!isImg && element.querySelector('img')) {
        return true;
    }
    
    const result = isImg || isInImgContainer;
    return result;
}

// Güvenlik olaylarını başlat
function initSecurity() {
    // Development mode göstergesini ayarla
    toggleDevelopmentMode();

    if (!isDevelopment) {
        // Tüm sayfa için sağ tık engelleme (görsel harici)
        if (securityConfig.enableContextMenuProtection) {
            document.addEventListener('contextmenu', e => {
                // Görsel tıklama ve lightbox için istisna tanımla
                if (isImageElement(e.target)) {
                    return true;
                }
                
                e.preventDefault();
                showSecurityAlert('Right-click menu is disabled for security reasons.');
                return false;
            });
        }

        // Klavye kısayollarını engelle
        if (securityConfig.enableKeyboardShortcuts) {
            document.addEventListener('keydown', e => {
                // Lightbox açıkken ESC tuşu için istisna tanımla
                const lightboxOpen = document.querySelector('.img-lightbox-overlay.active');
                if (lightboxOpen && e.keyCode === 27) { // ESC tuşu
                    return true;
                }
                
                if (
                    (e.ctrlKey && e.keyCode == 83) || // Ctrl+S
                    (e.ctrlKey && e.keyCode == 85) || // Ctrl+U
                    (e.ctrlKey && e.shiftKey && e.keyCode == 73) || // Ctrl+Shift+I
                    e.keyCode == 123 || // F12
                    (e.ctrlKey && e.keyCode == 80) || // Ctrl+P
                    (e.ctrlKey && e.keyCode == 73) || // Ctrl+I
                    (e.ctrlKey && e.keyCode == 74) || // Ctrl+J
                    (e.ctrlKey && e.keyCode == 67) || // Ctrl+C
                    (e.ctrlKey && e.keyCode == 86) || // Ctrl+V
                    e.keyCode == 44 // Print Screen
                ) {
                    e.preventDefault();
                    e.stopPropagation();
                    showSecurityAlert('This shortcut is disabled for security reasons.');
                    return false;
                }
            });
        }

        // Kopyalamayı engelle
        if (securityConfig.enableCopyProtection) {
            document.addEventListener('copy', e => {
                // Resim kopyalama için istisna tanımla
                if (isImageElement(e.target)) {
                    return true;
                }
                
                e.preventDefault();
                showSecurityAlert('Copying content is disabled.');
            });

            document.addEventListener('cut', e => {
                e.preventDefault();
                showSecurityAlert('Cutting content is disabled.');
            });

            document.addEventListener('paste', e => {
                e.preventDefault();
                showSecurityAlert('Pasting content is disabled.');
            });
        }

        // Sürükle-bırak engelleme (görsel harici)
        if (securityConfig.enableDragProtection) {
            document.addEventListener('dragstart', e => {
                // Görseller için istisna tanımla
                if (isImageElement(e.target)) {
                    return true;
                }
                
                e.preventDefault();
                showSecurityAlert('Drag and drop is disabled.');
            });
        }

        // Metin seçimini engelle (görsel harici)
        if (securityConfig.enableSelectionProtection) {
            document.addEventListener('selectstart', e => {
                // Görseller için istisna tanımla
                if (isImageElement(e.target) || e.target.closest('.img-lightbox-overlay')) {
                    return true;
                }
                
                e.preventDefault();
                showSecurityAlert('Selecting text is disabled.');
            });
        }
        
        // Tıklama olayları için görsel istisna ekle
        document.addEventListener('click', e => {
            // Görsel veya lightbox üzerinde tıklama varsa, olayı devam ettir
            if (isImageElement(e.target) || e.target.closest('.img-lightbox-overlay')) {
                return true;
            }
        }, true); // true parametresi capture phase'de çalışmasını sağlar

        // Periyodik kontroller
        setInterval(() => {
            if (securityConfig.enableDevToolsDetection) detectDevTools();
            if (securityConfig.enableExtensionDetection) detectExtensions();
        }, 1000);
    }
}

// Sayfa yüklendiğinde güvenlik sistemini başlat
document.addEventListener('DOMContentLoaded', () => {
    initSecurity();
    createWatermark();
}); 