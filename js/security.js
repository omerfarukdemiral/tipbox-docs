// Geliştirme modunu ve güvenlik ayarlarını merkezi yapılandırmadan al
const isDevelopment = true;
const securityConfig = window.AppConfig ? window.AppConfig.security : {
    enableContextMenuProtection: true
};

// securityConfig'i global olarak erişilebilir yap
window.securityConfig = securityConfig;

// Güvenlik olaylarını başlat
function initSecurity() {
    if (!isDevelopment) {
        // Tüm sayfa için sağ tık engelleme
        if (securityConfig.enableContextMenuProtection) {
            document.addEventListener('contextmenu', e => {
                e.preventDefault();
                return false;
            });
        }
    }
}

// Sayfa yüklendiğinde güvenlik sistemini başlat
document.addEventListener('DOMContentLoaded', () => {
    initSecurity();
}); 