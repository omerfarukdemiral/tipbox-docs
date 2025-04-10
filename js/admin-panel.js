// Admin Panel JavaScript
// Firebase servis modülünü import et
import firebaseService from './firebase-service.js';

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Wait for DOM content to be loaded before initializing the admin panel
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    auth.onAuthStateChanged(function(user) {
        if (user) {
            // User is signed in, initialize admin panel
            initializeAdminPanel();
            initializeNavigation();
            loadPageViewsData();
        } else {
            // No user is signed in, redirect to login page
            window.location.href = 'index.html';
        }
    });
});

// Module import'u çalışmadığında kullanılacak alternatif yöntem
if (typeof firebaseService === 'undefined') {
    document.addEventListener('firebase-service-ready', (event) => {
        console.log('Firebase servisi event ile alındı, Admin Panel başlatılıyor...');
        // Olay ile gelen Firebase servisini al
        window.firebaseServiceInstance = event.detail;
        initializeAdminPanel();
    });
}

// Admin paneli başlat
function initializeAdminPanel() {
    // Get user statistics
    db.collection('users').get().then(snapshot => {
        const totalUsers = snapshot.size;
        document.getElementById('totalUsers').textContent = totalUsers;
    }).catch(error => {
        console.error("Error getting user statistics: ", error);
    });

    // Get project statistics
    db.collection('projects').get().then(snapshot => {
        const totalProjects = snapshot.size;
        document.getElementById('totalProjects').textContent = totalProjects;
    }).catch(error => {
        console.error("Error getting project statistics: ", error);
    });

    // Get active projects (projects with status "active")
    db.collection('projects').where('status', '==', 'active').get().then(snapshot => {
        const activeProjects = snapshot.size;
        document.getElementById('activeProjects').textContent = activeProjects;
    }).catch(error => {
        console.error("Error getting active project statistics: ", error);
    });

    // Display current admin information
    const currentUser = auth.currentUser;
    if (currentUser) {
        document.getElementById('adminName').textContent = currentUser.displayName || currentUser.email;
        document.getElementById('adminEmail').textContent = currentUser.email;
    }
}

// Navigasyon işlevselliğini başlat
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const contentSections = document.querySelectorAll('.content-section');

    // Handle navigation link clicks
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get the target content section id from the link's href
            const targetId = this.getAttribute('href').substring(1);
            
            // Remove active class from all links and add to the clicked one
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            this.classList.add('active');
            
            // Hide all content sections and show the target one
            contentSections.forEach(section => {
                section.style.display = 'none';
            });
            document.getElementById(targetId).style.display = 'block';
        });
    });
}

// Çıkış işlevi
function logout() {
    auth.signOut().then(() => {
        // Sign-out successful, redirect to login page
        window.location.href = 'index.html';
    }).catch((error) => {
        // An error happened
        console.error("Logout Error: ", error);
    });
}

// Add event listener to logout button
document.getElementById('logoutBtn').addEventListener('click', logout);

// Sayfa görüntüleme verilerini yükle ve grafiği oluştur
function loadPageViewsData() {
    // Get current date and date from 7 days ago
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    // Format dates for Firestore query
    const todayStr = today.toISOString().split('T')[0];
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    
    // Query Firestore for page views from the last 7 days
    db.collection('pageViews')
        .where('timestamp', '>=', sevenDaysAgoStr)
        .where('timestamp', '<=', todayStr)
        .get()
        .then(snapshot => {
            // Group page views by date
            const pageViewsByDate = {};
            
            // Initialize all dates in the range with 0 count
            for (let i = 0; i < 7; i++) {
                const date = new Date();
                date.setDate(today.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                pageViewsByDate[dateStr] = 0;
            }
            
            // Count page views for each date
            snapshot.forEach(doc => {
                const data = doc.data();
                const date = data.timestamp.split('T')[0];
                
                if (pageViewsByDate[date] !== undefined) {
                    pageViewsByDate[date]++;
                }
            });
            
            // Create chart with the page views data
            createPageViewsChart(pageViewsByDate);
            
        }).catch(error => {
            console.error("Error getting page views: ", error);
        });
}

// Create a chart to display page views over time
function createPageViewsChart(pageViewsData) {
    // Get dates and counts from the data
    const dates = Object.keys(pageViewsData).sort();
    const counts = dates.map(date => pageViewsData[date]);
    
    // Format dates for display (e.g., "Jan 01")
    const formattedDates = dates.map(date => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    });
    
    // Get the canvas element
    const ctx = document.getElementById('pageViewsChart').getContext('2d');
    
    // Create the chart using Chart.js
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: formattedDates,
            datasets: [{
                label: 'Page Views',
                data: counts,
                backgroundColor: 'rgba(111, 66, 193, 0.2)',
                borderColor: '#6f42c1',
                borderWidth: 2,
                pointBackgroundColor: '#6f42c1',
                pointRadius: 4,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            }
        }
    });
}

// Load user activity data
function loadUserActivityData() {
    db.collection('users')
        .orderBy('lastLogin', 'desc')
        .limit(10)
        .get()
        .then(snapshot => {
            const tableBody = document.getElementById('userActivityTableBody');
            tableBody.innerHTML = '';
            
            snapshot.forEach(doc => {
                const userData = doc.data();
                const row = document.createElement('tr');
                
                // Format the date
                const lastLogin = userData.lastLogin ? new Date(userData.lastLogin).toLocaleString() : 'Never';
                
                row.innerHTML = `
                    <td>${userData.displayName || userData.email || 'Unknown'}</td>
                    <td>${userData.email || 'N/A'}</td>
                    <td>${lastLogin}</td>
                    <td>${userData.pageViews || 0}</td>
                    <td>
                        <span class="badge ${userData.isActive ? 'badge-success' : 'badge-danger'}">
                            ${userData.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                `;
                
                tableBody.appendChild(row);
            });
        })
        .catch(error => {
            console.error("Error loading user activity data: ", error);
        });
}

// Call loadUserActivityData when the Users tab is clicked
document.querySelector('a[href="#users"]').addEventListener('click', loadUserActivityData);

// Initialize token generator functionality
document.getElementById('generateTokenBtn').addEventListener('click', function() {
    // Generate a random token
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Display the token
    document.getElementById('tokenDisplay').textContent = token;
    
    // Enable the copy button
    document.getElementById('copyTokenBtn').disabled = false;
});

// Copy token to clipboard
document.getElementById('copyTokenBtn').addEventListener('click', function() {
    const token = document.getElementById('tokenDisplay').textContent;
    
    navigator.clipboard.writeText(token).then(() => {
        // Show success message
        alert('Token copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy token: ', err);
    });
});

// Admin rolü kontrolü
async function checkAdminRole(user) {
    try {
        const enhancedUser = await window.enhanceUserWithFirestoreData(user);
        if (enhancedUser.role !== 'admin') {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    } catch (error) {
        console.error('Admin rolü kontrolünde hata:', error);
        window.location.href = 'index.html';
        return false;
    }
}

// Admin bilgilerini yükle
async function loadAdminInfo(user) {
    try {
        const enhancedUser = await window.enhanceUserWithFirestoreData(user);
        document.getElementById('adminName').textContent = enhancedUser.displayName || 'Admin User';
        document.getElementById('adminEmail').textContent = enhancedUser.email;
    } catch (error) {
        console.error('Admin bilgileri yüklenirken hata:', error);
    }
}

// İstatistikleri yükle
async function loadStatistics() {
    try {
        const fbService = firebaseService || window.firebaseServiceInstance;
        const { collections } = fbService;
        
        // Toplam kullanıcı sayısı
        const totalUsersSnapshot = await collections.users.get();
        document.getElementById('totalUsers').textContent = totalUsersSnapshot.size;

        // Son 24 saatte aktif kullanıcılar
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const activeUsersSnapshot = await collections.users
            .where('lastLoginAt', '>', yesterday)
            .get();
        document.getElementById('activeUsers').textContent = activeUsersSnapshot.size;

        // Bugün kayıt olan kullanıcılar
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const newUsersSnapshot = await collections.users
            .where('createdAt', '>', today)
            .get();
        document.getElementById('newUsers').textContent = newUsersSnapshot.size;

    } catch (error) {
        console.error('İstatistikler yüklenirken hata:', error);
    }
}

// Grafikleri başlat
async function initializeCharts() {
    await initializePageViewsChart();
    await loadTokensTable();
    await loadUsersTable();
    await loadPageViewsStats();
}

// Sayfa görüntülenme grafiği
async function initializePageViewsChart() {
    try {
        const db = firebase.firestore();
        const pageViewsRef = db.collection('pageViews');
        const snapshot = await pageViewsRef.orderBy('timestamp', 'desc').limit(7).get();
        
        const labels = [];
        const data = {};
        
        // Sayfa isimlerini ve verileri topla
        snapshot.docs.reverse().forEach(doc => {
            const date = new Date(doc.data().timestamp.toDate()).toLocaleDateString();
            labels.push(date);
            
            Object.entries(doc.data().views).forEach(([page, count]) => {
                if (!data[page]) {
                    data[page] = [];
                }
                data[page].push(count);
            });
        });

        // Grafik datasını oluştur
        const datasets = Object.entries(data).map(([page, counts], index) => ({
            label: page,
            data: counts,
            borderColor: getChartColor(index),
            tension: 0.4
        }));

        // Grafiği oluştur
        new Chart(document.getElementById('pageViewsChart'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Page Views Last 7 Days'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    } catch (error) {
        console.error('Sayfa görüntülenme grafiği oluşturulurken hata:', error);
    }
}

// Panoya kopyala
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => {
            // Başarı mesajı göster
            showToast('Token kopyalandı!', 'success');
        })
        .catch(err => {
            console.error('Kopyalama hatası:', err);
            showToast('Kopyalama hatası!', 'danger');
        });
}

// Geçici toast mesajı göster
function showToast(message, type = 'info') {
    // Eğer sayfada daha önce oluşturulmuş bir toast varsa, kaldır
    const existingToast = document.querySelector('.custom-toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Yeni toast oluştur
    const toast = document.createElement('div');
    toast.className = `custom-toast toast show position-fixed bg-${type} text-white`;
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = '9999';
    toast.style.minWidth = '250px';
    
    toast.innerHTML = `
        <div class="toast-header bg-${type} text-white">
            <strong class="me-auto">Bildirim</strong>
            <button type="button" class="btn-close btn-close-white" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // 3 saniye sonra otomatik kapat
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Token arama ve filtreleme değişkenleri
let currentFilter = 'all';
let tokenList = []; // Global olarak token listesini tut

// Pagination değişkenleri
let currentPage = 1;
const tokensPerPage = 20;
let totalPages = 1;
let totalTokens = 0;

// Token tablosunu yükle
async function loadTokensTable() {
    try {
        const db = firebase.firestore();
        const tokensRef = db.collection('guestTokens');
        // Limit olmadan tüm verileri çek - daha sonra JavaScript'te sayfalandırma yapacağız
        const snapshot = await tokensRef.orderBy('createdAt', 'desc').get();
        
        const tableBody = document.getElementById('tokensTableBody');
        tableBody.innerHTML = '';
        
        if (snapshot.empty) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="6" class="text-center">Henüz hiç token oluşturulmamış.</td>';
            tableBody.appendChild(row);
            document.getElementById('noTokensMessage').style.display = 'none';
            document.querySelector('.pagination').style.display = 'none';
            document.getElementById('paginationInfo').textContent = '0-0 / 0';
            tokenList = [];
            return;
        }
        
        // Tüm verileri bir diziye alıp kullanım sayısına göre sıralayalım
        tokenList = [];
        snapshot.docs.forEach(doc => {
            const tokenData = doc.data();
            const tokenId = doc.id;
            
            // Kullanım oranını hesapla
            const usageCount = tokenData.usageCount !== undefined ? tokenData.usageCount : 0;
            const maxUsageCount = tokenData.maxUsageCount !== undefined ? tokenData.maxUsageCount : 20;
            
            tokenList.push({
                id: tokenId,
                data: tokenData,
                usageCount: usageCount,
                maxUsageCount: maxUsageCount
            });
        });
        
        // Kullanım sayısına göre AZALAN sırada sırala (çok kullanılandan az kullanılana)
        tokenList.sort((a, b) => b.usageCount - a.usageCount);
        
        // Pagination bilgilerini güncelle
        totalTokens = tokenList.length;
        totalPages = Math.ceil(totalTokens / tokensPerPage);
        
        // Pagination kontrollerini güncelle
        updatePaginationControls();
        
        // Filtreleme ve arama uygula
        applyFiltersAndSearch();
        
    } catch (error) {
        console.error('Token tablosu yüklenirken hata:', error);
        const tableBody = document.getElementById('tokensTableBody');
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Hata: ${error.message}</td></tr>`;
        document.getElementById('noTokensMessage').style.display = 'none';
        document.querySelector('.pagination').style.display = 'none';
        tokenList = [];
    }
}

// Pagination kontrollerini güncelle
function updatePaginationControls() {
    // Pagination bilgilerini güncelle
    const startIdx = (currentPage - 1) * tokensPerPage + 1;
    const endIdx = Math.min(currentPage * tokensPerPage, totalTokens);
    
    // Pagination bilgi metnini güncelle
    document.getElementById('paginationInfo').textContent = `${startIdx}-${endIdx} / ${totalTokens}`;
    
    // Sayfa numaralarını güncelle
    let pageStart = Math.max(1, currentPage - 1);
    let pageEnd = Math.min(totalPages, pageStart + 2);
    
    // Yeterli sayfa yoksa başlangıç değerini ayarla
    if (pageEnd - pageStart < 2) {
        pageStart = Math.max(1, pageEnd - 2);
    }
    
    // Sayfa numaralarını güncelle
    const pageElements = document.querySelectorAll('[id^="page"]');
    for (let i = 0; i < pageElements.length; i++) {
        const pageNum = pageStart + i;
        const pageEl = pageElements[i];
        
        if (pageNum <= totalPages) {
            const pageLink = pageEl.querySelector('a');
            if (!pageLink) {
                console.error(`Sayfa ${pageNum} için 'a' elementi bulunamadı`);
                continue; // Bu sayfa için döngüyü atla
            }
            
            pageLink.textContent = pageNum;
            pageEl.classList.remove('d-none');
            pageEl.classList.toggle('active', pageNum === currentPage);
            pageLink.onclick = function() { goToPage(pageNum); };
        } else {
            pageEl.classList.add('d-none');
        }
    }
    
    // Önceki/sonraki butonları güncelle
    document.getElementById('prevPage').classList.toggle('disabled', currentPage === 1);
    document.getElementById('nextPage').classList.toggle('disabled', currentPage === totalPages);
    
    // Toplam sayfa sayısı 1'den azsa pagination'ı gizle
    document.querySelector('.pagination').style.display = totalPages <= 1 ? 'none' : 'flex';
}

// Belirli bir sayfaya git
function goToPage(pageNum) {
    if (pageNum < 1 || pageNum > totalPages) return;
    
    currentPage = pageNum;
    updatePaginationControls();
    applyFiltersAndSearch();
}

// Önceki/sonraki sayfaya git
function changePage(direction) {
    if (direction === 'prev' && currentPage > 1) {
        goToPage(currentPage - 1);
    } else if (direction === 'next' && currentPage < totalPages) {
        goToPage(currentPage + 1);
    }
}

// Filtreleme ve arama uygula
function applyFiltersAndSearch() {
    const tableBody = document.getElementById('tokensTableBody');
    tableBody.innerHTML = '';
    
    const searchText = document.getElementById('tokenSearch').value.toLowerCase();
    
    // Filtreleme ve arama uygula
    let filteredTokens = tokenList.filter(token => {
        // Durum filtresini uygula
        if (currentFilter === 'active' && !token.data.isActive) return false;
        if (currentFilter === 'inactive' && token.data.isActive) return false;
        
        // Arama metnini uygula
        if (searchText && !token.id.toLowerCase().includes(searchText)) return false;
        
        return true;
    });
    
    // Filtrelenmiş token sayısını güncelle
    const filteredTotal = filteredTokens.length;
    
    // Eğer sonuç yoksa mesaj göster
    if (filteredTokens.length === 0) {
        document.getElementById('noTokensMessage').style.display = 'block';
        document.querySelector('.pagination').style.display = 'none';
        document.getElementById('paginationInfo').textContent = `0-0 / 0`;
        return;
    } else {
        document.getElementById('noTokensMessage').style.display = 'none';
    }
    
    // Toplam sayfa sayısını güncelle
    totalPages = Math.ceil(filteredTotal / tokensPerPage);
    
    // Eğer mevcut sayfa toplam sayfa sayısından büyükse, son sayfaya git
    if (currentPage > totalPages) {
        currentPage = totalPages;
    }
    
    // Pagination bilgilerini güncelle
    updatePaginationControls();
    
    // Gösterilecek token aralığını hesapla
    const startIdx = (currentPage - 1) * tokensPerPage;
    const endIdx = Math.min(startIdx + tokensPerPage, filteredTotal);
    
    // Pagination bilgi metnini güncelle
    document.getElementById('paginationInfo').textContent = `${startIdx + 1}-${endIdx} / ${filteredTotal}`;
    
    // Sadece mevcut sayfada gösterilecek tokenleri al
    const pageTokens = filteredTokens.slice(startIdx, endIdx);
    
    // Sonuçları tabloya ekle
    pageTokens.forEach((token, index) => {
        const tokenId = token.id;
        const tokenData = token.data;
        
        // Tarih formatla
        const createdAt = tokenData.createdAt ? new Date(tokenData.createdAt.toDate()) : new Date();
        const createdAtFormatted = createdAt.toLocaleDateString() + ' ' + createdAt.toLocaleTimeString();
        
        // Kullanım oranı
        const usageCount = token.usageCount;
        const maxUsageCount = token.maxUsageCount;
        const usagePercentage = maxUsageCount > 0 ? Math.round((usageCount / maxUsageCount) * 100) : 0;
        
        // Durum sınıfı
        let statusClass = 'success';
        if (usagePercentage >= 100) {
            statusClass = 'danger';
        } else if (usagePercentage > 75) {
            statusClass = 'warning';
        }
        
        // Aktif durumu
        const isActive = tokenData.isActive !== undefined ? tokenData.isActive : true;
        
        // Sıra numarası
        const rowNumber = startIdx + index + 1;
        
        const row = document.createElement('tr');
        row.className = 'align-middle'; // Dikey ortalama
        row.innerHTML = `
            <td class="text-center fw-bold">
                ${rowNumber}
            </td>
            <td class="text-center">
                <span class="font-monospace fw-bold">${tokenId}</span>
                <button class="btn btn-sm btn-outline-secondary ms-2" onclick="copyToClipboard('${tokenId}')">
                    <i class="fas fa-copy"></i>
                </button>
            </td>
            <td class="text-center">${createdAtFormatted}</td>
            <td>
                <div class="d-flex align-items-center justify-content-center">
                    <div class="progress flex-grow-1 mx-2" style="max-width: 150px;">
                        <div class="progress-bar bg-${statusClass}" 
                            role="progressbar" 
                            style="width: ${usagePercentage}%" 
                            aria-valuenow="${usagePercentage}" 
                            aria-valuemin="0" 
                            aria-valuemax="100">
                        </div>
                    </div>
                    <span class="ms-2 fw-bold">${usageCount} / ${maxUsageCount}</span>
                </div>
            </td>
            <td class="text-center">
                <span class="badge bg-${isActive ? 'success' : 'danger'} rounded-pill">
                    ${isActive ? 'Aktif' : 'Pasif'}
                </span>
            </td>
            <td class="text-center">
                <button class="btn btn-sm ${isActive ? 'btn-outline-danger' : 'btn-outline-success'} rounded-pill" 
                        onclick="toggleTokenStatus('${tokenId}', ${!isActive})">
                    <i class="fas fa-${isActive ? 'ban' : 'check'} me-1"></i>
                    ${isActive ? 'Devre Dışı Bırak' : 'Aktifleştir'}
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Token araması
function filterTokens() {
    currentPage = 1; // Arama yapıldığında ilk sayfaya dön
    applyFiltersAndSearch();
}

// Durum filtresi
function filterByStatus(status) {
    // Aktif butonu güncelle
    const buttons = ['filter-all', 'filter-active', 'filter-inactive'];
    buttons.forEach(id => {
        document.getElementById(id).classList.remove('active');
    });
    document.getElementById(`filter-${status}`).classList.add('active');
    
    // Filtre durumunu güncelle ve uygula
    currentFilter = status;
    currentPage = 1; // Filtreleme yapıldığında ilk sayfaya dön
    applyFiltersAndSearch();
}

// Yeni token oluştur
function generateNewToken() {
    const generatedTokenElement = document.getElementById('generatedToken');
    const saveTokenBtn = document.getElementById('saveTokenBtn');
    
    if (!generatedTokenElement || !saveTokenBtn) {
        console.error('Token elementleri bulunamadı!');
        return;
    }
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < 8; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    generatedTokenElement.textContent = token;
    saveTokenBtn.disabled = false;
}

// Token durumunu değiştir
async function toggleTokenStatus(tokenId, newStatus) {
    try {
        const db = firebase.firestore();
        await db.collection('guestTokens').doc(tokenId).update({
            isActive: newStatus
        });
        
        // Tabloyu yeniden yükle (sayfa numarasını koruyarak)
        await loadTokensTable();
        
        // Bildirim göster
        showToast(`Token ${newStatus ? 'aktifleştirildi' : 'devre dışı bırakıldı'}!`, newStatus ? 'success' : 'danger');
    } catch (error) {
        console.error('Token durumu değiştirilirken hata:', error);
        showToast('İşlem sırasında bir hata oluştu!', 'danger');
    }
}

// Token'ı kaydet
async function saveToken() {
    try {
        const generatedTokenElement = document.getElementById('generatedToken');
        const saveTokenBtn = document.getElementById('saveTokenBtn');
        
        if (!generatedTokenElement) {
            console.error('generatedToken elementi bulunamadı!');
            return;
        }
        
        const token = generatedTokenElement.textContent;
        if (token === '--------') return;

        const db = firebase.firestore();
        await db.collection('guestTokens').doc(token).set({
            token: token,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: firebase.auth().currentUser.uid,
            usageCount: 0,
            maxUsageCount: 20,
            isActive: true
        });

        // Token'ı sıfırla ve tabloyu güncelle
        generatedTokenElement.textContent = '--------';
        if (saveTokenBtn) saveTokenBtn.disabled = true;
        
        // Yeni eklenen tokenların görünmesi için ilk sayfaya git
        currentPage = 1;
        await loadTokensTable();

        showToast('Token başarıyla kaydedildi!', 'success');
    } catch (error) {
        console.error('Token kaydedilirken hata:', error);
        showToast('Token kaydedilirken bir hata oluştu!', 'danger');
    }   
}

// Grafik renkleri için yardımcı fonksiyon
function getChartColor(index) {
    const colors = [
        '#6f42c1', // Primary Purple
        '#4B2D83', // Dark Purple
        '#8B5CF6', // Light Purple
        '#7E3AF2', // Hover Purple
        '#DC3545', // Danger
        '#198754', // Success
        '#0dcaf0', // Info
        '#ffc107'  // Warning
    ];
    return colors[index % colors.length];
}

// Toplu token oluştur (20 adet)
async function generateBulkTokens() {
    // Modal ile kullanıcıdan onay al
    showConfirmModal(
        'Token Oluşturma Onayı', 
        '20 adet yeni token oluşturmak istediğinizden emin misiniz?',
        async () => {
            try {
                const bulkTokenResult = document.getElementById('bulkTokenResult');
                const generatedTokensContainer = document.getElementById('generatedTokensContainer');
                const generatedTokensList = document.getElementById('generatedTokensList');
                
                if (!bulkTokenResult || !generatedTokensContainer || !generatedTokensList) {
                    console.error('Toplu token oluşturma elementleri bulunamadı!');
                    return;
                }
                
                bulkTokenResult.textContent = "Tokenlar oluşturuluyor...";
                bulkTokenResult.classList.remove('text-success', 'text-danger');
                generatedTokensContainer.style.display = 'none';
                
                // API isteği gönder
                const response = await fetch('http://localhost:3000/auth/create-bulk-tokens', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Token oluşturma hatası');
                }
                
                const data = await response.json();
                console.log('Oluşturulan tokenlar:', data.tokens);
                
                // Token listesini göster
                generatedTokensList.innerHTML = '';
                data.tokens.forEach(token => {
                    const listItem = document.createElement('li');
                    listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
                    listItem.textContent = token;
                    
                    // Kopyalama butonu
                    const copyButton = document.createElement('button');
                    copyButton.className = 'btn btn-sm btn-outline-primary';
                    copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                    copyButton.onclick = () => {
                        navigator.clipboard.writeText(token);
                        copyButton.innerHTML = '<i class="fas fa-check"></i>';
                        setTimeout(() => {
                            copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                        }, 1000);
                    };
                    
                    listItem.appendChild(copyButton);
                    generatedTokensList.appendChild(listItem);
                });
                
                // Başarı mesajı ve token listesini göster
                bulkTokenResult.textContent = "20 adet token başarıyla oluşturuldu!";
                bulkTokenResult.classList.add('text-success');
                generatedTokensContainer.style.display = 'block';
                
                // Yeni eklenen tokenleri görmek için ilk sayfaya git
                currentPage = 1;
                await loadTokensTable();
                
                showToast('20 adet token başarıyla oluşturuldu!', 'success');
                
            } catch (error) {
                console.error('Toplu token oluşturma hatası:', error);
                const bulkTokenResult = document.getElementById('bulkTokenResult');
                if (bulkTokenResult) {
                    bulkTokenResult.textContent = `Hata: ${error.message}`;
                    bulkTokenResult.classList.add('text-danger');
                }
                showToast(`Token oluşturma hatası: ${error.message}`, 'danger');
            }
        }
    );
}

// Oluşturulan tokenları CSV olarak indir
function downloadTokensAsCsv() {
    const generatedTokensList = document.getElementById('generatedTokensList');
    
    if (!generatedTokensList) {
        console.error('generatedTokensList elementi bulunamadı!');
        return;
    }
    
    const tokens = Array.from(generatedTokensList.children).map(li => li.textContent.trim());
    
    if (tokens.length === 0) {
        showToast('İndirilecek token bulunamadı!', 'warning');
        return;
    }
    
    // CSV içeriğini oluştur
    const csvContent = "data:text/csv;charset=utf-8," 
        + "Token,Link\n" 
        + tokens.map(token => `${token},http://yourdomain.com/signin.html?token=${token}`).join("\n");
    
    // Dosyayı indir
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tokens_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Token listesi CSV olarak indirildi.', 'success');
}

// Onay modali göster
function showConfirmModal(title, message, confirmCallback) {
    // Eğer sayfada daha önce oluşturulmuş bir modal varsa, kaldır
    const existingModal = document.getElementById('confirmModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Modal HTML'ini oluştur
    const modalHTML = `
        <div class="modal fade" id="confirmModal" tabindex="-1" aria-labelledby="confirmModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="confirmModalLabel">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Kapat"></button>
                    </div>
                    <div class="modal-body">
                        ${message}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">İptal</button>
                        <button type="button" class="btn btn-primary" id="confirmModalYesBtn">Evet</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Modal elementini oluştur ve sayfaya ekle
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer.firstElementChild);
    
    // Modal nesnesini oluştur
    const modalElement = document.getElementById('confirmModal');
    const modal = new bootstrap.Modal(modalElement);
    
    // Onay butonuna tıklandığında
    document.getElementById('confirmModalYesBtn').addEventListener('click', function() {
        modal.hide();
        confirmCallback();
    });
    
    // Modal kapatıldığında
    modalElement.addEventListener('hidden.bs.modal', function() {
        modalElement.remove();
    });
    
    // Modalı göster
    modal.show();
}

// User arama ve filtreleme değişkenleri
let currentUserFilter = 'all';
let userList = []; // Global olarak kullanıcı listesini tut

// User pagination değişkenleri
let currentUserPage = 1;
const usersPerPage = 20;
let totalUserPages = 1;
let totalUsers = 0;

// Kullanıcı tablosunu yükle
async function loadUsersTable() {
    try {
        const db = firebase.firestore();
        const usersRef = db.collection('users');
        // Limit olmadan tüm verileri çek - daha sonra JavaScript'te sayfalandırma yapacağız
        const snapshot = await usersRef.orderBy('createdAt', 'desc').get();
        
        const tableBody = document.getElementById('usersTableBody');
        tableBody.innerHTML = '';
        
        if (snapshot.empty) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" class="text-center">Henüz hiç kullanıcı bulunmuyor.</td>';
            tableBody.appendChild(row);
            document.getElementById('noUsersMessage').style.display = 'none';
            document.querySelector('#users .pagination').style.display = 'none';
            document.getElementById('userPaginationInfo').textContent = '0-0 / 0';
            userList = [];
            return;
        }
        
        // Tüm verileri bir diziye alıp sıralayalım
        userList = [];
        snapshot.docs.forEach((doc, index) => {
            const userData = doc.data();
            const userId = doc.id;
            
            userList.push({
                id: userId,
                data: userData,
                index: index + 1
            });
        });
        
        // Kullanıcıları kayıt tarihine göre AZALAN sırada sırala (en yeni en üstte)
        userList.sort((a, b) => {
            if (!a.data.createdAt || !b.data.createdAt) return 0;
            return b.data.createdAt.seconds - a.data.createdAt.seconds;
        });
        
        // Pagination bilgilerini güncelle
        totalUsers = userList.length;
        totalUserPages = Math.ceil(totalUsers / usersPerPage);
        
        // Pagination kontrollerini güncelle
        updateUserPaginationControls();
        
        // Filtreleme ve arama uygula
        applyUserFiltersAndSearch();
        
    } catch (error) {
        console.error('Kullanıcı tablosu yüklenirken hata:', error);
        const tableBody = document.getElementById('usersTableBody');
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Hata: ${error.message}</td></tr>`;
        document.getElementById('noUsersMessage').style.display = 'none';
        document.querySelector('#users .pagination').style.display = 'none';
        userList = [];
    }
}

// User pagination kontrollerini güncelle
function updateUserPaginationControls() {
    // Pagination bilgilerini güncelle
    const startIdx = (currentUserPage - 1) * usersPerPage + 1;
    const endIdx = Math.min(currentUserPage * usersPerPage, totalUsers);
    
    // Pagination bilgi metnini güncelle
    document.getElementById('userPaginationInfo').textContent = `${startIdx}-${endIdx} / ${totalUsers}`;
    
    // Sayfa numaralarını güncelle
    let pageStart = Math.max(1, currentUserPage - 1);
    let pageEnd = Math.min(totalUserPages, pageStart + 2);
    
    // Yeterli sayfa yoksa başlangıç değerini ayarla
    if (pageEnd - pageStart < 2) {
        pageStart = Math.max(1, pageEnd - 2);
    }
    
    // Sayfa numaralarını güncelle
    const pageElements = document.querySelectorAll('[id^="userPage"]');
    for (let i = 0; i < pageElements.length; i++) {
        const pageNum = pageStart + i;
        const pageEl = pageElements[i];
        
        if (pageNum <= totalUserPages) {
            const pageLink = pageEl.querySelector('a');
            if (!pageLink) {
                console.error(`Sayfa ${pageNum} için 'a' elementi bulunamadı`);
                continue; // Bu sayfa için döngüyü atla
            }
            
            pageLink.textContent = pageNum;
            pageEl.classList.remove('d-none');
            pageEl.classList.toggle('active', pageNum === currentUserPage);
            pageLink.onclick = function() { goToUserPage(pageNum); };
        } else {
            pageEl.classList.add('d-none');
        }
    }
    
    // Önceki/sonraki butonları güncelle
    document.getElementById('userPrevPage').classList.toggle('disabled', currentUserPage === 1);
    document.getElementById('userNextPage').classList.toggle('disabled', currentUserPage === totalUserPages);
    
    // Toplam sayfa sayısı 1'den azsa pagination'ı gizle
    document.querySelector('#users .pagination').style.display = totalUserPages <= 1 ? 'none' : 'flex';
}

// Belirli bir user sayfasına git
function goToUserPage(pageNum) {
    if (pageNum < 1 || pageNum > totalUserPages) return;
    
    currentUserPage = pageNum;
    updateUserPaginationControls();
    applyUserFiltersAndSearch();
}

// Önceki/sonraki user sayfasına git
function changeUserPage(direction) {
    if (direction === 'prev' && currentUserPage > 1) {
        goToUserPage(currentUserPage - 1);
    } else if (direction === 'next' && currentUserPage < totalUserPages) {
        goToUserPage(currentUserPage + 1);
    }
}

// Kullanıcı filtreleme ve arama uygula
function applyUserFiltersAndSearch() {
    const tableBody = document.getElementById('usersTableBody');
    tableBody.innerHTML = '';
    
    const searchText = document.getElementById('userSearch')?.value.toLowerCase() || '';
    
    // Filtreleme ve arama uygula
    let filteredUsers = userList.filter(user => {
        // Rol filtresini uygula
        if (currentUserFilter === 'admin' && user.data.role !== 'admin') return false;
        if (currentUserFilter === 'user' && user.data.role === 'admin') return false;
        
        // Arama metnini uygula
        if (searchText && !(
            (user.data.displayName && user.data.displayName.toLowerCase().includes(searchText)) || 
            (user.data.email && user.data.email.toLowerCase().includes(searchText))
        )) return false;
        
        return true;
    });
    
    // Filtrelenmiş kullanıcı sayısını güncelle
    const filteredTotal = filteredUsers.length;
    
    // Eğer sonuç yoksa mesaj göster
    if (filteredUsers.length === 0) {
        document.getElementById('noUsersMessage').style.display = 'block';
        document.querySelector('#users .pagination').style.display = 'none';
        document.getElementById('userPaginationInfo').textContent = `0-0 / 0`;
        return;
    } else {
        document.getElementById('noUsersMessage').style.display = 'none';
    }
    
    // Toplam sayfa sayısını güncelle
    totalUserPages = Math.ceil(filteredTotal / usersPerPage);
    
    // Eğer mevcut sayfa toplam sayfa sayısından büyükse, son sayfaya git
    if (currentUserPage > totalUserPages) {
        currentUserPage = totalUserPages;
    }
    
    // Pagination bilgilerini güncelle
    updateUserPaginationControls();
    
    // Gösterilecek kullanıcı aralığını hesapla
    const startIdx = (currentUserPage - 1) * usersPerPage;
    const endIdx = Math.min(startIdx + usersPerPage, filteredTotal);
    
    // Pagination bilgi metnini güncelle
    document.getElementById('userPaginationInfo').textContent = `${startIdx + 1}-${endIdx} / ${filteredTotal}`;
    
    // Sadece mevcut sayfada gösterilecek kullanıcıları al
    const pageUsers = filteredUsers.slice(startIdx, endIdx);
    
    // Sonuçları tabloya ekle
    pageUsers.forEach((user, index) => {
        const userId = user.id;
        const userData = user.data;
        
        // Tarih formatla
        const createdAt = userData.createdAt ? new Date(userData.createdAt.toDate()) : new Date();
        const createdAtFormatted = createdAt.toLocaleDateString() + ' ' + createdAt.toLocaleTimeString();
        
        const lastLoginAt = userData.lastLoginAt ? new Date(userData.lastLoginAt.toDate()) : null;
        const lastLoginFormatted = lastLoginAt ? lastLoginAt.toLocaleDateString() + ' ' + lastLoginAt.toLocaleTimeString() : 'Hiç giriş yapılmadı';
        
        // Kullanıcı rolü
        const role = userData.role || 'user';
        const roleBadgeClass = role === 'admin' ? 'bg-danger' : 'bg-success';
        
        // Sıra numarası
        const rowNumber = startIdx + index + 1;
        
        const row = document.createElement('tr');
        row.className = 'align-middle'; // Dikey ortalama
        row.innerHTML = `
            <td class="text-center fw-bold">
                ${rowNumber}
            </td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="me-2">
                        <i class="fas fa-user-circle fa-2x text-secondary"></i>
                    </div>
                    <div>
                        <span class="fw-bold">${userData.displayName || 'İsimsiz Kullanıcı'}</span>
                    </div>
                </div>
            </td>
            <td>${userData.email || 'Email yok'}</td>
            <td>
                <span class="badge ${roleBadgeClass} rounded-pill">
                    ${role === 'admin' ? 'Admin' : 'Kullanıcı'}
                </span>
            </td>
            <td>${createdAtFormatted}</td>
            <td>${lastLoginFormatted}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary me-1" 
                        onclick="viewUserDetails('${userId}')">
                    <i class="fas fa-eye"></i>
                </button>
                ${role !== 'admin' ? 
                `<button class="btn btn-sm btn-outline-danger" 
                        onclick="confirmDeleteUser('${userId}')">
                    <i class="fas fa-trash"></i>
                </button>` : ''}
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Kullanıcı araması
function filterUsers() {
    currentUserPage = 1; // Arama yapıldığında ilk sayfaya dön
    applyUserFiltersAndSearch();
}

// Kullanıcı rol filtresi
function filterUsersByRole(role) {
    // Aktif butonu güncelle
    const buttons = ['filter-users-all', 'filter-users-admin', 'filter-users-user'];
    buttons.forEach(id => {
        document.getElementById(id).classList.remove('active');
    });
    document.getElementById(`filter-users-${role}`).classList.add('active');
    
    // Filtre durumunu güncelle ve uygula
    currentUserFilter = role;
    currentUserPage = 1; // Filtreleme yapıldığında ilk sayfaya dön
    applyUserFiltersAndSearch();
}

// Kullanıcı detaylarını görüntüle
function viewUserDetails(userId) {
    const user = userList.find(u => u.id === userId);
    if (!user) {
        showToast('Kullanıcı bilgileri bulunamadı!', 'danger');
        return;
    }
    
    // Modal içeriğini oluştur
    const userData = user.data;
    const createdAt = userData.createdAt ? new Date(userData.createdAt.toDate()) : new Date();
    const lastLoginAt = userData.lastLoginAt ? new Date(userData.lastLoginAt.toDate()) : null;
    const role = userData.role || 'user';
    
    let modalContent = `
        <div class="user-detail">
            <div class="text-center mb-4 position-relative">
                <div class="bg-light rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 100px; height: 100px;">
                    <i class="fas fa-user-circle fa-5x text-primary"></i>
                </div>
                <h3 class="mt-2">${userData.displayName || 'İsimsiz Kullanıcı'}</h3>
                <p class="text-muted">${userData.email || 'Email yok'}</p>
                <span class="badge ${role === 'admin' ? 'bg-danger' : 'bg-success'} rounded-pill fs-6 px-3 py-2">
                    ${role === 'admin' ? 'Admin' : 'Kullanıcı'}
                </span>
            </div>
            
            <div class="user-info bg-light p-4 rounded-3 mb-4">
                <div class="row mb-3">
                    <div class="col-md-6 fw-bold text-secondary">
                        <i class="fas fa-fingerprint me-2"></i>Kullanıcı ID:
                    </div>
                    <div class="col-md-6 font-monospace">${userId}</div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-6 fw-bold text-secondary">
                        <i class="fas fa-calendar-plus me-2"></i>Kayıt Tarihi:
                    </div>
                    <div class="col-md-6">${createdAt.toLocaleDateString()} ${createdAt.toLocaleTimeString()}</div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-6 fw-bold text-secondary">
                        <i class="fas fa-sign-in-alt me-2"></i>Son Giriş:
                    </div>
                    <div class="col-md-6">${lastLoginAt ? `${lastLoginAt.toLocaleDateString()} ${lastLoginAt.toLocaleTimeString()}` : 'Hiç giriş yapılmadı'}</div>
                </div>
            </div>
            
            <div class="yetki-degistir p-4 rounded-3 border">
                <h5 class="mb-3"><i class="fas fa-user-shield me-2"></i>Kullanıcı Yetkisi</h5>
                <div class="mb-3">
                    <select id="userRoleSelect" class="form-select">
                        <option value="user" ${role === 'user' ? 'selected' : ''}>Kullanıcı</option>
                        <option value="admin" ${role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </div>
                <div class="d-grid">
                    <button id="changeRoleBtn" class="btn btn-primary" onclick="changeUserRole('${userId}')">
                        <i class="fas fa-save me-2"></i>Değişiklikleri Kaydet
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Modalı göster (daha geniş modal için 'modal-lg' class'ı ekledik)
    showModal(`Kullanıcı Detayları: ${userData.displayName || 'İsimsiz Kullanıcı'}`, modalContent, 'modal-lg');
}

// Kullanıcı yetkisini değiştir
async function changeUserRole(userId) {
    const roleSelect = document.getElementById('userRoleSelect');
    if (!roleSelect) return;
    
    const newRole = roleSelect.value;
    
    try {
        // Modal kapatma düğmesini bul ve tıkla (yani modalı kapat)
        document.querySelector('#generalModal .btn-close').click();
        
        const db = firebase.firestore();
        await db.collection('users').doc(userId).update({
            role: newRole
        });
        
        // Kullanıcı tablosunu güncelle
        await loadUsersTable();
        
        showToast(`Kullanıcı yetkisi ${newRole === 'admin' ? 'Admin' : 'Kullanıcı'} olarak güncellendi!`, 'success');
    } catch (error) {
        console.error('Kullanıcı yetkisi güncellenirken hata:', error);
        showToast('Kullanıcı yetkisi güncellenirken bir hata oluştu!', 'danger');
    }
}

// Kullanıcıyı silme onayı
function confirmDeleteUser(userId) {
    const user = userList.find(u => u.id === userId);
    if (!user) {
        showToast('Kullanıcı bilgileri bulunamadı!', 'danger');
        return;
    }
    
    showConfirmModal(
        'Kullanıcıyı Sil', 
        `<p><strong>${user.data.displayName || user.data.email || 'İsimsiz Kullanıcı'}</strong> kullanıcısını silmek istediğinizden emin misiniz?</p>
         <p class="text-danger">Bu işlem geri alınamaz!</p>`,
        async () => {
            await deleteUser(userId);
        }
    );
}

// Kullanıcıyı sil
async function deleteUser(userId) {
    try {
        const db = firebase.firestore();
        await db.collection('users').doc(userId).delete();
        
        // Kullanıcı tablosunu güncelle
        await loadUsersTable();
        
        showToast('Kullanıcı başarıyla silindi!', 'success');
    } catch (error) {
        console.error('Kullanıcı silinirken hata:', error);
        showToast('Kullanıcı silinirken bir hata oluştu!', 'danger');
    }
}

// Genel modal gösterme fonksiyonu
function showModal(title, content, sizeClass = '') {
    // Eğer sayfada daha önce oluşturulmuş bir modal varsa, kaldır
    const existingModal = document.getElementById('generalModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Modal HTML'ini oluştur
    const modalHTML = `
        <div class="modal fade" id="generalModal" tabindex="-1" aria-labelledby="generalModalLabel" aria-hidden="true">
            <div class="modal-dialog ${sizeClass}">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="generalModalLabel">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Kapat"></button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Kapat</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Modal elementini oluştur ve sayfaya ekle
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer.firstElementChild);
    
    // Modal nesnesini oluştur ve göster
    const modalElement = document.getElementById('generalModal');
    const modal = new bootstrap.Modal(modalElement);
    
    // Modal kapatıldığında
    modalElement.addEventListener('hidden.bs.modal', function() {
        modalElement.remove();
    });
    
    // Modalı göster
    modal.show();
}

// Page Views arama ve filtreleme değişkenleri
let currentPageViewFilter = 'all';
let pageViewsList = []; // Global olarak pageViews listesini tut

// PageView pagination değişkenleri
let currentPageViewPage = 1;
const pageViewsPerPage = 20;
let totalPageViewPages = 1;
let totalPageViews = 0;

// Sayfa görüntüleme istatistiklerini yükle
async function loadPageViewsStats() {
    try {
        const db = firebase.firestore();
        const pageViewsRef = db.collection('pageViews');
        
        // Tüm sayfa görüntüleme verilerini çek
        const snapshot = await pageViewsRef.orderBy('timestamp', 'desc').get();
        
        if (snapshot.empty) {
            document.getElementById('totalPageViews').textContent = '0';
            document.getElementById('todayPageViews').textContent = '0';
            document.getElementById('avgPageDuration').textContent = '0 dk';
            document.getElementById('uniqueViewers').textContent = '0';
            
            const tableBody = document.getElementById('pageViewsTableBody');
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Henüz hiç sayfa görüntüleme verisi bulunmuyor.</td></tr>';
            
            document.getElementById('noPageViewsMessage').style.display = 'none';
            document.querySelector('#page-views .pagination').style.display = 'none';
            document.getElementById('pageViewPaginationInfo').textContent = '0-0 / 0';
            
            // Boş grafikler oluştur
            createEmptyCharts();
            
            pageViewsList = [];
            return;
        }
        
        // Tüm verileri bir diziye alıp işle
        pageViewsList = [];
        let totalDuration = 0;
        const uniqueUsers = new Set();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let todayViews = 0;
        
        const pageDistribution = {
            "Project Blueprint": 0,
            "Project Deck": 0,
            "Project Blurb": 0,
            "Token Economics": 0
        };
        
        const dateLabels = [];
        const dateData = {};
        
        // Son 7 günün tarihlerini oluştur
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateString = `${date.getDate()}/${date.getMonth() + 1}`;
            dateLabels.push(dateString);
            dateData[dateString] = 0;
        }
        
        snapshot.docs.forEach((doc, index) => {
            const data = doc.data();
            const docId = doc.id;
            
            pageViewsList.push({
                id: docId,
                data: data,
                index: index + 1
            });
            
            // Toplam süreyi hesapla
            totalDuration += data.duration || 0;
            
            // Benzersiz kullanıcıları hesapla
            if (data.userId) {
                uniqueUsers.add(data.userId);
            }
            
            // Bugünkü görüntülemeleri hesapla
            if (data.timestamp && data.timestamp.toDate() >= today) {
                todayViews++;
            }
            
            // Sayfa dağılımını hesapla
            if (data.pageName && pageDistribution.hasOwnProperty(data.pageName)) {
                pageDistribution[data.pageName]++;
            }
            
            // Tarih bazlı grafiği için verileri hesapla
            if (data.timestamp) {
                const viewDate = data.timestamp.toDate();
                const dateString = `${viewDate.getDate()}/${viewDate.getMonth() + 1}`;
                
                // Son 7 gün içindeyse hesapla
                if (dateData.hasOwnProperty(dateString)) {
                    dateData[dateString]++;
                }
            }
        });
        
        // İstatistikleri hesapla ve göster
        document.getElementById('totalPageViews').textContent = pageViewsList.length.toString();
        document.getElementById('todayPageViews').textContent = todayViews.toString();
        
        const avgDuration = pageViewsList.length > 0 ? Math.round(totalDuration / pageViewsList.length) : 0;
        document.getElementById('avgPageDuration').textContent = `${avgDuration} sn`;
        
        document.getElementById('uniqueViewers').textContent = uniqueUsers.size.toString();
        
        // Grafikleri oluştur
        createPageViewsChart(dateLabels, Object.values(dateData));
        createPageDistributionChart(Object.keys(pageDistribution), Object.values(pageDistribution));
        
        // Tablo için pagination ayarla
        totalPageViews = pageViewsList.length;
        totalPageViewPages = Math.ceil(totalPageViews / pageViewsPerPage);
        
        // Pagination kontrollerini güncelle
        updatePageViewPaginationControls();
        
        // Filtreleme ve arama uygula
        applyPageViewFiltersAndSearch();
        
    } catch (error) {
        console.error('Sayfa görüntüleme istatistikleri yüklenirken hata:', error);
        document.getElementById('pageViewsTableBody').innerHTML = `<tr><td colspan="5" class="text-center text-danger">Hata: ${error.message}</td></tr>`;
    }
}

// Sayfa görüntüleme verilerini filtreleme ve gösterme
function applyPageViewFiltersAndSearch() {
    const tableBody = document.getElementById('pageViewsTableBody');
    tableBody.innerHTML = '';
    
    const searchText = document.getElementById('pageViewSearch')?.value.toLowerCase() || '';
    
    // Filtreleme ve arama uygula
    let filteredPageViews = pageViewsList.filter(item => {
        const data = item.data;
        
        // Sayfa filtresi uygula
        if (currentPageViewFilter !== 'all') {
            if (currentPageViewFilter === 'blueprint' && !data.pageName?.includes('Blueprint')) return false;
            if (currentPageViewFilter === 'deck' && !data.pageName?.includes('Deck')) return false;
            if (currentPageViewFilter === 'tokeneconomics' && !data.pageName?.includes('Token')) return false;
        }
        
        // Arama metni uygula (kullanıcı ID veya sayfa adında)
        if (searchText && !(
            (data.userId && data.userId.toLowerCase().includes(searchText)) || 
            (data.pageName && data.pageName.toLowerCase().includes(searchText))
        )) return false;
        
        return true;
    });
    
    // Filtrelenmiş veri sayısını güncelle
    const filteredTotal = filteredPageViews.length;
    
    // Eğer sonuç yoksa mesaj göster
    if (filteredPageViews.length === 0) {
        document.getElementById('noPageViewsMessage').style.display = 'block';
        document.querySelector('#page-views .pagination').style.display = 'none';
        document.getElementById('pageViewPaginationInfo').textContent = `0-0 / 0`;
        return;
    } else {
        document.getElementById('noPageViewsMessage').style.display = 'none';
    }
    
    // Toplam sayfa sayısını güncelle
    totalPageViewPages = Math.ceil(filteredTotal / pageViewsPerPage);
    
    // Eğer mevcut sayfa toplam sayfa sayısından büyükse, son sayfaya git
    if (currentPageViewPage > totalPageViewPages) {
        currentPageViewPage = totalPageViewPages;
    }
    
    // Pagination bilgilerini güncelle
    updatePageViewPaginationControls();
    
    // Gösterilecek veri aralığını hesapla
    const startIdx = (currentPageViewPage - 1) * pageViewsPerPage;
    const endIdx = Math.min(startIdx + pageViewsPerPage, filteredTotal);
    
    // Pagination bilgi metnini güncelle
    document.getElementById('pageViewPaginationInfo').textContent = `${startIdx + 1}-${endIdx} / ${filteredTotal}`;
    
    // Sadece mevcut sayfada gösterilecek verileri al
    const pageItems = filteredPageViews.slice(startIdx, endIdx);
    
    // Sonuçları tabloya ekle
    pageItems.forEach((item, index) => {
        const data = item.data;
        
        // Tarih formatla
        const timestamp = data.timestamp ? new Date(data.timestamp.toDate()) : new Date();
        const dateFormatted = timestamp.toLocaleDateString() + ' ' + timestamp.toLocaleTimeString();
        
        // Süreyi formatla
        const duration = data.duration || 0;
        const durationFormatted = duration >= 60 ? `${Math.floor(duration / 60)} dk ${duration % 60} sn` : `${duration} sn`;
        
        // Sıra numarası
        const rowNumber = startIdx + index + 1;
        
        const row = document.createElement('tr');
        row.className = 'align-middle'; // Dikey ortalama
        row.innerHTML = `
            <td class="text-center fw-bold">${rowNumber}</td>
            <td>${data.userId || 'Misafir'}</td>
            <td>
                <span class="badge ${getPageBadgeClass(data.pageName)} rounded-pill">
                    ${data.pageName || 'Bilinmeyen Sayfa'}
                </span>
            </td>
            <td>${durationFormatted}</td>
            <td>${dateFormatted}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Sayfa türüne göre badge rengi belirle
function getPageBadgeClass(pageName) {
    if (!pageName) return 'bg-secondary';
    
    if (pageName.includes('Blueprint')) return 'bg-primary';
    if (pageName.includes('Deck')) return 'bg-success';
    if (pageName.includes('Blurb')) return 'bg-info';
    if (pageName.includes('Token')) return 'bg-warning text-dark';
    
    return 'bg-secondary';
}

// Page View pagination kontrollerini güncelle
function updatePageViewPaginationControls() {
    // Pagination bilgilerini güncelle
    const startIdx = (currentPageViewPage - 1) * pageViewsPerPage + 1;
    const endIdx = Math.min(currentPageViewPage * pageViewsPerPage, totalPageViews);
    
    // Sayfa numaralarını güncelle
    let pageStart = Math.max(1, currentPageViewPage - 1);
    let pageEnd = Math.min(totalPageViewPages, pageStart + 2);
    
    // Yeterli sayfa yoksa başlangıç değerini ayarla
    if (pageEnd - pageStart < 2) {
        pageStart = Math.max(1, pageEnd - 2);
    }
    
    // Sayfa numaralarını güncelle
    const pageElements = document.querySelectorAll('[id^="pageViewPage"]');
    for (let i = 0; i < pageElements.length; i++) {
        const pageNum = pageStart + i;
        const pageEl = pageElements[i];
        
        if (pageNum <= totalPageViewPages) {
            const pageLink = pageEl.querySelector('a');
            if (!pageLink) {
                console.error(`Sayfa ${pageNum} için 'a' elementi bulunamadı`);
                continue; // Bu sayfa için döngüyü atla
            }
            
            pageLink.textContent = pageNum;
            pageEl.classList.remove('d-none');
            pageEl.classList.toggle('active', pageNum === currentPageViewPage);
            pageLink.onclick = function() { goToPageViewPage(pageNum); };
        } else {
            pageEl.classList.add('d-none');
        }
    }
    
    // Önceki/sonraki butonları güncelle
    document.getElementById('pageViewPrevPage').classList.toggle('disabled', currentPageViewPage === 1);
    document.getElementById('pageViewNextPage').classList.toggle('disabled', currentPageViewPage === totalPageViewPages);
    
    // Toplam sayfa sayısı 1'den azsa pagination'ı gizle
    document.querySelector('#page-views .pagination').style.display = totalPageViewPages <= 1 ? 'none' : 'flex';
}

// Belirli bir pageView sayfasına git
function goToPageViewPage(pageNum) {
    if (pageNum < 1 || pageNum > totalPageViewPages) return;
    
    currentPageViewPage = pageNum;
    updatePageViewPaginationControls();
    applyPageViewFiltersAndSearch();
}

// Önceki/sonraki pageView sayfasına git
function changePageViewPage(direction) {
    if (direction === 'prev' && currentPageViewPage > 1) {
        goToPageViewPage(currentPageViewPage - 1);
    } else if (direction === 'next' && currentPageViewPage < totalPageViewPages) {
        goToPageViewPage(currentPageViewPage + 1);
    }
}

// Sayfa görüntüleme verileri araması
function filterPageViews() {
    currentPageViewPage = 1; // Arama yapıldığında ilk sayfaya dön
    applyPageViewFiltersAndSearch();
}

// Sayfa filtresi
function filterPageViewsByPage(page) {
    // Aktif butonu güncelle
    const buttons = ['filter-page-all', 'filter-page-blueprint', 'filter-page-deck', 'filter-page-tokeneconomics'];
    buttons.forEach(id => {
        document.getElementById(id).classList.remove('active');
    });
    document.getElementById(`filter-page-${page}`).classList.add('active');
    
    // Filtre durumunu güncelle ve uygula
    currentPageViewFilter = page;
    currentPageViewPage = 1; // Filtreleme yapıldığında ilk sayfaya dön
    applyPageViewFiltersAndSearch();
}

// Sayfa görüntüleme trendi grafiğini oluştur
function createPageViewsChart(labels, data) {
    const ctx = document.getElementById('pageViewsChart').getContext('2d');
    
    if (window.pageViewsChartInstance) {
        window.pageViewsChartInstance.destroy();
    }
    
    window.pageViewsChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Sayfa Görüntülemeleri',
                data: data,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                fill: {
                    target: 'origin',
                    above: 'rgba(75, 192, 192, 0.2)'
                }
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

// Sayfa dağılım grafiğini oluştur
function createPageDistributionChart(labels, data) {
    const ctx = document.getElementById('pageDistributionChart').getContext('2d');
    
    if (window.pageDistributionChartInstance) {
        window.pageDistributionChartInstance.destroy();
    }
    
    const backgroundColors = [
        'rgba(54, 162, 235, 0.7)', // Blueprint
        'rgba(75, 192, 192, 0.7)',  // Deck
        'rgba(255, 159, 64, 0.7)',  // Blurb
        'rgba(255, 205, 86, 0.7)'   // Token Economics
    ];
    
    window.pageDistributionChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Sayfa Görüntülemeleri',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                title: {
                    display: true,
                    text: 'Sayfa Dağılımı'
                }
            }
        }
    });
}

// Boş grafikler oluştur
function createEmptyCharts() {
    // Trend grafiği
    const emptyLabels = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    const emptyData = [0, 0, 0, 0, 0, 0, 0];
    
    createPageViewsChart(emptyLabels, emptyData);
    
    // Dağılım grafiği
    const emptyDistLabels = ['Project Blueprint', 'Project Deck', 'Project Blurb', 'Token Economics'];
    const emptyDistData = [0, 0, 0, 0];
    
    createPageDistributionChart(emptyDistLabels, emptyDistData);
} 