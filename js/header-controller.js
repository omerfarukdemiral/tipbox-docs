// Header Controller - Kullanıcı profilini ve admin panel erişimini yönetir
console.log("Header Controller yükleniyor...");

// Header yüklendiğinde çalışacak fonksiyon
function initializeHeader() {
    console.log("Header Controller başlatılıyor...");
    
    // Önce Firebase'in yüklendiğinden emin olalım
    if (typeof firebase !== 'undefined') {
        console.log("Firebase tanımlanmış!");
        
        // Kullanıcı bilgilerini güncelleme fonksiyonu
        function updateUserProfile(user) {
            console.log("updateUserProfile çağrıldı:", user);
            
            if (user) {
                // Avatar güncelleme
                const avatarImages = document.querySelectorAll('.user-img, .user-img-sm');
                const avatarUrl = user.photoURL || 'img/default-avatar.png';
                avatarImages.forEach(img => {
                    img.src = avatarUrl;
                    // Resim yüklenemezse varsayılan avatar'a dön
                    img.onerror = function() {
                        this.src = 'img/default-avatar.png';
                    };
                });

                // İsim güncelleme
                const nameElements = document.querySelectorAll('.user-name, .user-name-sm');
                const displayName = user.displayName || 'Misafir Kullanıcı';
                nameElements.forEach(el => {
                    el.textContent = displayName;
                });

                // Email güncelleme
                const emailElements = document.querySelectorAll('.user-email, .user-email-sm');
                const email = user.email || '';
                emailElements.forEach(el => {
                    el.textContent = email;
                });
                
                // Admin paneli bağlantısı kontrolü
                const adminPanelLink = document.querySelector('.admin-panel-link');
                if (adminPanelLink) {
                    console.log("Admin Panel Link kontrolü - Kullanıcı rolü:", user.role);
                    // Kullanıcının rolü "admin" ise admin paneli bağlantısını göster
                    if (user.role === 'admin') {
                        adminPanelLink.style.display = 'block';
                        console.log("Admin Paneli gösteriliyor");
                    } else {
                        adminPanelLink.style.display = 'none';
                        console.log("Admin Paneli gizleniyor - kullanıcı rolü:", user.role);
                    }
                } else {
                    console.warn("Admin paneli bağlantısı bulunamadı!");
                }

                console.log('Kullanıcı profili başarıyla güncellendi');
            } else {
                console.log('Kullanıcı oturumu bulunamadı');
            }
        }

        // Firebase auth state değişikliğini dinle
        firebase.auth().onAuthStateChanged(async function(user) {
            console.log('Auth durumu değişti:', user ? 'Kullanıcı giriş yapmış' : 'Kullanıcı giriş yapmamış');
            
            if (user) {
                try {
                    // Global olarak tanımlanan enhanceUserWithFirestoreData fonksiyonunu kullan
                    if (window.enhanceUserWithFirestoreData) {
                        console.log("enhanceUserWithFirestoreData fonksiyonu bulundu, kullanıcı bilgileri çekiliyor...");
                        const enhancedUser = await window.enhanceUserWithFirestoreData(user);
                        console.log("Firestore'dan genişletilmiş kullanıcı bilgileri:", enhancedUser);
                        updateUserProfile(enhancedUser);
                    } else {
                        console.warn("enhanceUserWithFirestoreData fonksiyonu bulunamadı!");
                        // Fonksiyon bulunamadı, doğrudan gelen kullanıcı bilgilerini kullan
                        updateUserProfile(user);
                    }
                } catch (error) {
                    console.error("Kullanıcı bilgileri alınırken hata:", error);
                    // Hata durumunda orijinal kullanıcı bilgilerini kullan
                    updateUserProfile(user);
                }
            } else {
                // Kullanıcı giriş yapmamış
                console.log("Kullanıcı oturumu yok");
            }
        });
    } else {
        console.error('Firebase tanımlanmamış! Firebase yükleme sırası kontrol edilmeli.');
    }
    
    // Debug amaçlı konsol log
    setTimeout(() => {
        console.log("Gecikmiş kontrol:");
        console.log("Firebase tanımlı mı:", typeof firebase !== 'undefined');
        console.log("Firestore tanımlı mı:", typeof firebase?.firestore === 'function');
        console.log("enhanceUserWithFirestoreData tanımlı mı:", typeof window.enhanceUserWithFirestoreData === 'function');
    }, 2000);
}

// DOM yüklendiğinde ve component'lar dahil edildikten sonra header'ı başlat
document.addEventListener('DOMContentLoaded', function() {
    console.log("Header Controller - DOM yüklendi");
    
    // Component'lar yüklendikten sonra (includeHTML tamamlandıktan sonra) header'ı başlat
    // includeHTML zaten index.html'de çağrılıyor, burada sadece dinleyici ekle
    // HTML component'leri yüklendikten sonra çalışacak fonksiyon
    const checkComponentsLoaded = setInterval(() => {
        const headerComponent = document.querySelector('.navbar');
        if (headerComponent) {
            console.log("Header component bulundu, başlatılıyor...");
            clearInterval(checkComponentsLoaded);
            initializeHeader();
        }
    }, 100); // 100ms'de bir kontrol et
    
    // 10 saniye sonra timeout
    setTimeout(() => {
        clearInterval(checkComponentsLoaded);
        console.warn("Header component 10 saniye içinde bulunamadı!");
    }, 10000);
}); 