/**
 * Transparency Page Interactive Features
 */

// Global Chart nesneleri
let distributionChart = null;
let unlockRatioChart = null;

document.addEventListener('DOMContentLoaded', () => {
    initTransparencyElements();
});

// Grafikleri sayfada daha sonra da başlatabilmek için fonksiyonu ayrı tanımladım
function initTransparencyElements() {
    // Grafikler için Chart.js kütüphanesinin kontrolü
    if (typeof Chart !== 'undefined') {
        // Grafiklerin çizileceği canvas elemanları var mı kontrol edelim
        const tokenDistributionChartElement = document.getElementById('tokenDistributionChart');
        const unlockRatioChartElement = document.getElementById('unlockRatioChart');
        
        if (tokenDistributionChartElement) {
            renderDistributionChart();
            console.log('Token dağılım grafiği başlatıldı');
        } else {
            console.log('Token dağılım grafiği için canvas elemanı bulunamadı');
        }
        
        if (unlockRatioChartElement) {
            renderUnlockRatioChart();
            console.log('Kilit açma oranı grafiği başlatıldı');
        } else {
            console.log('Kilit açma oranı grafiği için canvas elemanı bulunamadı');
        }
    } else {
        console.error('Chart.js kütüphanesi bulunamadı! Kütüphaneyi yüklediğinizden emin olun.');
    }
    
    // Token kategorisi adres görüntüleme düğmesi 
    initAddressViewButtons();
    
    // Modal kontrolleri
    initModalControls();
    
    // Başlat butonuna tıklandığında scroll
    initGetStartedButton();
    
    // Token kategorisi görünürlüğü
    initTokenCategoryInteraction();
    
    // Açılışta tüm kategori açıklamalarını genişlet
    expandAllCategoryDescriptions();

    // Tema Yönetimi
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const htmlElement = document.documentElement;
    
    // Kayıtlı temayı kontrol et veya varsayılan tema olarak karanlık temayı ayarla
    const savedTheme = localStorage.getItem('tipbox-theme') || 'dark';
    htmlElement.setAttribute('data-theme', savedTheme);
    
    // Tema değiştirme işlevi
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = htmlElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            htmlElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('tipbox-theme', newTheme);
            
            // Tema değişimi sonrası grafikleri yeniden oluştur (biraz gecikme ile)
            setTimeout(() => {
                renderDistributionChart();
                renderUnlockRatioChart();
            }, 100); // Küçük bir gecikme ile tema değişiminin tamamlanmasını bekle
        });
    }
}

/**
 * Token dağılımı grafiğini oluştur
 */
function renderDistributionChart() {
    // Eğer önceki bir grafik varsa, yeni oluşturmadan önce yok et
    if (distributionChart) {
        distributionChart.destroy();
    }

    const ctx = document.getElementById('tokenDistributionChart');
    
    if (!ctx) {
        console.error('Dağılım grafiği için canvas bulunamadı!');
        return;
    }
    
    const isDark = isDarkMode();
    
    // Kategori verileri - Ekran görüntüsüne uygun dağılım
    const data = {
        labels: ['Reward Farming', 'Strategic Investors', 'Development', 'Ecosystem', 'Staking', 'Liquidity', 'Reserve', 'Advisors'],
        datasets: [{
            data: [40, 15, 15, 10, 10, 5, 4, 1],
            backgroundColor: [
                '#7986CB', // Ödül Çiftçiliği - Mor-mavi
                '#4f71e7', // Stratejik Yatırımcılar - Mavi
                '#a56bfc', // Geliştirme - Mor
                '#64FFDA', // Ekosistem - Turkuaz
                '#FFA726', // Staking - Turuncu
                '#5CD6B1', // Likidite - Yeşil
                '#EF5350', // Rezerv - Kırmızı
                '#80DEEA'  // Danışmanlar - Açık Mavi
            ],
            borderWidth: 0,
            hoverOffset: 15
        }]
    };
    
    // Pasta grafiği oluştur - Ekran görüntüsüne uygun
    distributionChart = new Chart(ctx, {
        type: 'pie',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: 20
            },
            plugins: {
                legend: {
                    display: false // Efsaneyi gizle, sağ tarafta zaten gösteriyoruz
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                    titleColor: isDark ? '#FFFFFF' : '#000000',
                    bodyColor: isDark ? '#FFFFFF' : '#000000',
                    bodyFont: {
                        family: "'Jura', sans-serif",
                        size: 14
                    },
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: %${context.raw}`;
                        }
                    }
                }
            },
            elements: {
                arc: {
                    borderWidth: 0,
                }
            },
            cutout: '0%' // Tam pasta dilimi
        }
    });
}

/**
 * Kilit açma oranı grafiğini oluştur
 */
function renderUnlockRatioChart() {
    // Eğer önceki bir grafik varsa, yeni oluşturmadan önce yok et
    if (unlockRatioChart) {
        unlockRatioChart.destroy();
    }

    const ctx = document.getElementById('unlockRatioChart');
    
    if (!ctx) {
        console.error('Kilit açma grafiği için canvas bulunamadı!');
        return;
    }
    
    const isDark = isDarkMode();
    const textColor = isDark ? '#F8FAFC' : '#334155';
    const gridColor = isDark ? 'rgba(248, 250, 252, 0.1)' : 'rgba(51, 65, 85, 0.1)';
    
    // Gelecek 24 ay için etiketler oluştur
    const labels = generateMonthLabels(24);
    
    // Yığın veri setleri
    const datasets = [
        {
            label: 'Treasury',
            data: generateStackedData(24, 25, 1.2),
            backgroundColor: isDark ? '#3B82F6' : '#60A5FA'
        },
        {
            label: 'Founders',
            data: generateStackedData(24, 20, 0.8),
            backgroundColor: isDark ? '#10B981' : '#34D399'
        },
        {
            label: 'Ecosystem',
            data: generateStackedData(24, 15, 1.0),
            backgroundColor: isDark ? '#F59E0B' : '#FBBF24'
        },
        {
            label: 'Advisors',
            data: generateStackedData(24, 10, 1.5),
            backgroundColor: isDark ? '#EC4899' : '#F472B6'
        },
        {
            label: 'Community',
            data: generateStackedData(24, 20, 0.9),
            backgroundColor: isDark ? '#8B5CF6' : '#A78BFA'
        },
        {
            label: 'Staking Rewards',
            data: generateStackedData(24, 10, 1.1),
            backgroundColor: isDark ? '#F43F5E' : '#FB7185'
        }
    ];
    
    // Yığın grafiği oluştur
    unlockRatioChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    grid: {
                        color: gridColor,
                        borderColor: gridColor,
                        tickColor: gridColor
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            family: "'Inter', sans-serif",
                            size: 10
                        }
                    }
                },
                y: {
                    stacked: true,
                    grid: {
                        color: gridColor,
                        borderColor: gridColor,
                        tickColor: gridColor
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            family: "'Inter', sans-serif",
                            size: 12
                        },
                        callback: function(value) {
                            return '%' + value;
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            family: "'Inter', sans-serif",
                            size: 12
                        },
                        color: textColor,
                        boxWidth: 12,
                        padding: 12
                    }
                },
                tooltip: {
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    titleColor: textColor,
                    bodyColor: textColor,
                    bodyFont: {
                        family: "'Inter', sans-serif",
                        size: 12
                    },
                    displayColors: true,
                    borderColor: gridColor,
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: %${context.raw}`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Ay etiketleri oluştur
 */
function generateMonthLabels(months) {
    const labels = [];
    const now = new Date();
    
    for (let i = 0; i < months; i++) {
        const date = new Date(now);
        date.setMonth(now.getMonth() + i);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
    }
    
    return labels;
}

/**
 * Örnekler için yığın verileri oluştur
 */
function generateStackedData(months, maxValue, factor) {
    const data = [];
    
    for (let i = 0; i < months; i++) {
        // Yükselen bir eğri oluşturmak için logaritmik artış
        const value = Math.round((Math.log(i + 1) / Math.log(months)) * maxValue * factor * 100) / 100;
        data.push(Math.min(value, maxValue));
    }
    
    return data;
}

/**
 * Adres görüntüleme düğmeleri
 */
function initAddressViewButtons() {
    const addressButtons = document.querySelectorAll('.view-address a');
    
    addressButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const address = this.dataset.address || '0x1234567890abcdef1234567890abcdef12345678';
            alert(`This feature is not implemented yet. Address to be displayed: ${address}`);
        });
    });
}

/**
 * Modal popup kontrollerini başlatır
 */
function initModalControls() {
    const openModalBtns = document.querySelectorAll('.open-modal');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const modals = document.querySelectorAll('.modal');
    
    openModalBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetModal = document.getElementById(this.dataset.modal);
            if (targetModal) {
                targetModal.classList.add('active');
                document.body.style.overflow = 'hidden'; // Sayfanın kaydırılmasını engelle
            }
        });
    });
    
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
                document.body.style.overflow = ''; // Sayfa kaydırmayı geri etkinleştir
            }
        });
    });
    
    // Modal dışı tıklamada kapatma
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
    
    // ESC tuşu ile kapatma
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            modals.forEach(modal => {
                if (modal.classList.contains('active')) {
                    modal.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        }
    });
}

/**
 * "Hadi Başlayalım" butonuna tıklandığında token dağılımı bölümüne smooth scroll
 */
function initGetStartedButton() {
    const getStartedBtn = document.querySelector('.get-started-btn button');
    
    if (!getStartedBtn) return;
    
    getStartedBtn.addEventListener('click', (e) => {
        // Modal açılması için varsayılan davranışı engelleme
        // e.preventDefault();
        
        // Smooth scroll
        const tokenDistributionSection = document.querySelector('.token-distribution-section');
        
        if (tokenDistributionSection) {
            // Scroll işlemi 300ms sonra yapılıyor, böylece modal açılma animasyonu tamamlandıktan sonra scroll başlıyor
            setTimeout(() => {
                tokenDistributionSection.scrollIntoView({ 
                    behavior: 'smooth' 
                });
            }, 300);
        }
    });
}

/**
 * Token kategorilerine tıklandığında detayları göster/gizle
 */
function initTokenCategoryInteraction() {
    const tokenCategories = document.querySelectorAll('.token-category');
    
    tokenCategories.forEach(category => {
        const header = category.querySelector('.category-header');
        const description = category.querySelector('.category-description');
        
        if (header && description) {
            header.style.cursor = 'pointer';
            
            header.addEventListener('click', () => {
                description.classList.toggle('expanded');
                
                // Header'a tıklandığında ikon değişimi eklenebilir
                const icon = header.querySelector('.toggle-icon');
                if (icon) {
                    icon.classList.toggle('active');
                }
            });
        }
    });
}

/**
 * Sayfa yüklendiğinde tüm kategori açıklamalarını genişlet
 */
function expandAllCategoryDescriptions() {
    const descriptions = document.querySelectorAll('.category-description');
    
    descriptions.forEach(description => {
        description.classList.add('expanded');
    });
}

/**
 * Modal içinde görüntülenecek veri için
 */
function loadTokenData() {
    // Bu fonksiyon gerçek bir uygulamada API'den verileri çekebilir
    // Örnek için sabit veriler kullanıyoruz
    
    // Token verilerini göster
    updateTokenMetrics({
        unlockedSupply: 0,
        circulatingSupply: 0,
        totalSupply: 100000000,
        categories: [
            {
                name: 'Ödül Çiftçiliği',
                percentage: 40,
                unlockedPercentage: 0,
                circulatingPercentage: 0,
                circulatingAmount: 0,
                address: '0x1234...'
            },
            {
                name: 'Stratejik Yatırımcılar',
                percentage: 15,
                unlockedPercentage: 0,
                circulatingPercentage: 0,
                circulatingAmount: 0,
                address: '0x5678...'
            },
            // Diğer kategoriler buraya eklenebilir
        ]
    });
}

/**
 * Token metriklerini güncelleme
 */
function updateTokenMetrics(data) {
    // Burada gerçek bir uygulamada DOM elementlerini güncellemek için
    // API'den gelen veri kullanılacaktır
    console.log('Token metrics updated with:', data);
}

/**
 * Mevcut tema karanlık mı kontrolü
 */
function isDarkMode() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
}

// Sayfa kaydırma butonları
document.addEventListener('DOMContentLoaded', function() {
    const scrollLinks = document.querySelectorAll('a.scroll-link');
    
    scrollLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                window.scrollTo({
                    top: targetSection.offsetTop - 100,
                    behavior: 'smooth'
                });
            }
        });
    });
});

// Kategori açıklamalarını tıklamada göster/gizle
document.addEventListener('DOMContentLoaded', function() {
    const categoryDescriptions = document.querySelectorAll('.category-description');
    const categoryCards = document.querySelectorAll('.token-category-card');
    
    categoryCards.forEach(card => {
        card.addEventListener('click', function() {
            const description = this.querySelector('.category-description');
            if (description) {
                description.classList.toggle('expanded');
            }
        });
    });
});

// Tema değişikliğinde grafikleri güncelle
function updateChartsForTheme(theme) {
    // Grafik nesnelerine erişip onları yeniden oluştur
    renderDistributionChart();
    renderUnlockRatioChart();
}

/**
 * Tüm grafikleri yenile
 */
function refreshAllCharts() {
    if (distributionChart) {
        distributionChart.update();
    }
    
    if (unlockRatioChart) {
        unlockRatioChart.update();
    }
} 