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
    'project-deck.html': 'Project Deck',
    'project-blurb.html': 'Project Blurb',
    'project-blueprint.html': 'Project Blueprint'
};

console.log('🔍 PageViews.js yüklendi');

// Firebase bağlantısını doğrula
async function checkFirebaseConnection() {
    console.log('🔍 Firebase bağlantısı kontrol ediliyor...');
    
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
                    console.log('✅ Firebase başarıyla başlatıldı');
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
                    console.log('✅ Firebase varsayılan yapılandırma ile başlatıldı');
                } catch (initError) {
                    console.error('❌ Firebase varsayılan yapılandırma ile başlatma hatası:', initError);
                    return false;
                }
            }
        }
        
        // Firestore'a erişimi kontrol et ve dinamik olarak yükle
        if (!firebase.firestore) {
            console.log('⚠️ Firestore modülü yüklü değil, dinamik olarak yükleniyor...');
            
            try {
                // Firestore'u dinamik olarak yükle
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
                
                console.log('✅ Firestore modülü başarıyla yüklendi');
                
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
        
        console.log('✅ Firebase bağlantısı doğrulandı');
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
    
    console.log('🚀 Sayfa görüntüleme takibi başlatılıyor');
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
    console.log('🔄 Olay dinleyicileri kuruluyor');
    
    // Sayfa içi navigasyonu yakala
    document.addEventListener('click', handleLinkClick);
    
    // Tarayıcı geri/ileri düğmelerini yakala
    window.addEventListener('beforeunload', handlePageUnload);
    window.addEventListener('pagehide', handlePageUnload);
    
    // Sayfa/sekme görünürlüğünü izle
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    console.log('✅ Tüm olay dinleyicileri başarıyla eklendi');
}

/**
 * Bağlantı tıklamalarını işler
 * @param {Event} event - Tıklama olayı
 */
async function handleLinkClick(event) {
    // Event'in daha önce işlenip işlenmediğini kontrol et
    if (event.handled === true) {
        console.log('⏭️ Bu tıklama eventi daha önce işlenmiş, atlanıyor');
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
    
    // İç sayfa navigasyonu için
    console.log(`🔄 Sayfa içi navigasyon tespit edildi: ${href}`);
    
    event.handled = true;
    event.preventDefault();
    event.stopPropagation();
    isPageNavigating = true;
    
    try {
        await recordTimeSpent();
        console.log(`⏩ Yönlendirme: ${href}`);
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
    
    console.log('👋 Sayfa kapanıyor/yenileniyor');
    isPageNavigating = true;
    
    const duration = calculateDuration();
    
    if (duration >= MIN_DURATION) {
        console.log('💾 Sayfa kapatıldığı için süre kaydediliyor');
        
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
        console.log('💾 Sayfa kapatılırken veri yerel depolamaya yedeklendi', backupData);
    } else {
        console.log(`⏩ Süre çok kısa (${Math.round(duration / 1000)}sn), kayıt yapılmıyor`);
    }
}

/**
 * Görünürlük değişikliklerini işler
 */
function handleVisibilityChange() {
    if (document.visibilityState === 'hidden' && !isProcessing) {
        console.log('🙈 Sayfa görünmez oldu');
        recordTimeSpent();
    } else if (document.visibilityState === 'visible') {
        console.log('👁️ Sayfa tekrar görünür oldu');
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
            console.log(`⏱️ Süre çok kısa (${durationInSeconds}s), beforeunload'da kayıt yapılmıyor`);
            return;
        }
        
        // Kullanıcı kimliği kontrolü
        if (!userId || userId === 'anonymous') {
            console.log(`👤 Kullanıcı ID geçersiz (${userId}), beforeunload'da kayıt yapılmıyor`);
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
        
        console.log('💾 beforeunload: Sayfa kapatılıyor, veri kaydedilecek', viewData);
        
        // Senkron olarak localStorage'a kaydet (bu mutlaka çalışacak)
        localStorage.setItem('pendingPageView', JSON.stringify(viewData));
        console.log('💾 beforeunload: Veri localStorage\'a kaydedildi');
        
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
            
            console.log('🔥 beforeunload: Firestore yazma işlemi başlatıldı (tamamlanmayabilir)');
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
        console.log('✅ Bekleyen kayıt bulunmuyor');
        return;
    }
    
    try {
        console.log('🔍 Bekleyen kayıt bulundu:', pendingRecord);
        const data = JSON.parse(pendingRecord);
        
        // Minimum süre kontrolü yap
        if (data.duration < MIN_DURATION / 1000) {
            console.log(`⏱️ Süre çok kısa (${data.duration}s), kayıt silinecek`);
            localStorage.removeItem('pendingPageView');
            return;
        }
        
        if (!data.processID) {
            data.processID = `${data.userId}_${data.pageSlug || 'unknown'}_${Date.now()}`;
            console.log('⚠️ ProcessID bulunamadı, otomatik oluşturuldu:', data.processID);
        }
        
        console.log('🔄 ProcessID kontrolü başlatılıyor:', data.processID);
        
        // ProcessID kontrolü - Firestore'da aynı processID var mı kontrol et
        checkIfRecordExists(data)
            .then(exists => {
                if (exists) {
                    console.log('⚠️ Bu kayıt zaten Firestore\'da mevcut, atlanıyor:', data.processID);
                    localStorage.removeItem('pendingPageView');
                } else {
                    console.log('✅ Kayıt Firestore\'da bulunamadı, kaydedilecek');
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
        console.log('⚠️ ProcessID bulunamadı, Firestore kontrolü yapılamıyor');
        // ProcessID yoksa, kontrol yapılamaz
        return false;
    }
    
    try {
        console.log(`🔍 Firestore'da sorgu yapılıyor: pageViews/processID=${data.processID}`);
        
        // Yeni yapıda, pageViews koleksiyonunda processID'ye göre sorgulama yap
        const db = firebase.firestore();
        const querySnapshot = await db
            .collection('pageViews')
            .where('processID', '==', data.processID)
            .limit(1)
            .get();
        
        const exists = !querySnapshot.empty;
        console.log(`🔍 Firestore sorgu sonucu: ${exists ? 'Kayıt bulundu' : 'Kayıt bulunamadı'}`);
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
    
    console.log('💾 Firestore\'a kayıt başlatılıyor:', data);
    
    // ProcessID yoksa ekle
    if (!data.processID) {
        data.processID = `${data.userId}_${data.pageSlug || data.pageName.replace(/\s+/g, '-').toLowerCase()}_${Date.now()}`;
        console.log('⚠️ ProcessID bulunamadı, otomatik oluşturuldu:', data.processID);
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
        console.log(`📝 Koleksiyon yolu: pageViews/${documentId}`);
        
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
                console.log('✅ Kayıt başarıyla Firestore\'a gönderildi');
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
            console.log(`⏱️ Süre çok kısa (${durationInSeconds}s), kayıt yapılmıyor`);
            isProcessing = false;
            return;
        }
        
        // Kullanıcı kimliği kontrolü
        if (!userId || userId === 'anonymous') {
            console.log(`👤 Kullanıcı kimliği geçersiz (${userId}), kayıt yapılmıyor`);
            isProcessing = false;
            return;
        }
        
        // Benzersiz bir processID oluştur
        const processID = `${userId}_${pageSlug}_${Date.now()}`;
        console.log(`🆔 Yeni processID oluşturuldu: ${processID}`);
        
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
        
        console.log('💾 Firestore\'a kayıt yapılacak veri:', viewData);
        
        // Firestore'a kaydet: pageViews/{uuid} koleksiyonuna
        const db = firebase.firestore();
        
        console.log(`📝 Koleksiyon yolu: pageViews/${documentId}`);
        
        const docRef = await db
            .collection('pageViews')
            .doc(documentId)
            .set(viewData);
            
        console.log(`✅ Sayfa görüntüleme kaydedildi: ${currentPage} (${pageSlug}) - ${userId} - ${durationInSeconds}s, DocID: ${documentId}`);
        
        // Başarılı kayıt işlemi sonrası isteğe bağlı olarak veri doğrulama
        try {
            const savedDoc = await db.collection('pageViews').doc(documentId).get();
            if (savedDoc.exists) {
                console.log('✅✅ Kayıt doğrulandı, veri mevcut:', savedDoc.data());
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
            console.log('💾 Hata durumunda veri localStorage\'a kaydedildi', backupData);
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
        console.log('⚠️ recordTimeSpent: entryTime yok veya işlem devam ediyor');
        return;
    }
    
    const duration = calculateDuration();
    console.log(`⏱️ Ölçülen süre: ${Math.round(duration / 1000)} saniye`);
    
    // Süre çok kısa ise kaydetme
    if (duration < MIN_DURATION) {
        console.log(`⏱️ Süre çok kısa (${Math.round(duration / 1000)}s), kayıt yapılmıyor`);
        
        if (isPageNavigating) {
            isPageNavigating = false;
            entryTime = null;
        } else {
            resetTimer();
        }
        
        return;
    }
    
    // Kayıt işlemi
    console.log('🔄 saveToDatabase çağrılıyor, süre:', Math.round(duration / 1000));
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
    console.log('⏱️ Zamanlayıcı sıfırlandı:', new Date(entryTime).toLocaleTimeString());
}

// DOM yüklendiğinde sayfa takibini başlat
document.addEventListener("DOMContentLoaded", async function() {
    console.log('🚀 DOM yüklendi');
    
    // Firebase Auth doğrudan dinle
    if (firebase && firebase.auth) {
        firebase.auth().onAuthStateChanged(async user => {
            if (user) {
                userId = user.uid;
                console.log('👤 Oturum açmış kullanıcı tespit edildi:', userId);
            } else {
                console.log('👤 Anonim kullanıcı');
                userId = 'anonymous';
            }
            
            // Geçerli sayfa adını belirle
            const path = window.location.pathname;
            const filename = path.split('/').pop() || 'index.html';
            
            // İnsan tarafından okunabilir sayfa adı ata
            if (TRACKED_PAGES[filename]) {
                pageSlug = filename.replace('.html', '');  // Firestore belge ID olarak kullanmak için
                currentPage = TRACKED_PAGES[filename];     // Görüntüleme için okunabilir isim
                console.log(`📄 İzlenen sayfa: ${currentPage} (Belge ID: ${pageSlug})`);
                
                // Sayfa görüntülemeyi başlat
                await initializePageViews();
            } else {
                console.log('⚠️ Bu sayfa izlenmiyor:', filename);
            }
        });
    } else {
        console.log('❌ Firebase Auth kullanılamıyor! Anonim kullanıcı olarak devam edilecek.');
        userId = 'anonymous';
        
        // Geçerli sayfa adını belirle
        const path = window.location.pathname;
        const filename = path.split('/').pop() || 'index.html';
        
        // İnsan tarafından okunabilir sayfa adı ata
        if (TRACKED_PAGES[filename]) {
            pageSlug = filename.replace('.html', '');  // Firestore belge ID olarak kullanmak için
            currentPage = TRACKED_PAGES[filename];     // Görüntüleme için okunabilir isim
            console.log(`📄 İzlenen sayfa: ${currentPage} (Belge ID: ${pageSlug})`);
            
            // Sayfa görüntülemeyi başlat
            await initializePageViews();
        } else {
            console.log('⚠️ Bu sayfa izlenmiyor:', filename);
        }
    }
    
    // Sayfa kapanma işleyicisini kur
    setupPageUnloadHandler();
    
    // Bekleyen kayıtları kontrol et
    checkPendingRecords();
});