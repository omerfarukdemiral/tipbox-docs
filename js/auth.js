// Firebase Authentication Functions

// Firebase yapılandırma bilgisi - index.html'den taşındı
const firebaseConfig = {
    apiKey: "AIzaSyAKgkPi3-ll2wIvaBxBo4tLKad2ssipPR0",
    authDomain: "tipbox-docs.firebaseapp.com",
    projectId: "tipbox-docs",
    storageBucket: "tipbox-docs.firebasestorage.app",
    messagingSenderId: "921740258376",
    appId: "1:921740258376:web:1ccf200d51d7b4736afc7d",
    measurementId: "G-6PT22FTSEN"
};

// Firebase'i başlat (eğer daha önce başlatılmamışsa)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Firestore modülünü yükle (eğer mevcut değilse)
async function loadFirestoreIfNeeded() {
    if (!firebase.firestore) {
        try {
            console.log('Firestore modülü yükleniyor...');
            await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js');
            console.log('Firestore modülü başarıyla yüklendi');
            return true;
        } catch (error) {
            console.error('Firestore modülü yüklenirken hata:', error);
            return false;
        }
    }
    return true;
}

// Firestore'dan kullanıcı bilgilerini getir
// Global olarak tanımlanmış versiyonu
window.enhanceUserWithFirestoreData = async function(authUser) {
    console.log("enhanceUserWithFirestoreData fonksiyonu çağrıldı");
    
    // Firestore modülünü kontrol et ve gerekirse yükle
    const firestoreLoaded = await loadFirestoreIfNeeded();
    if (!firestoreLoaded) {
        console.warn('Firestore modülü yüklenemedi, sadece auth verileri kullanılacak');
        return authUser;
    }

    try {
        // Firestore referansını al
        const userRef = firebase.firestore().collection('users').doc(authUser.uid);
        
        // Firestore'dan kullanıcı dokümanını çek
        const userDoc = await userRef.get();
        
        if (userDoc.exists) {
            // Firestore'dan gelen verileri al
            const firestoreUserData = userDoc.data();
            
            console.log('Firestore\'dan kullanıcı bilgileri alındı:', firestoreUserData);
            
            // Auth kullanıcısı ile Firestore verilerini birleştir
            // Auth verileri yerine Firestore verilerini öncelikli kullan
            const enhancedUser = {
                ...authUser,
                ...firestoreUserData,
                // Firestore'dan gelen tarih alanlarını JS Date nesnesine dönüştür
                createdAt: firestoreUserData.createdAt?.toDate?.() || null,
                lastLoginAt: firestoreUserData.lastLoginAt?.toDate?.() || null,
                // Auth'dan gelen displayName, email ve photoURL değerleri Firestore'da yoksa kullan
                displayName: firestoreUserData.displayName || authUser.displayName,
                email: firestoreUserData.email || authUser.email,
                photoURL: firestoreUserData.photoURL || authUser.photoURL,
                // En önemlisi - role bilgisi (varsayılan olarak 'user')
                role: firestoreUserData.role || 'user'
            };
            
            return enhancedUser;
        } else {
            console.warn(`Kullanıcı Firestore'da bulunamadı (${authUser.uid}). Sadece Authentication bilgileri kullanılıyor.`);
            return authUser;
        }
    } catch (error) {
        console.error('Firestore\'dan kullanıcı bilgileri alınırken hata:', error);
        return authUser;
    }
};

// Kullanıcı oturum durumu değişikliklerini dinle
firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        // Kullanıcı oturum açmışsa
        enhanceUserWithFirestoreData(user).then(enhancedUser => {
            updateUserInterface(enhancedUser);
        }).catch(error => {
            console.error('Kullanıcı bilgileri getirilirken hata:', error);
            updateUserInterface(user); // Hata durumunda orijinal kullanıcı bilgilerini kullan
        });
    } else {
        // Kullanıcı oturum açmamışsa
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
    firebase.auth().signOut()
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
    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            // Başarılı giriş
            console.log('Google ile giriş başarılı:', result.user);
        })
        .catch((error) => {
            console.error('Google ile giriş hatası:', error);
        });
}

// Email/Şifre ile giriş yap
function signInWithEmail(email, password) {
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Başarılı giriş
            console.log('Email ile giriş başarılı:', userCredential.user);
        })
        .catch((error) => {
            console.error('Email ile giriş hatası:', error);
        });
}

// Yeni kullanıcı kaydı
function signUp(email, password) {
    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Başarılı kayıt
            console.log('Kullanıcı kaydı başarılı:', userCredential.user);
        })
        .catch((error) => {
            console.error('Kullanıcı kaydı hatası:', error);
        });
}

// Şifre sıfırlama
function resetPassword(email) {
    firebase.auth().sendPasswordResetEmail(email)
        .then(() => {
            console.log('Şifre sıfırlama emaili gönderildi');
        })
        .catch((error) => {
            console.error('Şifre sıfırlama hatası:', error);
        });
}