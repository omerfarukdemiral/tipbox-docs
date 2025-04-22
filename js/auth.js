// Firebase Authentication Functions

// Firebase yapılandırma bilgisi - index.html'den taşındı
const firebaseConfig = {
    apiKey: "AIzaSyBX9y2CJMG4X5Qos3pLl6YPtUE4LYx-3DU",
    authDomain: "tipbox-docs-317bc.firebaseapp.com",
    projectId: "tipbox-docs-317bc",
    storageBucket: "tipbox-docs-317bc.firebasestorage.app",
    messagingSenderId: "967102234588",
    appId: "1:967102234588:web:158ec4b46adc6e784ed919",
    measurementId: "G-SEMNFLSB42"
};

// Firebase'i başlat (eğer daha önce başlatılmamışsa)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Firebase hizmet referansları
const auth = firebase.auth();
let firestore = null;

// Firestore modülünü yükle (eğer mevcut değilse)
async function loadFirestoreIfNeeded() {
    if (!firebase.firestore) {
        try {
            console.log('Firestore modülü yükleniyor...');
            await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js');
            console.log('Firestore modülü başarıyla yüklendi');
            firestore = firebase.firestore();
            return true;
        } catch (error) {
            console.error('Firestore modülü yüklenirken hata:', error);
            return false;
        }
    } else if (!firestore) {
        firestore = firebase.firestore();
    }
    return true;
}

// Firestore FieldValue yardımcı fonksiyonları
function getServerTimestamp() {
    return firebase.firestore?.FieldValue?.serverTimestamp() || new Date();
}

function getFieldIncrement(value = 1) {
    return firebase.firestore?.FieldValue?.increment(value) || value;
}

// Firestore'dan kullanıcı bilgilerini getir
// Global olarak tanımlanmış versiyonu
window.enhanceUserWithFirestoreData = async function (authUser) {
    // Firestore modülünü kontrol et ve gerekirse yükle
    const firestoreLoaded = await loadFirestoreIfNeeded();
    if (!firestoreLoaded) {
        // Auth verilerini window'a kaydet (yine de erişim sağlamak için)
        storeUserInWindow(authUser);
        return authUser;
    }

    try {
        // Firestore referansını al
        const userRef = firestore.collection('users').doc(authUser.uid);

        // Firestore'dan kullanıcı dokümanını çek
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            // Firestore'dan gelen verileri al
            const firestoreUserData = userDoc.data();

            // Tarih alanlarını Date nesnesine dönüştür
            const parsedData = {
                ...firestoreUserData,
                createdAt: firestoreUserData.createdAt?.toDate?.() || null,
                lastLoginAt: firestoreUserData.lastLoginAt?.toDate?.() || null
            };

            // Auth ve Firestore verilerini birleştir (Firestore öncelikli)
            const enhancedUser = {
                ...authUser,                      // Temel auth özellikleri
                // Firestore verilerini ekle (öncelikli)
                ...parsedData,
                // Temel alanlar için Firestore yoksa auth'tan al
                displayName: parsedData.displayName || authUser.displayName,
                email: parsedData.email || authUser.email,
                photoURL: parsedData.photoURL || authUser.photoURL,
                // Rol bilgisi (varsayılan olarak 'user')
                role: parsedData.role || 'user'
            };

            // Kullanıcı bilgilerini window nesnesinde kaydet
            storeUserInWindow(enhancedUser);

            // Son giriş tarihini güncelle (background işlem)
            updateLastLogin(enhancedUser.uid).catch(err => console.error('Son giriş tarihi güncellenirken hata:', err));

            return enhancedUser;
        } else {

            // Yeni kullanıcı profili oluştur
            const newUserData = {
                uid: authUser.uid,
                email: authUser.email,
                displayName: authUser.displayName || '',
                photoURL: authUser.photoURL || '',
                role: 'user', // Varsayılan rol
                createdAt: getServerTimestamp(),
                lastLoginAt: getServerTimestamp()
            };

            // Kullanıcıyı Firestore'a kaydet
            await userRef.set(newUserData);

            // Auth ve yeni Firestore verilerini birleştir
            const enhancedUser = {
                ...authUser,
                ...newUserData
            };

            // Kullanıcı bilgilerini window nesnesinde kaydet
            storeUserInWindow(enhancedUser);

            return enhancedUser;
        }
    } catch (error) {
        // Hata durumunda orijinal auth bilgileri ile devam et
        storeUserInWindow(authUser);
        return authUser;
    }
};

// Kullanıcının son giriş tarihini güncelle
async function updateLastLogin(uid) {
    if (!uid) return Promise.reject('Kullanıcı ID\'si gerekli');

    try {
        await loadFirestoreIfNeeded();
        await firestore.collection('users').doc(uid).update({
            lastLoginAt: getServerTimestamp()
        });
        return true;
    } catch (error) {
        return false;
    }
}

// Kullanıcı bilgilerini window nesnesi üzerinde sakla (global erişim için)
function storeUserInWindow(user) {
    if (!user) return;

    // window.currentUser objesi yoksa oluştur
    if (!window.currentUser) {
        window.currentUser = {};
    }

    // Kullanıcı bilgilerini window.currentUser'a kopyala
    Object.assign(window.currentUser, user);

    // Özellikle rol bilgisini kolay erişim için ayrıca sakla
    window.userRole = user.role || 'user';
}

// Kullanıcı oturum durumu değişikliklerini dinle
auth.onAuthStateChanged(function (user) {
    if (user) {
        // Kullanıcı oturum açmışsa
        enhanceUserWithFirestoreData(user).then(enhancedUser => {
            // Kullanıcı arayüzünü güncelle
            updateUserInterface(enhancedUser);

            // Kullanıcı giriş olayını tetikle
            document.dispatchEvent(new CustomEvent('user-login', {
                detail: { user: enhancedUser }
            }));
            
            // Yasal uyarı popup'ını kontrol et (eğer loaded ise)
            if (window.initLegalNotice) {
                window.initLegalNotice();
            }
        }).catch(error => {
            console.error('Kullanıcı bilgileri getirilirken hata:', error);
            storeUserInWindow(user); // Hata durumunda basit veriyi window'a kaydet
            updateUserInterface(user); // Hata durumunda orijinal kullanıcı bilgilerini kullan
            
            // Yasal uyarı popup'ını kontrol et (eğer loaded ise)
            if (window.initLegalNotice) {
                window.initLegalNotice();
            }
        });
    } else {
        // Kullanıcı oturum açmamışsa
        // Window'daki kullanıcı bilgilerini temizle
        window.currentUser = null;
        window.userRole = null;

        // Kullanıcı çıkış olayını tetikle
        document.dispatchEvent(new CustomEvent('user-logout'));
        redirectToSignIn();
    }
});

// Kullanıcı arayüzünü güncelle
function updateUserInterface(user) {
    if (window.updateUserProfile) {
        window.updateUserProfile(user);
    }
}

// Giriş sayfasına yönlendir
function redirectToSignIn() {
    if (!window.location.pathname.includes('signin.html')) {
        window.location.href = 'signin.html';
    }
}

// Çıkış yap
function signOut() {
    auth.signOut()
        .then(() => {
            window.location.href = 'signin.html';
        })
        .catch((error) => {
            console.error('Çıkış yapılırken hata oluştu:', error);
        });
}

// Google ile giriş yap
function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            // Başarılı giriş

            // Kullanıcı profil bilgilerini kaydet/güncelle
            updateUserProfile(result.user);
        })
        .catch((error) => {
            console.error('Google ile giriş hatası:', error);
        });
}

// Email/Şifre ile giriş yap
function signInWithEmail(email, password) {
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
        })
        .catch((error) => {
            console.error('Email ile giriş hatası:', error);
        });
}

// Token ile giriş yap
function signInWithToken(token) {
    // Token geçerliliğini kontrol et
    return verifyToken(token)
        .then(tokenData => {
            if (tokenData && tokenData.valid) {
                // Token geçerli ise oturum aç
                return auth.signInWithCustomToken(tokenData.customToken)
                    .then(userCredential => {
                        // Token kullanım sayısını artır
                        updateTokenUsage(tokenData.id);
                        return userCredential.user;
                    });
            } else {
                throw new Error('Geçersiz veya kullanılmış token');
            }
        });
}

// Token geçerliliğini kontrol et
async function verifyToken(token) {
    await loadFirestoreIfNeeded();

    try {
        // Token koleksiyonunda ara
        const tokenQuery = await firestore.collection('tokens')
            .where('token', '==', token)
            .where('valid', '==', true)
            .limit(1)
            .get();

        if (tokenQuery.empty) {
            return { valid: false };
        }

        // Token belgesini al
        const tokenDoc = tokenQuery.docs[0];
        const tokenData = tokenDoc.data();

        // Kullanım limitini kontrol et
        if (tokenData.usageLimit && tokenData.usageCount >= tokenData.usageLimit) {
            return { valid: false, reason: 'Kullanım limiti aşıldı' };
        }

        // Son kullanma tarihini kontrol et
        if (tokenData.expiresAt && tokenData.expiresAt.toDate() < new Date()) {
            return { valid: false, reason: 'Süresi dolmuş' };
        }

        return {
            valid: true,
            id: tokenDoc.id,
            ...tokenData
        };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

// Token kullanımını güncelle
async function updateTokenUsage(tokenId) {
    await loadFirestoreIfNeeded();

    try {
        const tokenRef = firestore.collection('tokens').doc(tokenId);

        await tokenRef.update({
            usageCount: getFieldIncrement(1),
            lastUsedAt: getServerTimestamp()
        });

        return true;
    } catch (error) {
        console.error('Token kullanım bilgisi güncellenirken hata:', error);
        return false;
    }
}

// Yeni kullanıcı kaydı
function signUp(email, password, additionalData = {}) {
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Kullanıcı profilini oluştur/güncelle
            updateUserProfile(userCredential.user, {
                ...additionalData,
                createdAt: getServerTimestamp(),
                role: additionalData.role || 'user'
            });
        })
        .catch((error) => {
            console.error('Kullanıcı kaydı hatası:', error);
        });
}

// Şifre sıfırlama
function resetPassword(email) {
    auth.sendPasswordResetEmail(email)
        .then(() => {
            console.log('Şifre sıfırlama emaili gönderildi');
        })
        .catch((error) => {
            console.error('Şifre sıfırlama hatası:', error);
        });
}

// Kullanıcı profilini oluşturur veya günceller
async function updateUserProfile(user, additionalData = {}) {
    if (!user) return Promise.reject(new Error('Kullanıcı bilgisi eksik'));

    await loadFirestoreIfNeeded();

    try {
        const userRef = firestore.collection('users').doc(user.uid);

        const userData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || additionalData.displayName,
            photoURL: user.photoURL || additionalData.photoURL,
            lastLoginAt: getServerTimestamp(),
            ...additionalData
        };

        await userRef.set(userData, { merge: true });

        // Kullanıcı window nesnesinde varsa, onu da güncelle
        if (window.currentUser && window.currentUser.uid === user.uid) {
            Object.assign(window.currentUser, userData);
            // Eğer rol değiştiyse, window.userRole'ü de güncelle
            if (userData.role) {
                window.userRole = userData.role;
            }
        }

        return userData;
    } catch (error) {
        console.error('Kullanıcı profili güncellenirken hata:', error);
        throw error;
    }
}

// Mevcut oturum açmış kullanıcıyı döndürür (önce window'dan, yoksa auth'dan)
function getCurrentUser() {
    // Önce window.currentUser'ı kontrol et
    if (window.currentUser) {
        return window.currentUser;
    }
    // Yoksa auth.currentUser'ı döndür
    return auth.currentUser;
}

// Kullanıcı rolünü kontrol et (önce window'dan, yoksa Firestore'dan)
async function checkUserRole(uid, requiredRole = 'admin') {
    // Önce window.currentUser ve window.userRole'ü kontrol et
    if (window.currentUser && window.currentUser.uid === uid && window.userRole) {
        return window.userRole === requiredRole;
    }

    // Firestore'dan kontrol et
    await loadFirestoreIfNeeded();

    try {
        const userDoc = await firestore.collection('users').doc(uid).get();

        if (userDoc.exists) {
            const userData = userDoc.data();

            // Rol bilgisini window'a kaydet
            if (window.currentUser && window.currentUser.uid === uid) {
                window.userRole = userData.role || 'user';
            }

            return userData.role === requiredRole;
        }

        return false;
    } catch (error) {
        console.error('Kullanıcı rolü kontrol edilirken hata:', error);
        return false;
    }
}

// Global fonksiyonlar
window.getCurrentUser = getCurrentUser;
window.signInWithGoogle = signInWithGoogle;
window.signInWithEmail = signInWithEmail;
window.signInWithToken = signInWithToken;
window.signUp = signUp;
window.signOut = signOut;
window.resetPassword = resetPassword;
window.updateUserProfile = updateUserProfile;
window.checkUserRole = checkUserRole;

// Firebase Auth modülünün hazır olduğunu bildiren olay
document.dispatchEvent(new CustomEvent('auth-module-ready'));