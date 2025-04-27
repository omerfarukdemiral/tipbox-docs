function initializeHeader() {    
    // Önce Firebase'in yüklendiğinden emin olalım
    if (typeof firebase !== 'undefined') {
        
        // Kullanıcı bilgilerini güncelleme fonksiyonu
        function updateUserProfile(user) {            
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
                const displayName = user.displayName || 'Guest User';
                nameElements.forEach(el => {
                    el.textContent = displayName;
                });

                // Email güncelleme
                const emailElements = document.querySelectorAll('.user-email, .user-email-sm');
                const email = user.email || '';
                emailElements.forEach(el => {
                    el.textContent = email;
                });
                
                // Privacy Policy durumunu güncelleme
                const policyStatusElements = document.querySelectorAll('.privacy-policy-status');
                let privacyPolicyAccepted = false;
                
                // Farklı privacy_policy değer formatlarını kontrol et
                if (user.privacy_policy === true || user.privacy_policy === "true" || user.privacy_policy === 1) {
                    privacyPolicyAccepted = true;
                }
                
                policyStatusElements.forEach(el => {
                    el.textContent = privacyPolicyAccepted ? 'Kabul Edildi' : 'Kabul Edilmedi';
                    el.className = 'privacy-policy-status ' + (privacyPolicyAccepted ? 'text-success' : 'text-danger');
                });
                
                // Admin paneli bağlantısı kontrolü
                updateAdminPanelVisibility();
            } else {
            }
        }
        
        // Admin paneli bağlantısının görünürlüğünü güncelle
        function updateAdminPanelVisibility() {
            const adminPanelLink = document.querySelector('.admin-panel-link');
            if (!adminPanelLink) {
                console.warn("Admin paneli bağlantısı bulunamadı!");
                return;
            }
            
            // ÖNCE window.userRole'ü kontrol et (global erişim)
            if (window.userRole === 'admin') {
                adminPanelLink.style.display = 'block';
                return;
            }
            
            // SONRA window.currentUser.role'ü kontrol et
            if (window.currentUser && window.currentUser.role === 'admin') {
                adminPanelLink.style.display = 'block';
                return;
            }
            
            // EN SON firebase.auth().currentUser.role'ü kontrol et
            const currentUser = firebase.auth().currentUser;
            if (currentUser && currentUser.role === 'admin') {
                adminPanelLink.style.display = 'block';
                return;
            }
            
            // Hiçbir koşul sağlanmadıysa, admin paneli bağlantısını gizle
            adminPanelLink.style.display = 'none';
        }

        // Sayfa yüklendiğinde ilk kontrolü yap
        checkForExistingUser();
        
        // Firebase auth state değişikliğini dinle
        firebase.auth().onAuthStateChanged(async function(user) {            
            if (user) {
                try {
                    // Önce window.currentUser'ı kontrol et (zaten window nesnesi kurulmuş olabilir)
                    if (window.currentUser && window.currentUser.uid === user.uid) {
                        updateUserProfile(window.currentUser);
                        updateAdminPanelVisibility();
                        return;
                    }
                    
                    // Global olarak tanımlanan enhanceUserWithFirestoreData fonksiyonunu kullan
                    if (window.enhanceUserWithFirestoreData) {
                        const enhancedUser = await window.enhanceUserWithFirestoreData(user);
                        updateUserProfile(enhancedUser);
                    } else {
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
            }
        });
    } else {
        console.error('Firebase tanımlanmamış! Firebase yükleme sırası kontrol edilmeli.');
    }
}

// DOM yüklenmeden önce mevcut kullanıcı varsa kontrol et
function checkForExistingUser() {    
    // window.currentUser kontrol et
    if (window.currentUser && window.currentUser.uid) {        
        // Firestore'dan kullanıcı verilerini kontrol et ve doğrula
        verifyUserFromFirestore(window.currentUser.uid)
            .then(firestoreUser => {
                if (firestoreUser) {
                    // Firestore'dan gelen verilerle window.currentUser güncelleyelim
                    window.currentUser = { ...window.currentUser, ...firestoreUser };
                    window.userRole = firestoreUser.role || 'user';
                    
                    // Header controller updateUserProfile fonksiyonuna güncellenmiş window.currentUser'ı gönder
                    setTimeout(() => {
                        if (typeof updateUserProfile === 'function') {
                            updateUserProfile(window.currentUser);
                        }
                    }, 500); // Header DOM elementlerinin yüklenmesine zaman ver
                } else {
                    // window.currentUser'ı yine de kullan
                    setTimeout(() => {
                        if (typeof updateUserProfile === 'function') {
                            updateUserProfile(window.currentUser);
                        }
                    }, 500);
                }
            })
            .catch(error => {
                // Hata durumunda yine de window.currentUser'ı kullan
                setTimeout(() => {
                    if (typeof updateUserProfile === 'function') {
                        updateUserProfile(window.currentUser);
                    }
                }, 500);
            });
        
        return;
    }
    
    // window.currentUser yoksa firebase.auth().currentUser'ı kontrol et
    if (firebase?.auth) {
        const currentUser = firebase.auth().currentUser;
        if (currentUser) {
            // window.enhanceUserWithFirestoreData varsa kullan
            if (window.enhanceUserWithFirestoreData) {
                window.enhanceUserWithFirestoreData(currentUser)
                    .then(enhancedUser => {
                        // updateUserProfile varsa güncellenmiş kullanıcı bilgilerini gönder
                        if (typeof updateUserProfile === 'function') {
                            updateUserProfile(enhancedUser);
                        }
                    })
                    .catch(error => {
                        // Hata durumunda orijinal auth kullanıcısını kullan
                        if (typeof updateUserProfile === 'function') {
                            updateUserProfile(currentUser);
                        }
                    });
            } else {
                // enhanceUserWithFirestoreData yoksa, direkt Firestore'dan kontrol et
                verifyUserFromFirestore(currentUser.uid)
                    .then(firestoreUser => {
                        if (firestoreUser) {
                            const enhancedUser = { ...currentUser, ...firestoreUser };
                            
                            // window.currentUser ve window.userRole'ü güncelle
                            window.currentUser = enhancedUser;
                            window.userRole = firestoreUser.role || 'user';
                            
                            if (typeof updateUserProfile === 'function') {
                                updateUserProfile(enhancedUser);
                            }
                        } else {
                            if (typeof updateUserProfile === 'function') {
                                updateUserProfile(currentUser);
                            }
                        }
                    })
                    .catch(error => {
                        if (typeof updateUserProfile === 'function') {
                            updateUserProfile(currentUser);
                        }
                    });
            }
        }
    }
}

// Firestore'dan kullanıcıyı doğrulama fonksiyonu
async function verifyUserFromFirestore(uid) {
    if (!uid) {
        return null;
    }
    
    try {
        // Firebase ve Firestore'un yüklü olduğundan emin ol
        if (!firebase || !firebase.firestore) {
            return null;
        }
        
        // Kullanıcı dokümanını çek
        const userDoc = await firebase.firestore().collection('users').doc(uid).get();
        
        if (!userDoc.exists) {
            return null;
        }
        
        // Kullanıcı verilerini al
        const userData = userDoc.data();
        
        // Mail ve rol bilgisini kontrol et
        if (!userData.email) {
            console.warn("Firestore'daki kullanıcının email bilgisi yok!");
        }
        
        if (!userData.role) {
            userData.role = 'user';
        }
    
        return userData;
    } catch (error) {
        console.error("Firestore'dan kullanıcı doğrulama hatası:", error);
        return null;
    }
}

// DOM yüklendiğinde ve component'lar dahil edildikten sonra header'ı başlat
document.addEventListener('DOMContentLoaded', function() {    
    // Component'lar yüklendikten sonra (includeHTML tamamlandıktan sonra) header'ı başlat
    // includeHTML zaten index.html'de çağrılıyor, burada sadece dinleyici ekle
    // HTML component'leri yüklendikten sonra çalışacak fonksiyon
    const checkComponentsLoaded = setInterval(() => {
        const headerComponent = document.querySelector('.navbar');
        if (headerComponent) {
            clearInterval(checkComponentsLoaded);
            initializeHeader();
        }
    }, 100); // 100ms'de bir kontrol et
    
    // 10 saniye sonra timeout
    setTimeout(() => {
        clearInterval(checkComponentsLoaded);
    }, 10000);
}); 