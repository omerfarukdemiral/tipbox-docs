// Firebase yapılandırması
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getDatabase, ref, onValue, push, set, get } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

// Firebase yapılandırma bilgileri
const firebaseConfig = {
    apiKey: "AIzaSyAKgkPi3-ll2wIvaBxBo4tLKad2ssipPR0",
    authDomain: "tipbox-docs.firebaseapp.com",
    databaseURL: "https://tipbox-docs-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "tipbox-docs",
    storageBucket: "tipbox-docs.firebasestorage.app",
    messagingSenderId: "921740258376",
    appId: "1:921740258376:web:1ccf200d51d7b4736afc7d",
    measurementId: "G-6PT22FTSEN"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Global değişkenler
let usersTable, userDetailsTable, tokenTable;

// Token oluşturma fonksiyonu
async function createToken() {
    try {
        const response = await fetch('http://localhost:3000/api/tokens/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Token oluşturulamadı');
        }

        const result = await response.json();

        if (result.success) {
            // Başarı mesajı göster
            Toastify({
                text: "Token başarıyla oluşturuldu!",
                duration: 3000,
                gravity: "top",
                position: "right",
                style: {
                    background: "#2b2b2b",
                    border: "1px solid #00ff9d",
                    color: "#00ff9d",
                    fontFamily: "'Jura', sans-serif"
                },
                stopOnFocus: true
            }).showToast();

            // Yeni token'ı göster
            const tokenDisplay = document.getElementById('newTokenDisplay');
            tokenDisplay.querySelector('.token-code').textContent = result.token;
            tokenDisplay.classList.remove('d-none');

            // Kopyalama butonu için event listener ekle
            const copyButton = tokenDisplay.querySelector('.copy-token');
            copyButton.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(result.token);
                    
                    // Kopyalama başarılı bildirimi
                    Toastify({
                        text: "Token kopyalandı!",
                        duration: 2000,
                        gravity: "top",
                        position: "right",
                        style: {
                            background: "#2b2b2b",
                            border: "1px solid #00ff9d",
                            color: "#00ff9d"
                        }
                    }).showToast();

                    // Kopyalama ikonunu geçici olarak değiştir
                    copyButton.classList.remove('fa-copy');
                    copyButton.classList.add('fa-check');
                    setTimeout(() => {
                        copyButton.classList.remove('fa-check');
                        copyButton.classList.add('fa-copy');
                    }, 1000);
                } catch (err) {
                    console.error('Kopyalama hatası:', err);
                    Toastify({
                        text: "Kopyalama başarısız!",
                        duration: 2000,
                        gravity: "top",
                        position: "right",
                        style: {
                            background: "#2b2b2b",
                            border: "1px solid #dc3545",
                            color: "#dc3545"
                        }
                    }).showToast();
                }
            });

            // Token listesini güncelle
            loadTokens();
        } else {
            throw new Error(result.error || 'Token oluşturulamadı');
        }
    } catch (error) {
        console.error('Token oluşturma hatası:', error);
        Toastify({
            text: "Token oluşturulurken bir hata oluştu!",
            duration: 3000,
            gravity: "top",
            position: "right",
            style: {
                background: "#2b2b2b",
                border: "1px solid #dc3545",
                color: "#dc3545"
            }
        }).showToast();
    }
}


// Token listesini yükle
function loadTokens() {
    const tokensRef = ref(db, 'invite_codes');
    
    onValue(tokensRef, (snapshot) => {
        const tokens = snapshot.val();
        
        if (!tokenTable) return;
        
        tokenTable.clear();
        
        if (tokens) {
            // Tokenleri diziye çevir ve used_count'a göre sırala
            const sortedTokens = Object.entries(tokens)
                .map(([code, data]) => ({ code, ...data }))
                .sort((a, b) => (b.used_count || 0) - (a.used_count || 0)); // used_count yoksa 0 kabul et

            let counter = 1; // Sıra numarası için sayaç
            sortedTokens.forEach(data => {
                const usageStatus = data.used_count >= data.max_uses ? 
                    '<span class="badge bg-danger" style="font-family: \'Jura\', sans-serif;">Limit Dolu</span>' : 
                    '<span class="badge bg-success" style="font-family: \'Jura\', sans-serif;">Aktif</span>';

                const usageDisplay = updateTokenUsageDisplay(data);

                tokenTable.row.add([
                    counter, // Sıra numarası
                    `<code class="token-code" style="font-family: 'Jura', sans-serif;">${data.code}</code>`,
                    new Date(data.created_at).toLocaleString(),
                    usageDisplay,
                    usageStatus
                ]);
                
                counter++; // Sayacı artır
            });
        }
        
        tokenTable.draw();
    });
}

// Token kullanım göstergesini güncelle
function updateTokenUsageDisplay(data) {
    const usageDisplay = `<div class="usage-display">
        <div class="progress" style="height: 20px; background: rgba(255,255,255,0.1);">
            <div class="progress-bar bg-success" role="progressbar" 
                style="width: ${(data.used_count / data.max_uses * 100)}%; font-family: 'Jura', sans-serif;" 
                aria-valuenow="${data.used_count}" 
                aria-valuemin="0" 
                aria-valuemax="${data.max_uses}">
                ${data.used_count}
            </div>
        </div>
    </div>`;
    return usageDisplay;
}

// Fake sayfa kullanım verisi
const fakePageData = {
    total_durations: {
        project_blueprint: 450000, // 7.5 dakika
        project_deck: 300000,      // 5 dakika
        project_blurb: 270000,     // 4.5 dakika
        tokeneconomics: 480000     // 8 dakika
    }
};

// Kullanıcıları yükle
async function loadUsers() {
    try {
        console.log('Kullanıcılar yükleniyor...');
        
        // Firebase Authentication kullanıcılarını API'den al
        const response = await fetch('http://localhost:3000/api/auth/users');
        if (!response.ok) {
            throw new Error('Kullanıcı listesi alınamadı');
        }
        
        const users = await response.json();
        console.log('Kullanıcı verisi alındı:', users);

        if (!users || users.length === 0) {
            console.log('Kullanıcı verisi bulunamadı');
            return;
        }

        usersTable.clear();
        
        users.forEach(user => {
            // Kullanıcı tipini belirle
            let userType = '<span class="badge bg-secondary">Email/Şifre</span>';
            if (user.providerData && user.providerData.length > 0) {
                const provider = user.providerData[0].providerId;
                switch (provider) {
                    case 'google.com':
                        userType = '<span class="badge bg-primary">Google</span>';
                        break;
                    case 'linkedin.com':
                        userType = '<span class="badge bg-info">LinkedIn</span>';
                        break;
                    case 'custom':
                        userType = '<span class="badge bg-warning">Misafir</span>';
                        break;
                }
            }

            // Kullanıcı adı ve soyadını ayır
            let firstName = '', lastName = '';
            if (user.displayName) {
                const nameParts = user.displayName.split(' ');
                firstName = nameParts[0];
                lastName = nameParts.slice(1).join(' ');
            }

            usersTable.row.add([
                `<img src="${user.photoURL || 'https://via.placeholder.com/40'}" alt="Profil" class="rounded-circle" width="40">`,
                firstName || 'İsimsiz',
                lastName || '-',
                user.email || '-',
                user.uid,
                `<small class="text-muted">Son giriş: ${new Date(user.metadata.lastSignInTime).toLocaleString()}</small><br>${userType}`
            ]);
        });
        
        usersTable.draw();
    } catch (error) {
        console.error('loadUsers fonksiyonunda hata:', error);
        Toastify({
            text: "Kullanıcı verileri yüklenirken bir hata oluştu!",
            duration: 3000,
            gravity: "top",
            position: "right",
            backgroundColor: "#ff0000"
        }).showToast();
    }
}

// Kullanıcı istatistiklerini yükle
function loadUserStats(userId) {
    const userRef = ref(db, `user-activities/${userId}`);
    
    onValue(userRef, (snapshot) => {
        const userData = {
            project_blueprint: 0,
            project_deck: 0,
            project_blurb: 0,
            tokeneconomics: 0
        };
        
        snapshot.forEach((pageSnapshot) => {
            const page = pageSnapshot.key;
            pageSnapshot.forEach((visit) => {
                userData[page] += visit.val().duration || 0;
            });
        });
        
        updateUserChart(userData);
    });
}

// Sayfa istatistiklerini yükle
function loadPageStats() {
    try {
        console.log('Sayfa istatistikleri yükleniyor...');
        const pageTimerRef = ref(db, 'PageTimer');
        
        onValue(pageTimerRef, (snapshot) => {
            console.log('Sayfa istatistikleri alındı:', snapshot.val());
            const pageData = snapshot.val();
            
            if (!pageData) {
                console.log('Sayfa istatistikleri bulunamadı');
                return;
            }

            // Tüm sayfalar için toplam süreleri hesapla (milisaniye cinsinden)
            const totalDurations = {
                project_blueprint: 0,
                project_deck: 0,
                project_blurb: 0,
                tokeneconomics: 0
            };

            // Her kullanıcının verilerini topla
            Object.values(pageData).forEach(userData => {
                // Her sayfa türü için
                Object.keys(totalDurations).forEach(pageType => {
                    if (userData[pageType]) {
                        // Sayfadaki tüm ziyaretleri topla
                        Object.values(userData[pageType]).forEach(visit => {
                            if (visit.duration) {
                                totalDurations[pageType] += visit.duration;
                            }
                        });
                    }
                });
            });

            // Grafiği güncelle
            updatePageUsageChart(totalDurations);
            
        }, (error) => {
            console.error("Sayfa istatistiklerini çekerken hata oluştu:", error);
            Toastify({
                text: "Sayfa istatistikleri yüklenirken bir hata oluştu!",
                duration: 3000,
                gravity: "top",
                position: "right",
                backgroundColor: "#ff0000"
            }).showToast();
        });
    } catch (error) {
        console.error('loadPageStats fonksiyonunda hata:', error);
    }
}

// Milisaniyeleri saat, dakika ve saniyeye çevir
function formatDuration(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}s`);
    if (minutes > 0) parts.push(`${minutes}d`);
    if (seconds > 0) parts.push(`${seconds}sn`);
    
    // Eğer süre 0 ise "0sn" göster
    return parts.length > 0 ? parts.join(' ') : '0sn';
}

// Sayfa kullanım grafiğini güncelle
function updatePageUsageChart(durations) {
    // Önceki chart instance'ı varsa temizle
    const existingChart = Chart.getChart('pageUsageChart');
    if (existingChart) {
        existingChart.destroy();
    }

    const ctx = document.getElementById('pageUsageChart').getContext('2d');
    const total = Object.values(durations).reduce((a, b) => a + b, 0);
    
    // Sayfa isimlerini daha okunabilir hale getir
    const pageNames = {
        project_blueprint: 'Project Blueprint',
        project_deck: 'Project Deck',
        project_blurb: 'Project Blurb',
        tokeneconomics: 'Tokeneconomics'
    };

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(durations).map(key => pageNames[key]),
            datasets: [{
                data: Object.values(durations).map(d => ((d / total) * 100).toFixed(1)),
                backgroundColor: [
                    'rgba(0, 255, 157, 0.5)',
                    'rgba(255, 99, 132, 0.5)',
                    'rgba(255, 206, 86, 0.5)',
                    'rgba(75, 192, 192, 0.5)'
                ],
                borderColor: [
                    'rgba(0, 255, 157, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#fff'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const duration = formatDuration(Object.values(durations)[context.dataIndex]);
                            return `${label}: %${value} (${duration})`;
                        }
                    }
                }
            }
        }
    });
}

// Kullanıcı grafiğini güncelle
function updateUserChart(userData) {
    // Önceki chart instance'ı varsa temizle
    const existingChart = Chart.getChart('userActivityChart');
    if (existingChart) {
        existingChart.destroy();
    }

    const ctx = document.getElementById('userActivityChart').getContext('2d');
    const total = Object.values(userData).reduce((a, b) => a + b, 0);
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Project Blueprint', 'Project Deck', 'Project Blurb', 'Tokeneconomics'],
            datasets: [{
                data: Object.values(userData).map(d => ((d / total) * 100).toFixed(1)),
                backgroundColor: [
                    'rgba(0, 255, 157, 0.5)',
                    'rgba(255, 99, 132, 0.5)',
                    'rgba(255, 206, 86, 0.5)',
                    'rgba(75, 192, 192, 0.5)'
                ],
                borderColor: [
                    'rgba(0, 255, 157, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#fff'
                    }
                }
            }
        }
    });
}

// Token kullanım istatistiklerini güncelle
function updateTokenUsageChart() {
    const tokensRef = ref(db, 'invite_codes');
    
    onValue(tokensRef, (snapshot) => {
        const tokens = snapshot.val();
        if (!tokens) return;

        // Tüm tokenleri diziye çevir ve tarihe göre sırala
        const tokenArray = Object.entries(tokens).map(([code, data]) => ({
            code,
            ...data
        })).sort((a, b) => b.used_count - a.used_count);

        let currentPage = 0;
        const tokensPerPage = 10;
        const totalPages = Math.ceil(tokenArray.length / tokensPerPage);

        function updateChart(page) {
            // Sayfa için token verilerini al
            const startIndex = page * tokensPerPage;
            const pageTokens = tokenArray.slice(startIndex, startIndex + tokensPerPage);

            // Grafik verilerini hazırla
            const data = {
                labels: pageTokens.map(t => t.code),
                datasets: [
                    {
                        label: 'Kullanım Sayısı',
                        data: pageTokens.map(t => t.used_count),
                        backgroundColor: 'rgba(0, 255, 157, 0.5)',
                        borderColor: '#00ff9d',
                        borderWidth: 1,
                        barPercentage: 0.6
                    },
                    {
                        label: 'Maximum Limit',
                        data: pageTokens.map(t => t.max_uses),
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: '#ff6384',
                        borderWidth: 1,
                        barPercentage: 0.6
                    }
                ]
            };

            // Grafik konfigürasyonu
            const config = {
                type: 'bar',
                data: data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: '#fff'
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: '#fff',
                                maxRotation: 45,
                                minRotation: 45
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                color: '#fff',
                                padding: 20,
                                usePointStyle: true
                            }
                        },
                    }
                }
            };

            // Mevcut grafiği temizle
            const existingChart = Chart.getChart('tokenUsageChart');
            if (existingChart) {
                existingChart.destroy();
            }

            // Yeni grafiği oluştur
            const ctx = document.getElementById('tokenUsageChart').getContext('2d');
            const chart = new Chart(ctx, config);

            // Sayfalama butonlarını güncelle
            updatePaginationButtons(page, totalPages);
        }

        // Sayfalama butonlarını oluştur/güncelle
        function updatePaginationButtons(currentPage, totalPages) {
            let paginationContainer = document.getElementById('tokenChartPagination');
            
            if (!paginationContainer) {
                paginationContainer = document.createElement('div');
                paginationContainer.id = 'tokenChartPagination';
                paginationContainer.className = 'text-center mt-3';
                document.getElementById('tokenUsageChart').parentNode.appendChild(paginationContainer);
            }

            paginationContainer.innerHTML = `
                <button class="btn btn-sm btn-outline-light me-2" 
                    ${currentPage === 0 ? 'disabled' : ''} 
                    onclick="window.changePage(${currentPage - 1})">
                    ◄ Önceki
                </button>
                <span class="text-light">Sayfa ${currentPage + 1}/${totalPages}</span>
                <button class="btn btn-sm btn-outline-light ms-2" 
                    ${currentPage >= totalPages - 1 ? 'disabled' : ''} 
                    onclick="window.changePage(${currentPage + 1})">
                    Sonraki ►
                </button>
            `;
        }

        // Sayfa değiştirme fonksiyonunu global scope'a ekle
        window.changePage = function(newPage) {
            currentPage = newPage;
            updateChart(currentPage);
        };

        // İlk sayfayı göster
        updateChart(currentPage);
    });
}

// Kullanıcı sayfa aktivitelerini yükle ve grafiği güncelle
function loadUserPageActivities(userId, userName) {
    // Seçili kullanıcı bilgisini güncelle
    const userInfoElement = document.getElementById('selectedUserInfo');
    userInfoElement.innerHTML = `<i class="fas fa-user"></i> Seçili Kullanıcı: <strong>${userName}</strong>`;
    
    const pageTimerRef = ref(db, `PageTimer/${userId}`);
    
    onValue(pageTimerRef, (snapshot) => {
        const pageData = snapshot.val();
        
        // Varsayılan süreleri 0 olarak ayarla
        const pageDurations = {
            project_blueprint: 0,
            project_deck: 0,
            project_blurb: 0,
            tokeneconomics: 0
        };

        let hasData = false;
        if (pageData) {
            // Her sayfa için süreleri topla
            Object.keys(pageDurations).forEach(pageType => {
                if (pageData[pageType]) {
                    Object.values(pageData[pageType]).forEach(visit => {
                        if (visit.duration) {
                            pageDurations[pageType] += visit.duration;
                            hasData = true;
                        }
                    });
                }
            });
        }

        // Grafiği güncelle
        updateUserPageActivityChart(pageDurations, hasData);

        // Veri durumuna göre uyarı göster
        const warningElement = document.createElement('div');
        warningElement.className = hasData ? 'd-none' : 'alert alert-warning mt-3';
        warningElement.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            Bu kullanıcı henüz hiçbir sayfa ile etkileşimde bulunmamış.
        `;

        // Eski uyarıyı kaldır ve gerekiyorsa yenisini ekle
        const chartContainer = document.querySelector('#userPageActivityChart').parentNode;
        const oldWarning = chartContainer.querySelector('.alert');
        if (oldWarning) oldWarning.remove();
        if (!hasData) {
            chartContainer.appendChild(warningElement);
        }
    });
}

// Kullanıcı sayfa aktivite grafiğini güncelle
function updateUserPageActivityChart(durations, hasData) {
    // Önceki chart instance'ı varsa temizle
    const existingChart = Chart.getChart('userPageActivityChart');
    if (existingChart) {
        existingChart.destroy();
    }

    const ctx = document.getElementById('userPageActivityChart').getContext('2d');
    const total = Object.values(durations).reduce((a, b) => a + b, 0);
    
    // Sayfa isimlerini daha okunabilir hale getir
    const pageNames = {
        project_blueprint: 'Project Blueprint',
        project_deck: 'Project Deck',
        project_blurb: 'Project Blurb',
        tokeneconomics: 'Tokeneconomics'
    };

    // Veri yoksa eşit dağılımlı boş grafik göster
    const data = hasData ? 
        Object.values(durations).map(d => ((d / total) * 100).toFixed(1)) :
        [25, 25, 25, 25]; // Eşit dağılım

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(durations).map(key => pageNames[key]),
            datasets: [{
                data: data,
                backgroundColor: [
                    'rgba(0, 255, 157, 0.5)',
                    'rgba(255, 99, 132, 0.5)',
                    'rgba(255, 206, 86, 0.5)',
                    'rgba(75, 192, 192, 0.5)'
                ],
                borderColor: [
                    'rgba(0, 255, 157, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#fff',
                        boxWidth: 15,
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (!hasData) {
                                return 'Veri yok';
                            }
                            const label = context.label || '';
                            const value = context.raw;
                            const duration = formatDuration(Object.values(durations)[context.dataIndex]);
                            return `${label}: %${value} (${duration})`;
                        }
                    }
                }
            }
        }
    });
}

// Kullanıcı zaman bazlı aktivite grafiğini güncelle
async function updateUserTimeActivityChart(userId) {
    const ctx = document.getElementById('userTimeActivityChart').getContext('2d');
    
    // Varsayılan veri seti - son 7 günü göster
    const dates = Array.from({length: 7}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toLocaleDateString('tr-TR');
    }).reverse();

    const defaultData = {
        labels: dates,
        datasets: [
            {
                label: 'Project Blueprint',
                data: Array(7).fill(0),
                borderColor: '#571fdd',
                backgroundColor: 'rgba(87, 31, 221, 0.2)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            },
            {
                label: 'Project Deck',
                data: Array(7).fill(0),
                borderColor: '#e0195b',
                backgroundColor: 'rgba(224, 25, 91, 0.2)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            },
            {
                label: 'Project Blurb',
                data: Array(7).fill(0),
                borderColor: '#d8ff08',
                backgroundColor: 'rgba(216, 255, 8, 0.2)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            },
            {
                label: 'Tokeneconomics',
                data: Array(7).fill(0),
                borderColor: '#00ff9d',
                backgroundColor: 'rgba(0, 255, 157, 0.2)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }
        ]
    };

    try {
        if (!userId) {
            if (window.timeActivityChart) {
                window.timeActivityChart.destroy();
            }
            
            window.timeActivityChart = new Chart(ctx, {
                type: 'line',
                data: defaultData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: '#fff',
                                font: {
                                    family: 'Jura'
                                },
                                callback: function(value) {
                                    return Math.floor(value / 60) + ' dk';
                                }
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: '#fff',
                                font: {
                                    family: 'Jura'
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                color: '#fff',
                                font: {
                                    family: 'Jura'
                                },
                                padding: 20
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const minutes = Math.floor(context.raw / 60);
                                    const seconds = Math.round(context.raw % 60);
                                    return `${context.dataset.label}: ${minutes} dk ${seconds} sn`;
                                }
                            }
                        }
                    }
                }
            });
            return;
        }

        const timerRef = ref(db, `PageTimer/${userId}`);
        const snapshot = await get(timerRef);
        const timerData = snapshot.val();

        let chartData = { ...defaultData };

        if (timerData) {
            // Son 7 günün tarihlerini oluştur (YYYY-MM-DD formatında)
            const last7Days = Array.from({length: 7}, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                return d.toISOString().split('T')[0];
            }).reverse();

            // Her sayfa için günlük verileri tutacak nesne
            const dailyData = {
                'project_blueprint': Object.fromEntries(last7Days.map(date => [date, 0])),
                'project_deck': Object.fromEntries(last7Days.map(date => [date, 0])),
                'project_blurb': Object.fromEntries(last7Days.map(date => [date, 0])),
                'tokeneconomics': Object.fromEntries(last7Days.map(date => [date, 0]))
            };

            // Verileri günlere göre grupla
            Object.entries(timerData).forEach(([page, timestamps]) => {
                if (dailyData.hasOwnProperty(page)) {
                    Object.values(timestamps).forEach(data => {
                        const date = new Date(data.timestamp).toISOString().split('T')[0];
                        if (dailyData[page].hasOwnProperty(date)) {
                            // Milisaniyeyi saniyeye çevir
                            dailyData[page][date] += data.duration / 1000;
                        }
                    });
                }
            });

            // Chart verilerini güncelle
            chartData.datasets = [
                {
                    label: 'Project Blueprint',
                    data: Object.values(dailyData['project_blueprint']),
                    borderColor: '#571fdd',
                    backgroundColor: 'rgba(87, 31, 221, 0.2)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Project Deck',
                    data: Object.values(dailyData['project_deck']),
                    borderColor: '#e0195b',
                    backgroundColor: 'rgba(224, 25, 91, 0.2)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Project Blurb',
                    data: Object.values(dailyData['project_blurb']),
                    borderColor: '#d8ff08',
                    backgroundColor: 'rgba(216, 255, 8, 0.2)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Tokeneconomics',
                    data: Object.values(dailyData['tokeneconomics']),
                    borderColor: '#00ff9d',
                    backgroundColor: 'rgba(0, 255, 157, 0.2)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }
            ];
        }

        if (window.timeActivityChart) {
            window.timeActivityChart.destroy();
        }

        window.timeActivityChart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#fff',
                            font: {
                                family: 'Jura'
                            },
                            callback: function(value) {
                                if (value < 60) {
                                    return value + ' sn';
                                } else {
                                    return Math.floor(value / 60) + ' dk';
                                }
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#fff',
                            font: {
                                family: 'Jura'
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#fff',
                            font: {
                                family: 'Jura'
                            },
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const seconds = context.raw;
                                if (seconds < 60) {
                                    return `${context.dataset.label}: ${Math.round(seconds)} saniye`;
                                } else {
                                    const minutes = Math.floor(seconds / 60);
                                    const remainingSeconds = Math.round(seconds % 60);
                                    return `${context.dataset.label}: ${minutes} dk ${remainingSeconds} sn`;
                                }
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Grafik güncelleme hatası:', error);
    }
}

// Debounce fonksiyonu
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Kullanıcı arama fonksiyonu
async function searchUsers(query) {
    try {
        const response = await fetch(`http://localhost:3000/api/auth/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Arama yapılırken bir hata oluştu');
        
        const users = await response.json();
        const searchResults = document.getElementById('searchResults');
        searchResults.innerHTML = '';

        if (!users || users.length === 0) {
            searchResults.innerHTML = '<div class="p-3 text-center text-muted">Kullanıcı bulunamadı</div>';
            return;
        }

        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'user-search-item';
            userElement.innerHTML = `
                <img src="${user.photoURL || 'img/default-avatar.png'}" 
                     alt="Profile" 
                     onerror="this.src='img/default-avatar.png'">
                <div class="user-info" style="font-family: 'Jura', sans-serif;">
                    <div class="user-email">${user.email || 'Misafir Kullanıcı'}</div>
                    <div class="user-id">${user.uid}</div>
                </div>
            `;

            userElement.addEventListener('click', () => {
                loadUserPageActivities(user.uid, user.email);
                updateUserTimeActivityChart(user.uid);
                
                const selectedUserInfo = document.getElementById('selectedUserInfo');
                const defaultText = selectedUserInfo.querySelector('.default-text');
                const userNameSpan = selectedUserInfo.querySelector('.selected-user-name');
                
                defaultText.style.display = 'none';
                userNameSpan.textContent = user.email;
                userNameSpan.style.display = 'inline';
            });

            searchResults.appendChild(userElement);
        });
    } catch (error) {
        console.error('Arama hatası:', error);
        const searchResults = document.getElementById('searchResults');
        searchResults.innerHTML = '<div class="p-3 text-center text-danger">Arama sırasında bir hata oluştu</div>';
    }
}

// Event listeners
document.getElementById('createTokenBtn').addEventListener('click', createToken);

// DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
    // DataTables başlatma
    usersTable = $('#usersTable').DataTable({
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.7/i18n/tr.json',
            paginate: {
                previous: "◄",
                next: "►"
            },
            info: "_TOTAL_ kayıttan _START_ - _END_ arası gösteriliyor",
            lengthMenu: "Sayfa başına _MENU_ kayıt göster",
            search: "Ara:"
        },
        dom: '<"top"lf>rt<"bottom"ip>', // DataTables yerleşim düzeni
        ordering: true,
        searching: true,
        responsive: true,
        pageLength: 10,
        lengthMenu: [[5, 10, 25, 50], [5, 10, 25, 50]],
        columnDefs: [
            {
                targets: 0, // Profil resmi kolonu
                orderable: false,
                className: 'text-center'
            },
            {
                targets: -1, // Son kolon (Durum)
                orderable: false,
                className: 'text-center'
            }
        ],
        createdRow: function(row, data, dataIndex) {
            $(row).addClass('align-middle');
            $(row).css('cursor', 'pointer');
        }
    });

    userDetailsTable = $('#userDetailsTable').DataTable({
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.7/i18n/tr.json'
        }
    });

    tokenTable = $('#tokenTable').DataTable({
        language: {
            emptyTable: "Token bulunmamaktadır",
            zeroRecords: "Eşleşen token bulunamadı"
        },
        dom: '', // Pagination'ı kaldır
        ordering: true,
        responsive: true,
        order: [[0, 'asc']],
        columnDefs: [
            {
                targets: 0, // Sıra no kolonu
                className: 'text-start',
                width: '5%'
            },
            {
                targets: 1, // Token kolonu
                className: 'font-monospace text-start',
                width: '20%'
            },
            {
                targets: 2, // Oluşturulma tarihi kolonu
                className: 'text-start',
                width: '20%'
            },
            {
                targets: 3, // Kullanım durumu kolonu
                className: 'text-start',
                width: '40%'
            },
            {
                targets: 4, // Durum kolonu
                className: 'text-start',
                width: '15%',
                orderable: false
            }
        ]
    });

    // Sayfa geçişleri
    document.querySelectorAll('#sidebar a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const pageId = this.getAttribute('data-page');
            
            // Aktif sayfa ve menü öğelerini güncelle
            document.querySelectorAll('.page-content').forEach(page => {
                page.classList.remove('active');
            });
            document.querySelector(`#${pageId}-page`).classList.add('active');
            
            document.querySelectorAll('#sidebar li').forEach(item => {
                item.classList.remove('active');
            });
            this.parentElement.classList.add('active');

            // Dashboard sayfası açıldığında grafikleri güncelle
            if (pageId === 'dashboard') {
                loadPageStats();
                updateTokenUsageChart();
            }
        });
    });

    // Kullanıcı seçimi
    $('#usersTable tbody').on('click', 'tr', function() {
        const data = usersTable.row(this).data();
        const userId = data[4]; // User ID kolonu
        const userName = `${data[1]} ${data[2]}`; // Ad ve Soyad
        
        // Seçili kullanıcı bilgisini güncelle
        const selectedUserInfo = document.getElementById('selectedUserInfo');
        const defaultText = selectedUserInfo.querySelector('.default-text');
        const userNameSpan = selectedUserInfo.querySelector('.selected-user-name');
        
        defaultText.style.display = 'none';
        userNameSpan.textContent = userName;
        userNameSpan.style.display = 'inline';

        // Seçili satırı vurgula
        if ($(this).hasClass('selected')) {
            $(this).removeClass('selected');
        } else {
            usersTable.$('tr.selected').removeClass('selected');
            $(this).addClass('selected');
        }

        // Her iki grafiği de güncelle
        loadUserPageActivities(userId, userName);
        updateUserTimeActivityChart(userId);
    });

    // Kullanıcı detaylarını yükle
    $('#usersTable tbody').on('click', 'tr', function() {
        const data = usersTable.row(this).data();
        const userId = data[0];
        
        const userActivitiesRef = ref(db, `user-activities/${userId}`);
        onValue(userActivitiesRef, (snapshot) => {
            const activities = snapshot.val();
            userDetailsTable.clear();
            
            for (let key in activities) {
                const activity = activities[key];
                userDetailsTable.row.add([
                    activity.action,
                    new Date(activity.timestamp).toLocaleString(),
                    activity.details || '-'
                ]);
            }
            
            userDetailsTable.draw();
        });
    });

    // Sayfa ilk yüklendiğinde dashboard aktif ise grafikleri yükle
    if (document.querySelector('#dashboard-page').classList.contains('active')) {
        loadPageStats();
        updateTokenUsageChart();
    }
    
    loadTokens();
    loadUsers();

    // Token display kapatma butonu
    document.querySelector('#newTokenDisplay .btn-close')?.addEventListener('click', function() {
        document.getElementById('newTokenDisplay').classList.add('d-none');
    });

    const searchInput = document.getElementById('userSearchInput');
    const debouncedSearch = debounce((query) => {
        if (query.length >= 3) {
            searchUsers(query);
        }
    }, 1000);

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query.length >= 3) {
            debouncedSearch(query);
        } else {
            document.getElementById('searchResults').innerHTML = '';
        }
    });
}); 