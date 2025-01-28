// Firebase Authentication Functions

// Kullanıcı oturum durumu değişikliklerini dinle
firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        // Kullanıcı oturum açmışsa
        updateUserInterface(user);
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