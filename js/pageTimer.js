// Global değişkenler
let entryTime = null;        // Kullanıcının sayfaya ilk giriş zamanı
let userId = null;           // Oturum açmış kullanıcının ID'si
let currentPage = null;      // Mevcut sayfa adı
let database = null;         // Firebase database referansı
let isProcessing = false;    // İşlem durumu flag'i
let isPageNavigating = false; // Yeni flag ekledik

// Minimum kayıt süresi (10 saniye)
const MIN_DURATION = 10000;

// İzlenen sayfalar
const TRACKED_PAGES = {
    'project-blueprint': 'project_blueprint',
    'project-deck': 'project_deck',
    'project-blurb': 'project_blurb',
    'tokeneconomics': 'tokeneconomics'
};

/**
 * Mevcut sayfanın izlenen sayfalardan biri olup olmadığını kontrol eder
 * @returns {string|null} Sayfa adı veya null
 */
function getTrackedPage() {
    const path = window.location.pathname;
    for (const [key, value] of Object.entries(TRACKED_PAGES)) {
        if (path.includes(key)) return value;
    }
    return null;
}

/**
 * Geçirilen süreyi hesaplar
 * @returns {number} Milisaniye cinsinden süre
 */
function calculateDuration() {
    if (!entryTime) return 0;
    return Date.now() - entryTime;
}

/**
 * Süreyi Firebase'e kaydeder
 * @param {number} duration - Milisaniye cinsinden süre
 */
async function saveToDatabase(duration) {
    if (isProcessing || !userId || !currentPage) return;
    if (duration < MIN_DURATION) {
        console.log(`Süre çok kısa: ${duration}ms < ${MIN_DURATION}ms`);
        return;
    }
    
    try {
        isProcessing = true;
        const newRecordRef = database.ref(`PageTimer/${userId}/${currentPage}`).push();
        await newRecordRef.set({
            timestamp: new Date().toISOString(),
            duration: duration,
            page: currentPage
        });
        console.log(`Kayıt başarılı: ${currentPage} - ${Math.round(duration / 1000)} saniye`);
    } catch (error) {
        localStorage.setItem("error", error);
        console.error('Kayıt hatası:', error);
    } finally {
        isProcessing = false;
    }
}

/**
 * Sayfa takibini başlatır
 */
function startTracking() {
    currentPage = getTrackedPage();
    if (currentPage) {
        entryTime = Date.now();
        console.log(`Sayfa takibi başladı: ${currentPage}`);
    }
}

/**
 * Mevcut süreyi kaydeder ve yeni takip başlatır
 */
async function saveAndRestart() {
    if (entryTime && currentPage) {
        const duration = calculateDuration();
        await saveToDatabase(duration);
    }
    startTracking();
}

/**
 * Event listener'ları ekler
 */
function addEventListeners() {
    // Sekme değişikliğini yakala
    document.addEventListener('visibilitychange', () => {
        // Sayfa değişikliği sırasında bu eventi yoksay
        if (isPageNavigating || !currentPage) return;

        if (document.hidden) {
            const duration = calculateDuration();
            saveToDatabase(duration);
            entryTime = null;
        } else {
            entryTime = Date.now();
        }
    });

    // Sayfa içi navigasyonu yakala
    document.addEventListener('click', async (event) => {
        // Event'in daha önce işlenip işlenmediğini kontrol et
        if (event.handled === true) return;
        event.handled = true;

        const link = event.target.closest('a');
        if (!link) return;

        // Harici link veya sayfa yönlendirmesi kontrolü
        if (link.href && 
            !link.href.startsWith('#') && 
            !link.href.includes('javascript:') &&
            link.target !== '_blank') {
            
            event.preventDefault();
            event.stopPropagation();
            isPageNavigating = true;
            
            const duration = calculateDuration();
            
            try {
                if (duration >= MIN_DURATION) {
                    const formData = new FormData();
                    formData.append('userId', userId);
                    formData.append('page', currentPage);
                    formData.append('duration', duration);
                    formData.append('timestamp', new Date().toISOString());

                    // Sadece backend üzerinden kayıt yap
                    const response = await fetch('http://localhost:3000/api/save-time', {
                        method: 'POST',
                        body: formData,
                        cache: 'no-store',
                        headers: {
                            'Cache-Control': 'no-cache'
                        }
                    });

                    if (!response.ok) {
                        throw new Error('Kayıt başarısız');
                    }
                }
            } catch (error) {
                console.error('Kayıt hatası:', error);
                // Hata durumunda localStorage'a kaydet
                localStorage.setItem('pendingPageTimer', JSON.stringify({
                    userId: userId,
                    page: currentPage,
                    duration: duration,
                    timestamp: new Date().toISOString()
                }));
            } finally {
                setTimeout(() => {
                    window.location.href = link.href;
                }, 100);
            }
        }
    });

    // Sayfa kapatma/yenileme durumunu yakala
    window.addEventListener('beforeunload', (event) => {
        if (entryTime && currentPage) {
            const duration = calculateDuration();
            
            if (duration >= MIN_DURATION) {
                try {
                    // Sadece navigator.sendBeacon kullan
                    const formData = new FormData();
                    formData.append('userId', userId);
                    formData.append('page', currentPage);
                    formData.append('duration', duration);
                    formData.append('timestamp', new Date().toISOString());

                    navigator.sendBeacon('http://localhost:3000/api/save-time', formData);
                } catch (error) {
                    console.error('Kapanış kaydı hatası:', error);
                }
            }
        }
    });
}

/**
 * Timer'ı başlatır
 */
function initializeTimer() {
    try {
        database = firebase.database();
        
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                userId = user.uid;
                startTracking();
                addEventListeners();
            }
        });
    } catch (error) {
        console.error('Başlatma hatası:', error);
    }
}

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', initializeTimer);