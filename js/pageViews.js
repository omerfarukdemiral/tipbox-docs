// Sayfa görüntüleme izleme modülü
// Doğrudan Firebase servislerini kullanır

// Firebase bağlantı durumunu takip eden değişken
let isFirebaseConnected = false;

// Global değişkenler
let entryTime = null;        // Kullanıcının sayfaya ilk giriş zamanı
let userId = 'anonymous';    // Oturum açmış kullanıcının ID'si
let currentPage = null;      // Mevcut sayfa adı
let pageSlug = null;         // Firestore için URL-dostu sayfa tanımlayıcısı
let isProcessing = false;    // İşlem durumu flag'i
let isPageNavigating = false; // Sayfa yönlendirme flag'i
let isInitialized = false;   // İlklendirme durumu

// Minimum kayıt süresi (10 saniye)
const MIN_DURATION = 10 * 1000;

// İzlenen sayfalar ve insan tarafından okunabilir adları
const TRACKED_PAGES = {
    'tokeneconomics.html': 'Tokenekonomics',
    'pitchdeck.html': 'Pitchdeck',
    'project-blurb.html': 'Project Blurb',
    'project-blueprint.html': 'Project Blueprint'
};

(function () {
    if (location.hostname !== 'localhost') {
      console.log = function() {};
      console.warn = function() {};
      console.error = function() {};
      console.info = function() {};
      console.debug = function() {};
    }
  })();

// Firebase bağlantısını doğrula
async function checkFirebaseConnection() {    
    if (typeof firebase === 'undefined') {
        console.error('❌ Firebase kütüphanesi yüklenemedi!');
        return false;
    }
    
    try {
        // Firebase App'in başlatılıp başlatılmadığını kontrol et
        const apps = firebase.apps;
        if (!apps || apps.length === 0) {
            console.error('❌ Firebase başlatılmamış!');
            // Firebase config varsa başlatmayı dene
            if (window.firebaseConfig) {
                try {
                    firebase.initializeApp(window.firebaseConfig);
                } catch (initError) {
                    console.error('❌ Firebase başlatma hatası:', initError);
                    return false;
                }
            } else {
                // Sabit bir Firebase konfigürasyonu tanımla
                try {
                    const defaultConfig = {
                        apiKey: "AIzaSyBX9y2CJMG4X5Qos3pLl6YPtUE4LYx-3DU",
                        authDomain: "tipbox-docs-317bc.firebaseapp.com",
                        projectId: "tipbox-docs-317bc",
                        storageBucket: "tipbox-docs-317bc.firebasestorage.app",
                        messagingSenderId: "967102234588",
                        appId: "1:967102234588:web:158ec4b46adc6e784ed919",
                        measurementId: "G-SEMNFLSB42"
                    };
                    firebase.initializeApp(defaultConfig);
                } catch (initError) {
                    console.error('❌ Firebase varsayılan yapılandırma ile başlatma hatası:', initError);
                    return false;
                }
            }
        }
        
        // Firestore'a erişimi kontrol et ve dinamik olarak yükle
        if (!firebase.firestore) {            
            try {
                // Firestore'u dinamik olarak yükle
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
                
                // Bir saniye bekleyelim
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Yükleme sonrası kontrol
                if (!firebase.firestore) {
                    console.error('❌ Firestore modülü yüklendi ancak kullanılamıyor!');
                    return false;
                }
            } catch (loadError) {
                console.error('❌ Firestore modülü yüklenirken hata:', loadError);
                return false;
            }
        }
        isFirebaseConnected = true;
        return true;
    } catch (error) {
        console.error('❌ Firebase bağlantı kontrolü sırasında hata:', error);
        return false;
    }
}

/**
 * Geçen süreyi hesaplar
 * @returns {number} Milisaniye cinsinden geçen süre
 */
function calculateDuration() {
    if (!entryTime) return 0;
    return Date.now() - entryTime;
}

/**
 * Benzersiz uuid oluştur
 * @returns {string} Benzersiz uuid
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Sayfa görüntüleme takibi için tüm gerekli olayları başlatır
 */
async function initializePageViews() {
    if (isInitialized) return;
    isInitialized = true;
    
    // Firebase bağlantısını kontrol et - asenkron çalıştır
    const firebaseConnected = await checkFirebaseConnection();
    if (!firebaseConnected) {
        console.error('❌ Firebase bağlantısı kurulamadı, sayfa görüntüleme takibi yapılamayacak');
        return;
    }
    
    // Lokal depolama kontrolü
    checkPendingRecords();
    
    // Sayfa giriş zamanını kaydet
    resetTimer();
    
    // Sayfa görüntülemeleri için başlangıç kaydı yapmıyoruz,
    // kullanıcı en az MIN_DURATION kadar sayfada kalmalı
    
    // Sayfa gezinimini dinlemeye başla
    setupEventListeners();
}

/**
 * Tüm olay dinleyicilerini kurar
 */
function setupEventListeners() {
    
    // Sayfa içi navigasyonu yakala
    document.addEventListener('click', handleLinkClick);
    
    // Tarayıcı geri/ileri düğmelerini yakala
    window.addEventListener('beforeunload', handlePageUnload);
    window.addEventListener('pagehide', handlePageUnload);
    
    // Sayfa/sekme görünürlüğünü izle
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
}

/**
 * Bağlantı tıklamalarını işler
 * @param {Event} event - Tıklama olayı
 */
async function handleLinkClick(event) {
    // Event'in daha önce işlenip işlenmediğini kontrol et
    if (event.handled === true) {
        return;
    }
    
    const linkElement = event.target.closest('a, .nav-link, .navbar-brand, button[data-href]');
    if (!linkElement) return;
    
    const href = linkElement.getAttribute('href') || linkElement.getAttribute('data-href');
    if (!href || href === '#' || href.startsWith('javascript:') || href.startsWith('mailto:')) return;
    
    // Dış bağlantıları kontrol et (yeni sekmede açılanlar dahil)
    if ((href.startsWith('http') && !href.includes(window.location.hostname)) || 
        linkElement.target === '_blank') {
        return;
    }
    
    event.handled = true;
    event.preventDefault();
    event.stopPropagation();
    isPageNavigating = true;
    
    try {
        await recordTimeSpent();
        setTimeout(() => {
            window.location.href = href;
        }, 100);
    } catch (error) {
        console.error('❌ Navigasyon sırasında hata:', error);
        // Hata olsa bile yönlendirmeyi gerçekleştir
        window.location.href = href;
    }
}

/**
 * Sayfa kapatma/yenileme durumlarını işler
 */
function handlePageUnload() {
    if (!entryTime || isProcessing) return;
    
    isPageNavigating = true;
    
    const duration = calculateDuration();
    
    if (duration >= MIN_DURATION) {
        
        // beforeunload sırasında asenkron işlemler tam olarak çalışmayabilir
        // Bu nedenle lokal depolamada yedekle
        const backupData = {
            userId: userId,
            pageName: currentPage,
            pageSlug: pageSlug,
            duration: Math.round(duration / 1000),
            timestamp: new Date().toISOString(),
            processID: `${userId}_${pageSlug}_${Date.now()}`
        };
        
        localStorage.setItem('pendingPageView', JSON.stringify(backupData));
    } else {
    }
}

/**
 * Görünürlük değişikliklerini işler
 */
function handleVisibilityChange() {
    if (document.visibilityState === 'hidden' && !isProcessing) {
        recordTimeSpent();
    } else if (document.visibilityState === 'visible') {
        resetTimer();
    }
}

/**
 * Sayfa kapatılırken son verileri kaydetmek için
 * navigator.sendBeacon API'sini kullanır
 */
function setupPageUnloadHandler() {
    window.addEventListener('beforeunload', function(event) {
        if (!currentPage || !userId || !entryTime || !pageSlug) return;
        
        const currentTime = new Date().getTime();
        const duration = currentTime - entryTime;
        const durationInSeconds = Math.round(duration / 1000);
        
        // Min süre kontrolü - 10 saniyeden az ise kaydetme
        if (durationInSeconds < MIN_DURATION / 1000) {
            return;
        }
        
        // Kullanıcı kimliği kontrolü
        if (!userId || userId === 'anonymous') {
            return;
        }
        
        // Benzersiz bir processID oluştur
        const processID = `${userId}_${pageSlug}_${Date.now()}`;
        
        // Veri hazırla
        const viewData = {
            processID: processID,
            userId: userId,
            pageName: currentPage,      // İnsan tarafından okunabilir isim
            pageSlug: pageSlug,         // Firebase belge ID'si için kullanılacak
            duration: durationInSeconds,
            timestamp: new Date().toISOString()
        };
        
        // Senkron olarak localStorage'a kaydet (bu mutlaka çalışacak)
        localStorage.setItem('pendingPageView', JSON.stringify(viewData));
        
        try {
            // Firebase doğrudan yazma denemesi
            // Not: beforeunload'da asenkron işlemler tamamlanmayabilir
            // bu yüzden önce localStorage'a kaydediyoruz
            const db = firebase.firestore();
            const documentId = generateUUID();
            
            db.collection('pageViews')
                .doc(documentId)
                .set({
                    processID: processID,
                    userId: userId,
                    pageName: currentPage,  // Görüntüleme için okunabilir isim
                    pageSlug: pageSlug,     // URL-dostu format
                    duration: durationInSeconds,
                    timestamp: firebase.firestore.Timestamp.fromDate(new Date())
                });
        } catch (error) {
            console.error('❌ beforeunload: Firestore yazma hatası', error);
            // Zaten localStorage'a kaydettik, hata durumunda bir şey yapmaya gerek yok
        }
    });
}

/**
 * Bekleyen kayıtları kontrol eder ve gönderir
 */
function checkPendingRecords() {
    const pendingRecord = localStorage.getItem('pendingPageView');
    
    if (!pendingRecord) {
        return;
    }
    
    try {
        const data = JSON.parse(pendingRecord);
        
        // Minimum süre kontrolü yap
        if (data.duration < MIN_DURATION / 1000) {
            localStorage.removeItem('pendingPageView');
            return;
        }
        
        if (!data.processID) {
            data.processID = `${data.userId}_${data.pageSlug || 'unknown'}_${Date.now()}`;
        }        
        // ProcessID kontrolü - Firestore'da aynı processID var mı kontrol et
        checkIfRecordExists(data)
            .then(exists => {
                if (exists) {
                    localStorage.removeItem('pendingPageView');
                } else {
                    saveRecordToFirestore(data);
                }
            })
            .catch(error => {
                console.error('❌ Kayıt kontrolü sırasında hata:', error);
            });
    } catch (error) {
        console.error('❌ Bekleyen kayıt işlenirken hata:', error);
        localStorage.removeItem('pendingPageView');
    }
}

/**
 * Firestore'da aynı ProcessID ile kayıt var mı kontrol eder
 * @param {Object} data - Kontrol edilecek kayıt verisi
 * @returns {Promise<boolean>} Kayıt varsa true, yoksa false
 */
async function checkIfRecordExists(data) {
    if (!isFirebaseConnected) {
        console.error('❌ Firebase bağlantısı olmadan sorgu yapılamaz');
        return false;
    }
    
    if (!data.processID) {
        // ProcessID yoksa, kontrol yapılamaz
        return false;
    }
    
    try {        
        // Yeni yapıda, pageViews koleksiyonunda processID'ye göre sorgulama yap
        const db = firebase.firestore();
        const querySnapshot = await db
            .collection('pageViews')
            .where('processID', '==', data.processID)
            .limit(1)
            .get();
        
        const exists = !querySnapshot.empty;
        return exists;
    } catch (error) {
        console.error('❌ ProcessID kontrolü sırasında hata:', error);
        console.error('Hata detayları:', JSON.stringify(error));
        return false;
    }
}

/**
 * Veriyi Firestore'a kaydeder
 * @param {Object} data - Kaydedilecek veri
 */
function saveRecordToFirestore(data) {
    if (!isFirebaseConnected) {
        console.error('❌ Firebase bağlantısı olmadan kayıt yapılamaz');
        return;
    }
    
    // ProcessID yoksa ekle
    if (!data.processID) {
        data.processID = `${data.userId}_${data.pageSlug || data.pageName.replace(/\s+/g, '-').toLowerCase()}_${Date.now()}`;
    }
    
    // pageSlug yoksa oluştur
    if (!data.pageSlug && data.pageName) {
        data.pageSlug = data.pageName.replace(/\s+/g, '-').toLowerCase();
    }
    
    try {
        // Benzersiz bir belge ID'si oluştur
        const documentId = generateUUID();
        
        // Firestore'a kaydet: pageViews/{uuid}
        const db = firebase.firestore();
        
        db.collection('pageViews')
            .doc(documentId)
            .set({
                processID: data.processID,
                userId: data.userId,
                pageName: data.pageName,
                pageSlug: data.pageSlug,
                duration: data.duration,
                timestamp: firebase.firestore.Timestamp.fromDate(new Date(data.timestamp))
            })
            .then(() => {
                localStorage.removeItem('pendingPageView');
            })
            .catch(err => {
                console.error('❌ Firestore\'a kayıt gönderilemedi:', err);
                console.error('Kayıt Hatası Detayları:', JSON.stringify(err));
            });
    } catch (error) {
        console.error('❌ Firestore kayıt işlemi sırasında beklenmeyen hata:', error);
        console.error('Beklenmeyen Hata Detayları:', JSON.stringify(error));
    }
}

/**
 * Veritabanına süreyi kaydeder
 * @param {number} duration - Kaydedilecek süre (milisaniye)
 */
async function saveToDatabase(duration) {
    if (isProcessing || !currentPage || !pageSlug) {
        return;
    }
    
    if (!isFirebaseConnected) {
        console.error('❌ Firebase bağlantısı olmadan kayıt yapılamaz');
        return;
    }
    
    isProcessing = true;
    
    try {
        // Süreyi saniye cinsine çevir
        const durationInSeconds = Math.round(duration / 1000);
        
        // Minimum süre kontrolü - 10 saniyeden az ise kaydetme
        if (durationInSeconds < MIN_DURATION / 1000) {
            isProcessing = false;
            return;
        }
        
        // Kullanıcı kimliği kontrolü
        if (!userId || userId === 'anonymous') {
            isProcessing = false;
            return;
        }
        
        // Benzersiz bir processID oluştur
        const processID = `${userId}_${pageSlug}_${Date.now()}`;
        
        // Benzersiz bir belge ID'si oluştur
        const documentId = generateUUID();
        
        // Veri modeli
        const viewData = {
            processID: processID,
            userId: userId,
            pageName: currentPage,  // İnsan tarafından okunabilir isim
            pageSlug: pageSlug,     // URL-dostu format
            duration: durationInSeconds, // Süre bilgisi zorunlu
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Firestore'a kaydet: pageViews/{uuid} koleksiyonuna
        const db = firebase.firestore();
        
        const docRef = await db
            .collection('pageViews')
            .doc(documentId)
            .set(viewData);
        
        // Başarılı kayıt işlemi sonrası isteğe bağlı olarak veri doğrulama
        try {
            const savedDoc = await db.collection('pageViews').doc(documentId).get();
            if (savedDoc.exists) {
            } else {
                console.error('⚠️ Kayıt oluşturuldu ama veri doğrulanamadı!');
            }
        } catch (verifyError) {
            console.error('⚠️ Kayıt doğrulama hatası:', verifyError);
        }
    } catch (error) {
        console.error('❌ Kayıt sırasında hata:', error);
        console.error('Hata detayları:', JSON.stringify(error));
        
        // Hata durumunda local storage'a yedekle (sadece süre MIN_DURATION'dan büyük ise)
        const durationInSeconds = Math.round(duration / 1000);
        if (durationInSeconds >= MIN_DURATION / 1000) {
            const processID = `${userId}_${pageSlug}_${Date.now()}`;
            const backupData = {
                processID: processID,
                userId: userId,
                pageName: currentPage,
                pageSlug: pageSlug,
                duration: durationInSeconds,
                timestamp: new Date().toISOString()
            };
            
            localStorage.setItem('pendingPageView', JSON.stringify(backupData));
        }
    } finally {
        isProcessing = false;
    }
}

/**
 * Geçirilen süreyi kaydeder
 */
async function recordTimeSpent() {
    if (!entryTime || isProcessing) {
        return;
    }
    
    const duration = calculateDuration();
    
    // Süre çok kısa ise kaydetme
    if (duration < MIN_DURATION) {
        
        if (isPageNavigating) {
            isPageNavigating = false;
            entryTime = null;
        } else {
            resetTimer();
        }
        
        return;
    }
    
    // Kayıt işlemi
    await saveToDatabase(duration);
    
    if (isPageNavigating) {
        isPageNavigating = false;
        entryTime = null;
    } else {
        resetTimer();
    }
}

/**
 * Zamanlayıcıyı sıfırlar
 */
function resetTimer() {
    entryTime = Date.now();
}

// DOM yüklendiğinde sayfa takibini başlat
document.addEventListener("DOMContentLoaded", async function() {
    
    // Firebase Auth doğrudan dinle
    if (firebase && firebase.auth) {
        firebase.auth().onAuthStateChanged(async user => {
            if (user) {
                userId = user.uid;
            } else {
                userId = 'anonymous';
            }
            
            // Geçerli sayfa adını belirle
            const path = window.location.pathname;
            const filename = path.split('/').pop() || 'index.html';
            
            // İnsan tarafından okunabilir sayfa adı ata
            if (TRACKED_PAGES[filename]) {
                pageSlug = filename.replace('.html', '');  // Firestore belge ID olarak kullanmak için
                currentPage = TRACKED_PAGES[filename];     // Görüntüleme için okunabilir isim
                
                // Sayfa görüntülemeyi başlat
                await initializePageViews();
            } else {
            }
        });
    } else {
        userId = 'anonymous';
        
        // Geçerli sayfa adını belirle
        const path = window.location.pathname;
        const filename = path.split('/').pop() || 'index.html';
        
        // İnsan tarafından okunabilir sayfa adı ata
        if (TRACKED_PAGES[filename]) {
            pageSlug = filename.replace('.html', '');  // Firestore belge ID olarak kullanmak için
            currentPage = TRACKED_PAGES[filename];     // Görüntüleme için okunabilir isim
            
            // Sayfa görüntülemeyi başlat
            await initializePageViews();
        } else {
        }
    }
    
    // Sayfa kapanma işleyicisini kur
    setupPageUnloadHandler();
    
    // Bekleyen kayıtları kontrol et
    checkPendingRecords();
});