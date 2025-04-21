// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
// const auth = firebase.auth(); // Bu satırı kaldırıyorum çünkü auth zaten auth.js içinde tanımlanmış

// Page Tracking için gerekli değişkenler
let pageViewsData = [];
let pageViewsPage = 1;
let pageViewsPageSize = 10;
let totalPageViewsPages = 1;
let allUsers = [];
let pageViewsChart = null;
let userPageViewsChart = null;
let userTimeBasedChart = null;
let timeChartPage = 0; // Zaman grafiği için sayfa numarası
let timeChartPageSize = 12; // Sayfa başına gösterilecek veri noktası sayısı
let filteredTimeData = []; // Seçilen kullanıcının tüm zaman verisi

// Wait for DOM content to be loaded before initializing the admin panel
document.addEventListener('DOMContentLoaded', function() {    
    // Check if user is logged in
    firebase.auth().onAuthStateChanged(async function(user) {
        
        if (!user) {
            // Kullanıcı giriş yapmamışsa anasayfaya yönlendir
            window.location.href = 'index.html';
            return;
        }
        
        try {
            // Önce window.userRole değişkeni varsa kontrolü yap
            if (window.userRole === 'admin') {
                initializeAdminPanel();
                initializeNavigation();
                showAdminPanel(user);
                loadUsersTable();
                
                // Kullanıcı arama işlevini başlat
                setupUserSearch();
                return;
            }
            
            // window.userRole yoksa, enhanceUserWithFirestoreData kullanarak Firestore'dan veriyi çek
            if (window.enhanceUserWithFirestoreData) {
                await window.enhanceUserWithFirestoreData(user);
                
                // Şimdi window.userRole ayarlanmış olmalı
                if (window.userRole === 'admin') {
                    initializeAdminPanel();
                    initializeNavigation();
                    loadUsersTable();
                    
                    // Kullanıcı arama işlevini başlat
                    setupUserSearch();
                    
                    // Analytics için olay dinleyicilerini ekle
                    setupAnalyticsEventListeners();
                    
                    return;
                }
            }
            
            // Admin değilse anasayfaya yönlendir
            alert('Bu sayfaya erişim yetkiniz bulunmamaktadır.');
            window.location.href = 'index.html';
            
        } catch (error) {
            console.error('Admin kontrolünde hata:', error);
            alert('Bir hata oluştu. Anasayfaya yönlendiriliyorsunuz. ' + error);
            window.location.href = 'index.html';
        }
    });
});

// Kullanıcı arama işlevini kuran fonksiyon
function setupUserSearch() {
    const searchInput = document.getElementById('userSearchInput');
    if (searchInput) {
        // Arama alanına keyup event listener ekle (kullanıcı yazmayı bitirdiğinde arama yap)
        let debounceTimer;
        searchInput.addEventListener('keyup', function() {
            // Önceki timer'ı temizle ve yeni bir timer başlat
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const searchTerm = searchInput.value.trim();
                if (searchTerm.length > 0) {
                    // Arama terimiyle kullanıcıları ara
                    searchUsers(searchTerm);
                } else {
                    // Arama terimi boşsa tüm kullanıcıları göster
                    loadUsersTable();
                }
            }, 300); // 300ms bekle
        });
    }
}

// Auth/search endpoint'ine istek atarak kullanıcıları arama
async function searchUsers(searchTerm) {
    try {
        // Kullanıcı tablosuna yükleniyor mesajı göster
        const userTableBody = document.getElementById('userActivityTableBody');
        if (userTableBody) {
            userTableBody.innerHTML = '<tr><td colspan="5" class="text-center">Arama yapılıyor...</td></tr>';
        }
        
        // auth/search endpoint'ine istek gönder - query parametresi olarak
        const response = await fetch(`https://tipbox-docs-backend.vercel.app/auth/search?q=${encodeURIComponent(searchTerm)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Yanıtı JSON olarak parse et
        const users = await response.json();
        
        // Arama sonuçlarını tabloda göster
        displaySearchResults(users);
    } catch (error) {
        console.error('Kullanıcı arama hatası:', error);
        const userTableBody = document.getElementById('userActivityTableBody');
        if (userTableBody) {
            userTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Arama hatası: ${error.message}</td></tr>`;
        }
    }
}

// Arama sonuçlarını tabloda gösterme
function displaySearchResults(users) {
    const userTableBody = document.getElementById('userActivityTableBody');
    
    if (!userTableBody) {
        console.error("userActivityTableBody elementi bulunamadı!");
        return;
    }
    
    // Tabloyu temizle
    userTableBody.innerHTML = '';
    
    if (users.length === 0) {
        userTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Aramanızla eşleşen kullanıcı bulunamadı.</td></tr>';
        return;
    }
    
    // Her bir kullanıcı için tablo satırı oluştur
    users.forEach(user => {
        // Tarih formatı
        
        // Zaman damgalarını işle - _seconds ve _nanoseconds içeren Firestore zaman damgaları için
        let lastLoginDate, createdAtDate;
        
        if (user.lastLoginAt) {
            if (user.lastLoginAt._seconds) {
                // _seconds/_nanoseconds formatı için
                lastLoginDate = new Date(user.lastLoginAt._seconds * 1000);
            } else if (typeof user.lastLoginAt === 'number') {
                // Unix timestamp (saniye) formatı için
                lastLoginDate = new Date(user.lastLoginAt * 1000);
            } else {
                // Diğer formatlar
                try {
                    lastLoginDate = new Date(user.lastLoginAt);
                } catch(e) {
                    console.error("lastLoginAt formatı işlenemedi:", user.lastLoginAt);
                    lastLoginDate = null;
                }
            }
        }
        
        if (user.createdAt) {
            if (user.createdAt._seconds) {
                // _seconds/_nanoseconds formatı için
                createdAtDate = new Date(user.createdAt._seconds * 1000);
            } else if (typeof user.createdAt === 'number') {
                // Unix timestamp (saniye) formatı için
                createdAtDate = new Date(user.createdAt * 1000);
            } else {
                // Diğer formatlar
                try {
                    createdAtDate = new Date(user.createdAt);
                } catch(e) {
                    console.error("createdAt formatı işlenemedi:", user.createdAt);
                    createdAtDate = null;
                }
            }
        }
        
        // Formatlı tarihleri oluştur
        const lastLogin = lastLoginDate ? lastLoginDate.toLocaleString('tr-TR') : 'Hiç giriş yapmadı';
        const createdAt = createdAtDate ? createdAtDate.toLocaleString('tr-TR') : 'Bilinmiyor';
        
        // Kullanıcı durumu (aktif/pasif)
        const isActive = user.isActive !== undefined ? user.isActive : true;
        const statusClass = isActive ? 'success' : 'danger';
        const statusText = isActive ? 'Aktif' : 'Pasif';
        
        // Kullanıcı rolü
        const role = user.role || 'user';
        const roleClass = role === 'admin' ? 'danger' : 'primary';
        const roleText = role === 'admin' ? 'Admin' : 'Kullanıcı';
        
        // Profil fotoğrafı veya varsayılan ikon
        let avatarHtml = '';
        if (user.photoURL) {
            // Kullanıcının profil fotoğrafı varsa onu kullan
            avatarHtml = `<img src="${user.photoURL}" alt="${user.displayName || 'Kullanıcı'}" class="rounded-circle" width="40" height="40">`;
        } else {
            // Varsayılan kullanıcı ikonu
            avatarHtml = `<i class="fas fa-user-circle fa-2x text-secondary"></i>`;
        }
        
        // İşlemler butonu
        const actionsColumn = `
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary" onclick="openRoleUpdateModal('${user.uid}', '${user.displayName || user.email}', '${role}')">
                    <i class="fas fa-user-edit"></i>
                </button>
            </td>
        `;
        
        // Tablo satırını oluştur
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <div class="user-avatar me-2">
                        ${avatarHtml}
                    </div>
                    <div>
                        <span>${user.displayName || 'İsimsiz Kullanıcı'}</span>
                        <small class="d-block text-muted">${user.email || 'Email yok'}</small>
                    </div>
                </div>
            </td>
            <td>${lastLogin}</td>
            <td>${createdAt}</td>
            <td>
                <span class="badge bg-${roleClass}">${roleText}</span>
            </td>
            <td>
                <span class="badge bg-${statusClass}">${statusText}</span>
            </td>
            ${actionsColumn}
        `;
        
        userTableBody.appendChild(row);
    });
}

// Admin panelinin içeriğini göster (HTML'den taşınan fonksiyon)
function showAdminPanel(user) {
    
    try {
        // Admin bilgilerini panelde göster
        const adminNameElement = document.getElementById('adminName');
        const adminEmailElement = document.getElementById('adminEmail');
        const sidebarUserAvatarElement = document.getElementById('sidebarUserAvatar');
        const contentElement = document.querySelector('.content-section');
        
        if (adminNameElement && adminEmailElement) {
            adminNameElement.textContent = user.displayName || user.email;
            adminEmailElement.textContent = user.email;

            // Profil fotoğrafını göster (varsa)
            if (sidebarUserAvatarElement) {
                if (user.photoURL) {
                    sidebarUserAvatarElement.innerHTML = `<img src="${user.photoURL}" alt="${user.displayName || 'Admin'}" class="rounded-circle" width="40" height="40">`;
                } else {
                    sidebarUserAvatarElement.innerHTML = `<i class="fas fa-user-circle fa-2x text-white"></i>`;
                }
            }
        } else {
            console.error('Admin bilgi elementleri bulunamadı!');
        }
        
        // Admin paneli içeriğini göster
        if (contentElement) {
            document.querySelectorAll('.content-section').forEach(section => {
                section.style.display = 'none';
            });
            
            // Dashboard göster (varsayılan)
            const dashboardElement = document.getElementById('dashboard');
            if (dashboardElement) {
                dashboardElement.style.display = 'block';
            }
        } else {
            console.error('Content elementi bulunamadı!');
        }
    } catch (error) {
        console.error('showAdminPanel fonksiyonunda hata:', error);
    }
}

// Admin paneli başlat
function initializeAdminPanel() {
    // Kullanıcı istatistiklerini al
    db.collection('users').get().then(snapshot => {
        const totalUsers = snapshot.size;
        document.getElementById('totalUsers').textContent = totalUsers;
    }).catch(error => {
        console.error("Kullanıcı istatistikleri alınırken hata: ", error);
    });
    
    // Aktif token sayısını al
    db.collection('guestTokens').where('isActive', '==', true).get().then(snapshot => {
        const activeTokens = snapshot.size;
        document.getElementById('activeTokens').textContent = activeTokens;
    }).catch(error => {
        console.error("Token istatistikleri alınırken hata: ", error);
    });
    
    // Toplam görüntüleme süresini güncelle
    db.collection('pageViews').get().then(snapshot => {
        let totalSeconds = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            totalSeconds += data.duration || 0;
        });
        
        // Saat, dakika, saniye olarak formatla
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        document.getElementById('totalViewTime').textContent = `${hours} sa ${minutes} dk ${seconds} sn`;
    }).catch(error => {
        console.error("Sayfa görüntüleme istatistikleri alınırken hata: ", error);
        document.getElementById('totalViewTime').textContent = "0 sa 0 dk 0 sn";
    });
    
    // Mevcut admin bilgilerini göster
    const currentUser = firebase.auth().currentUser;
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
    firebase.auth().signOut().then(() => {
        // Sign-out successful, redirect to login page
        window.location.href = 'index.html';
    }).catch((error) => {
        // An error happened
        console.error("Logout Error: ", error);
    });
}

// Add event listener to logout button
document.getElementById('logoutBtn').addEventListener('click', logout);

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
        'Token oluşturmak istediğinizden emin misiniz?',
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
                
                // Kullanıcı bilgilerini al
                const currentUser = firebase.auth().currentUser;
                const userId = currentUser.uid;
                const creatorName = currentUser.displayName || currentUser.email;
                
                // API isteği gönder
                const response = await fetch('https://tipbox-docs-backend.vercel.app/auth/create-bulk-tokens', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        userId: userId
                    })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Token oluşturma hatası');
                }
                
                const data = await response.json();
                
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
                bulkTokenResult.textContent = "Tokenler başarıyla oluşturuldu!";
                bulkTokenResult.classList.add('text-success');
                generatedTokensContainer.style.display = 'block';
                
                // Yeni eklenen tokenleri görmek için ilk sayfaya git
                currentPage = 1;
                await loadTokensTable();
                
                showToast('Tokenler başarıyla oluşturuldu!', 'success');
                
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
    // Users tablosunun body elementini seç
    const userTableBody = document.getElementById('userActivityTableBody');
    
    if (!userTableBody) {
        console.error("userActivityTableBody elementi bulunamadı!");
        return;
    }
    
    // Yükleniyor mesajı göster
    userTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Kullanıcılar yükleniyor...</td></tr>';
    
    // Firestore'dan users koleksiyonunu al
    db.collection('users').orderBy('lastLoginAt', 'desc').get().then(snapshot => {
        // Tabloyu temizle
        userTableBody.innerHTML = '';
        
        if (snapshot.empty) {
            userTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Henüz hiç kullanıcı bulunmuyor.</td></tr>';
            return;
        }
        
        // Her bir kullanıcı için tablo satırı oluştur
        snapshot.forEach(doc => {
            const user = doc.data();
            const userId = doc.id;
            // Tarih formatı
            const lastLogin = user.lastLoginAt ? new Date(user.lastLoginAt.toDate()).toLocaleString('tr-TR') : 'Hiç giriş yapmadı';
            const createdAt = user.createdAt ? new Date(user.createdAt.toDate()).toLocaleString('tr-TR') : 'Bilinmiyor';
            
            // Kullanıcı durumu (aktif/pasif)
            const isActive = user.isActive !== undefined ? user.isActive : true;
            const statusClass = isActive ? 'success' : 'danger';
            const statusText = isActive ? 'Aktif' : 'Pasif';
            
            // Kullanıcı rolü
            const role = user.role || 'user';
            const roleClass = role === 'admin' ? 'danger' : 'primary';
            const roleText = role === 'admin' ? 'Admin' : 'Kullanıcı';
            
            // Profil fotoğrafı veya varsayılan ikon
            let avatarHtml = '';
            if (user.photoURL) {
                // Kullanıcının profil fotoğrafı varsa onu kullan
                avatarHtml = `<img src="${user.photoURL}" alt="${user.displayName || 'Kullanıcı'}" class="rounded-circle" width="40" height="40">`;
            } else {
                // Varsayılan kullanıcı ikonu
                avatarHtml = `<i class="fas fa-user-circle fa-2x text-secondary"></i>`;
            }
            
            // İşlemler butonu
            const actionsColumn = `
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary" onclick="openRoleUpdateModal('${userId}', '${user.displayName || user.email}', '${role}')">
                        <i class="fas fa-user-edit"></i>
                    </button>
                </td>
            `;
            
            // Tablo satırını oluştur
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <div class="user-avatar me-2">
                            ${avatarHtml}
                        </div>
                        <div>
                            <span>${user.displayName || 'İsimsiz Kullanıcı'}</span>
                            <small class="d-block text-muted">${user.email || 'Email yok'}</small>
                        </div>
                    </div>
                </td>
                <td>${lastLogin}</td>
                <td>${createdAt}</td>
                <td>
                    <span class="badge bg-${roleClass}">${roleText}</span>
                </td>
                <td>
                    <span class="badge bg-${statusClass}">${statusText}</span>
                </td>
                ${actionsColumn}
            `;
            
            userTableBody.appendChild(row);
        });
    }).catch(error => {
        console.error("Kullanıcı listesi yüklenirken hata: ", error);
        userTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Hata: ${error.message}</td></tr>`;
    });
}

// Rol güncelleme modalını aç
function openRoleUpdateModal(userId, userName, currentRole) {
    // Modal içindeki elemanları ayarla
    document.getElementById('roleUpdateUserName').textContent = userName;
    document.getElementById('targetUserId').value = userId;
    
    // Şu anki rolü seç
    const roleSelect = document.getElementById('newRoleSelect');
    for (let i = 0; i < roleSelect.options.length; i++) {
        if (roleSelect.options[i].value === currentRole) {
            roleSelect.selectedIndex = i;
            break;
        }
    }
    
    // Güncelleme butonunu sıfırla
    const updateBtn = document.getElementById('updateRoleBtn');
    updateBtn.disabled = false;
    updateBtn.innerHTML = 'Güncelle';
    
    // Modalı göster
    const roleModal = new bootstrap.Modal(document.getElementById('roleUpdateModal'));
    roleModal.show();
    
    // Güncelleme butonuna tıklama olayı ekle (önceki dinleyicileri kaldırarak)
    updateBtn.replaceWith(updateBtn.cloneNode(true)); // Eski dinleyicileri temizle
    document.getElementById('updateRoleBtn').addEventListener('click', updateUserRole);
    
    // Modal kapatıldığında butonun durumunu sıfırla
    document.getElementById('roleUpdateModal').addEventListener('hidden.bs.modal', function() {
        const updateBtn = document.getElementById('updateRoleBtn');
        updateBtn.disabled = false;
        updateBtn.innerHTML = 'Güncelle';
    });
}

// Kullanıcı rolünü güncelle
async function updateUserRole() {
    // Güncelleme butonunu devre dışı bırak
    const updateBtn = document.getElementById('updateRoleBtn');
    updateBtn.disabled = true;
    updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Güncelleniyor...';
    
    try {
        // Form bilgilerini al
        const targetUid = document.getElementById('targetUserId').value;
        const newRole = document.getElementById('newRoleSelect').value;
        
        // Mevcut kullanıcının ID'sini al
        const currentUser = firebase.auth().currentUser;
        const requesterId = currentUser.uid;
        
        // API isteği gönder
        const response = await fetch('https://tipbox-docs-backend.vercel.app/auth/update-role', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                targetUid,
                newRole,
                requesterId
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Rol güncellenirken bir hata oluştu.');
        }
        
        // Kullanıcı listesini yenile
        loadUsersTable();
        
        // Bildirim göster
        showToast('Kullanıcı rolü başarıyla güncellendi.', 'success');
        
        // Modalı kapat
        const modal = bootstrap.Modal.getInstance(document.getElementById('roleUpdateModal'));
        modal.hide();
        
    } catch (error) {
        console.error('Rol güncelleme hatası:', error);
        showToast(`Hata: ${error.message}`, 'danger');
    } finally {
        // İşlem başarılı veya başarısız olsa da butonu eski haline getir
        updateBtn.disabled = false;
        updateBtn.innerHTML = 'Güncelle';
    }
}

// Users sekmesine tıklandığında kullanıcı tablosunu güncelle
document.addEventListener('DOMContentLoaded', function() {
    const usersTabLink = document.querySelector('a[href="#users"]');
    if (usersTabLink) {
        usersTabLink.addEventListener('click', function() {
            loadUsersTable();
        });
    }
});

// Guest Tokens değişkenleri
let guestTokenList = []; // Global olarak token listesini tut
let guestTokenCurrentPage = 1;
const guestTokensPerPage = 20;
let guestTokenTotalPages = 1;
let guestTokenCount = 0;

// Guest Token tablosunu yükle
async function loadTokenTable() {
    try {
        const db = firebase.firestore();
        const tokensRef = db.collection('guestTokens');
        // Tüm verileri çek
        const snapshot = await tokensRef.get();
        
        const tableBody = document.getElementById('tokenTableBody');
        tableBody.innerHTML = '';
        
        if (snapshot.empty) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" class="text-center">Henüz hiç token oluşturulmamış.</td>';
            tableBody.appendChild(row);
            document.getElementById('tokenPagination').textContent = 'Sayfa 0 / 0';
            document.getElementById('prevTokenPage').disabled = true;
            document.getElementById('nextTokenPage').disabled = true;
            guestTokenList = [];
            return;
        }
        
        // Tüm verileri bir diziye alıp kullanım sayısına göre sıralayalım
        guestTokenList = [];
        snapshot.docs.forEach(doc => {
            const tokenData = doc.data();
            const tokenId = doc.id;
            
            // Kullanım sayısı
            const usageCount = tokenData.usageCount !== undefined ? tokenData.usageCount : 0;
            // Maksimum kullanım sayısı
            const maxUsageCount = tokenData.maxUsageCount !== undefined ? tokenData.maxUsageCount : 20;
            
            guestTokenList.push({
                id: tokenId,
                data: tokenData,
                usageCount: usageCount,
                maxUsageCount: maxUsageCount
            });
        });
        
        // Kullanım sayısına göre AZALAN sırada sırala (çok kullanılandan az kullanılana)
        guestTokenList.sort((a, b) => b.usageCount - a.usageCount);
        
        // Pagination bilgilerini güncelle
        guestTokenCount = guestTokenList.length;
        guestTokenTotalPages = Math.ceil(guestTokenCount / guestTokensPerPage);
        
        // Pagination kontrollerini güncelle
        updateTokenPaginationControls();
        
        // İlk sayfayı göster
        displayTokensPage(guestTokenCurrentPage);
        
    } catch (error) {
        console.error('Token tablosu yüklenirken hata:', error);
        const tableBody = document.getElementById('tokenTableBody');
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Hata: ${error.message}</td></tr>`;
        document.getElementById('tokenPagination').textContent = 'Sayfa 0 / 0';
        document.getElementById('prevTokenPage').disabled = true;
        document.getElementById('nextTokenPage').disabled = true;
        guestTokenList = [];
    }
}

// Pagination kontrollerini güncelle
function updateTokenPaginationControls() {
    // Pagination bilgi metnini güncelle
    document.getElementById('tokenPagination').textContent = `Sayfa ${guestTokenCurrentPage} / ${guestTokenTotalPages}`;
    
    // Önceki/sonraki butonları güncelle
    document.getElementById('prevTokenPage').disabled = guestTokenCurrentPage === 1;
    document.getElementById('nextTokenPage').disabled = guestTokenCurrentPage === guestTokenTotalPages || guestTokenTotalPages === 0;
}

// Belirli bir tokena sayfasını göster
function displayTokensPage(pageNum) {
    if (pageNum < 1 || pageNum > guestTokenTotalPages || guestTokenTotalPages === 0) return;
    
    const tableBody = document.getElementById('tokenTableBody');
    tableBody.innerHTML = '';
    
    // Gösterilecek token aralığını hesapla
    const startIdx = (pageNum - 1) * guestTokensPerPage;
    const endIdx = Math.min(startIdx + guestTokensPerPage, guestTokenCount);
    
    // Sayfadaki tokenleri göster
    for (let i = startIdx; i < endIdx; i++) {
        const token = guestTokenList[i];
        const tokenData = token.data;
        
        // Sıra numarası hesapla
        const rowNumber = startIdx + (i - startIdx) + 1;
        
        // Tarih formatla - sadece tarih göster
        const createdAt = tokenData.createdAt ? new Date(tokenData.createdAt.toDate()) : new Date();
        const createdAtFormatted = createdAt.toLocaleDateString();
        
        // Oluşturan kullanıcı bilgisi
        const createdBy = tokenData.createdBy || 'Sistem';
        
        // Durum
        const isActive = tokenData.isActive !== undefined ? tokenData.isActive : true;
        const statusClass = isActive ? 'success' : 'danger';
        const statusText = isActive ? 'Aktif' : 'Pasif';
        
        // Maksimum kullanım sayısı (her token için kendi değerini kullan)
        const maxUsageCount = token.maxUsageCount || 20;
        
        // Progress bar için yüzde değeri hesapla
        const usagePercent = maxUsageCount > 0 ? Math.round((token.usageCount / maxUsageCount) * 100) : 0;
        
        // Kullanım oranına göre renk belirle (0 olsa bile en azından danger rengi olsun)
        let usageBarColor;
        if (usagePercent > 75) {
            usageBarColor = 'success';
        } else if (usagePercent > 50) {
            usageBarColor = 'info';
        } else if (usagePercent > 25) {
            usageBarColor = 'warning';
        } else {
            usageBarColor = 'danger';
        }
        
        // 0 kullanım için asgari genişlik ayarla (en azından bir çizgi görünsün)
        const barWidth = usagePercent === 0 ? '5%' : `${usagePercent}%`;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="text-center">${rowNumber}</td>
            <td>${token.id}</td>
            <td>${createdBy}</td>
            <td>${createdAtFormatted}</td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="progress w-100" style="height: 24px; background-color: #f8f9fa; padding: 3px; border-radius: 5px; position: relative;">
                        <div class="progress-bar bg-${usageBarColor}" role="progressbar" 
                             style="width: ${barWidth}; border-radius: 3px; z-index: 1;" 
                             aria-valuenow="${token.usageCount}" 
                             aria-valuemin="0" 
                             aria-valuemax="${maxUsageCount}">
                        </div>
                        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; z-index: 2;">
                            <span style="font-weight: 500; color: white; text-shadow: 0px 0px 3px rgba(0,0,0,0.8);">
                                ${token.usageCount}/${maxUsageCount} (${usagePercent}%)
                            </span>
                        </div>
                    </div>
                </div>
            </td>
            <td><span class="badge bg-${statusClass}">${statusText}</span></td>
        `;
        
        // Çift tıklamayla token kopyalama özelliği ekle
        row.style.cursor = 'pointer';
        row.addEventListener('dblclick', () => copyToken(token.id));
        
        tableBody.appendChild(row);
    }
    
    // Geçerli sayfa numarasını güncelle
    guestTokenCurrentPage = pageNum;
    updateTokenPaginationControls();
}

// Token kopyala
function copyToken(tokenId) {
    navigator.clipboard.writeText(tokenId)
        .then(() => {
            alert('Token panoya kopyalandı: ' + tokenId);
        })
        .catch(err => {
            console.error('Token kopyalanırken hata oluştu:', err);
        });
}

// Token durumu değiştir
async function toggleTokenStatus(tokenId, newStatus) {
    try {
        const db = firebase.firestore();
        await db.collection('guestTokens').doc(tokenId).update({
            isActive: newStatus
        });
        
        // Tabloyu güncelle
        await loadTokenTable();
        
        alert(`Token durumu ${newStatus ? 'aktif' : 'pasif'} olarak güncellendi.`);
    } catch (error) {
        console.error('Token durumu güncellenirken hata:', error);
        alert('Bir hata oluştu: ' + error.message);
    }
}

// Önceki token sayfasına git
function gotoPrevTokenPage() {
    if (guestTokenCurrentPage > 1) {
        displayTokensPage(guestTokenCurrentPage - 1);
    }
}

// Sonraki token sayfasına git
function gotoNextTokenPage() {
    if (guestTokenCurrentPage < guestTokenTotalPages) {
        displayTokensPage(guestTokenCurrentPage + 1);
    }
}

// Guest Tokens sekmesine tıklandığında token tablosunu güncelle
document.addEventListener('DOMContentLoaded', function() {
    const guestTokensTabLink = document.querySelector('a[href="#guest-tokens"]');
    if (guestTokensTabLink) {
        guestTokensTabLink.addEventListener('click', function() {
            loadTokenTable();
        });
    }
    
    // Sayfalama butonlarına event listener ekle
    const prevTokenPageBtn = document.getElementById('prevTokenPage');
    const nextTokenPageBtn = document.getElementById('nextTokenPage');
    
    if (prevTokenPageBtn) {
        prevTokenPageBtn.addEventListener('click', gotoPrevTokenPage);
    }
    
    if (nextTokenPageBtn) {
        nextTokenPageBtn.addEventListener('click', gotoNextTokenPage);
    }
});

// Toplu token oluştur
async function generateBulkTokens(count) {
    try {
        // Token oluşturmaya başladığını bildir
        document.getElementById('generateTokensBtn').disabled = true;
        document.getElementById('generateTokensBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Oluşturuluyor...';
        
        const db = firebase.firestore();
        const batch = db.batch();
        const generatedTokens = [];
        
        // Kullanıcı bilgilerini al
        const currentUser = firebase.auth().currentUser;
        const userId = currentUser.uid;
        const creatorName = currentUser.displayName || currentUser.email || 'Bilinmeyen Kullanıcı';
        
        // İstenen sayıda token oluştur
        for (let i = 0; i < count; i++) {
            // Benzersiz token oluştur
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let token = '';
            for (let j = 0; j < 8; j++) {
                token += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            
            // Tokeni listeye ekle
            generatedTokens.push(token);
            
            // Firestore batch işlemine ekle
            const tokenRef = db.collection('guestTokens').doc(token);
            batch.set(tokenRef, {
                token: token,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: creatorName,
                creatorUserId: userId,
                usageCount: 0,
                maxUsageCount: 20,
                isActive: true
            });
        }
        
        // Batch işlemini çalıştır
        await batch.commit();
        
        // Token modalını kapat
        const modalElement = document.getElementById('createTokenModal');
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        modalInstance.hide();
        
        // Tokenların global değişkende sakla (indirme fonksiyonu için)
        window.lastGeneratedTokens = generatedTokens;
        
        // Toast mesajını oluştur
        const tokenText = count > 1 ? "tokenlar" : "token";
        document.getElementById('tokenToastMessage').textContent = `${count} adet ${tokenText} başarıyla oluşturuldu.`;
        
        // Toast'ı göster
        const tokenToast = new bootstrap.Toast(document.getElementById('tokenToast'));
        tokenToast.show();
        
        // Token tablosunu güncelle
        await loadTokenTable();
        
    } catch (error) {
        console.error('Token oluşturma hatası:', error);
        alert(`Token oluşturulurken bir hata oluştu: ${error.message}`);
    } finally {
        // Butonu eski haline getir
        document.getElementById('generateTokensBtn').disabled = false;
        document.getElementById('generateTokensBtn').innerHTML = 'Oluştur';
    }
}

// Oluşturulan tokenları Excel olarak indir
function downloadTokensAsExcel() {
    // Daha önce oluşturulan tokenlar yoksa uyarı ver
    if (!window.lastGeneratedTokens || window.lastGeneratedTokens.length === 0) {
        alert('İndirilecek token bulunamadı.');
        return;
    }
    
    try {
        // Excel formatında veri oluştur
        let csvContent = "Token\n";
        
        // Her token için satır ekle
        window.lastGeneratedTokens.forEach(token => {
            csvContent += token + "\n";
        });
        
        // Dosyayı indir
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // Dosya adını oluştur
        const date = new Date();
        const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
        const fileName = `tipbox-tokens-${formattedDate}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Token indirme hatası:', error);
        alert('Tokenlar indirilirken bir hata oluştu.');
    }
}

// DOM yüklendikten sonra token oluşturma ve indirme olaylarını ekle
document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...
    
    // Yeni token oluştur butonuna tıklandığında modalı aç
    const createTokenBtn = document.getElementById('createTokenBtn');
    if (createTokenBtn) {
        createTokenBtn.addEventListener('click', function() {
            const modal = new bootstrap.Modal(document.getElementById('createTokenModal'));
            modal.show();
        });
    }
    
    // Özel token oluştur butonuna tıklandığında modalı aç
    const createCustomTokenBtn = document.getElementById('createCustomTokenBtn');
    if (createCustomTokenBtn) {
        createCustomTokenBtn.addEventListener('click', function() {
            const modal = new bootstrap.Modal(document.getElementById('customTokenModal'));
            // Input alanını temizle
            const customTokenInput = document.getElementById('customTokenInput');
            if (customTokenInput) {
                customTokenInput.value = '';
            }
            modal.show();
        });
    }
    
    // Özel token input alanında kullanıcı yazdıkça büyük harfe çevir
    const customTokenInput = document.getElementById('customTokenInput');
    if (customTokenInput) {
        customTokenInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.toUpperCase();
        });
    }
    
    // Özel token oluşturma submit butonuna tıklama olayı
    const createCustomTokenSubmitBtn = document.getElementById('createCustomTokenSubmitBtn');
    if (createCustomTokenSubmitBtn) {
        createCustomTokenSubmitBtn.addEventListener('click', function() {
            const customTokenInput = document.getElementById('customTokenInput');
            if (!customTokenInput) return;
            
            const token = customTokenInput.value.trim().toUpperCase();
            
            // Token doğrulama işlemi
            if (token.length !== 8 || !(/^[A-Z0-9]{8}$/.test(token))) {
                showCustomTokenToast('Hata', 'Token 8 karakterli ve sadece harf ve sayılardan oluşmalıdır.', 'danger');
                return;
            }
            
            // Özel token oluşturma isteği gönder
            createCustomToken(token);
            
            // Modal'ı kapat
            const modal = bootstrap.Modal.getInstance(document.getElementById('customTokenModal'));
            if (modal) {
                modal.hide();
            }
        });
    }
    
    // Oluştur butonuna tıklandığında token oluştur
    const generateTokensBtn = document.getElementById('generateTokensBtn');
    if (generateTokensBtn) {
        generateTokensBtn.addEventListener('click', function() {
            const tokenCount = parseInt(document.getElementById('tokenCount').value);
            generateBulkTokens(tokenCount);
        });
    }
    
    // Excel indirme butonuna tıklandığında tokenleri indir
    const downloadTokensBtn = document.getElementById('downloadTokensBtn');
    if (downloadTokensBtn) {
        downloadTokensBtn.addEventListener('click', downloadTokensAsExcel);
    }
});

// Özel token oluşturma fonksiyonu
function createCustomToken(token) {
    // Kullanıcı bilgilerini al
    const currentUser = firebase.auth().currentUser;
    const userId = currentUser.uid;
    const creatorName = currentUser.displayName || currentUser.email || 'Bilinmeyen Kullanıcı';
    
    fetch('https://tipbox-docs-backend.vercel.app/auth/custom-token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            token: token,
            createdBy: creatorName,
            userId: userId
        })
    })
    .then(response => {
        // Önce yanıt durumunu kontrol et
        if (!response.ok) {
            throw new Error(`HTTP Hata: ${response.status}`);
        }
        
        // Content-Type'ı kontrol et
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            // Yanıtta JSON içeriği yoksa, JSON parse etmeye çalışma
            console.warn('API yanıtı JSON içermiyor:', contentType);
            return { success: false, error: 'Geçersiz sunucu yanıtı formatı' };
        }
        
        // Boş yanıtlar için özel kontrol
        if (response.status === 204 || response.headers.get('content-length') === '0') {
            console.warn('API boş yanıt döndürdü');
            return { success: false, error: 'Sunucu boş yanıt döndürdü' };
        }
        
        // JSON yanıtını parse et
        return response.json().catch(error => {
            console.error('JSON parse hatası:', error);
            throw new Error('Yanıt JSON formatında değil');
        });
    })
    .then(data => {
        if (data.status === 'success') {
            // API'dan dönen token değerini kullan (eğer varsa)
            const tokenToShow = data.token || token;
            showCustomTokenToast('Başarılı', data.message || `Özel token başarıyla oluşturuldu: ${tokenToShow}`, 'success');
            // Token listesini yenile
            loadTokenTable();
        } else {
            showCustomTokenToast('Hata', data.message || data.error || 'Token oluşturulurken bir hata oluştu.', 'danger');
        }
    })
    .catch(error => {
        console.error('Token oluşturma hatası:', error);
        showCustomTokenToast('Hata', 'Token oluşturulurken bir hata oluştu: ' + error.message, 'danger');
    });
}

// Özel token toast mesajını gösterme fonksiyonu
function showCustomTokenToast(title, message, type) {
    const toastEl = document.getElementById('customTokenToast');
    const toastTitle = document.getElementById('customTokenToastTitle');
    const toastMessage = document.getElementById('customTokenToastMessage');
    
    if (!toastEl || !toastTitle || !toastMessage) {
        console.error('Toast elementleri bulunamadı');
        return;
    }
    
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    
    // Toast tipine göre renk sınıfını ayarla
    toastEl.className = 'toast';
    if (type === 'danger') {
        toastEl.classList.add('bg-danger', 'text-white');
    } else if (type === 'success') {
        toastEl.classList.add('bg-success', 'text-white');
    } else {
        toastEl.classList.add('bg-light');
    }
    
    // Bootstrap toast öğesini göster
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

// Page Tracking sekmesine tıklandığında verileri yükle
document.addEventListener('DOMContentLoaded', function() {
    const pageTrackingTabLink = document.querySelector('a[href="#analytics"]');
    if (pageTrackingTabLink) {
        pageTrackingTabLink.addEventListener('click', function() {
            loadPageTrackingData();
        });
    }
});

// Page Tracking ile ilgili fonksiyonlar

// Analitik sayfası olay dinleyicilerini ayarla
function setupAnalyticsEventListeners() {
    // Kullanıcı seçimi değiştiğinde
    document.getElementById('userSelect').addEventListener('change', function() {
        const selectedUserId = this.value;
        
        if (selectedUserId) {
            // Kullanıcı seçildiğinde sayfalarını göster
            updateUserPageViewsChart(selectedUserId);
            
            // Zaman grafiği için sayfa numarasını sıfırla
            timeChartPage = 0;
            
            // Kullanıcı bilgisini göster
            const selectedUserName = this.options[this.selectedIndex].text;
            document.getElementById('selectedUserInfo').textContent = 'Seçili Kullanıcı: ' + selectedUserName;
        } else {
            // Kullanıcı seçilmediğinde grafiği temizle
            if (userPageViewsChart) {
                userPageViewsChart.destroy();
                userPageViewsChart = null;
            }
            if (userTimeBasedChart) {
                userTimeBasedChart.destroy();
                userTimeBasedChart = null;
            }
            
            // Kullanıcı grafiği yerine placeholder göster
            document.getElementById('userChartContainer').style.display = 'none';
            document.getElementById('userChartPlaceholder').style.display = 'block';
            
            // Kullanıcı bilgisini temizle
            document.getElementById('selectedUserInfo').textContent = '';
        }
    });
    
    // Önceki zaman verileri düğmesi
    document.getElementById('prevTimeDataBtn').addEventListener('click', function() {
        if (timeChartPage > 0) {
            timeChartPage--;
            updateTimeBasedChart();
        }
    });
    
    // Sonraki zaman verileri düğmesi
    document.getElementById('nextTimeDataBtn').addEventListener('click', function() {
        const maxPages = Math.ceil(filteredTimeData.length / timeChartPageSize);
        
        if (timeChartPage < maxPages - 1) {
            timeChartPage++;
            updateTimeBasedChart();
        }
    });
}

// Page Tracking verilerini yükle
async function loadPageTrackingData() {
    try {
        // Yükleniyor göster
        document.getElementById('pageViewsTableBody').innerHTML = '<tr><td colspan="4" class="text-center">Veriler yükleniyor...</td></tr>';
        
        // Firestore'dan pageViews koleksiyonunu al
        const pageViewsSnapshot = await db.collection('pageViews').get();
        
        if (pageViewsSnapshot.empty) {
            document.getElementById('pageViewsTableBody').innerHTML = '<tr><td colspan="4" class="text-center">Henüz sayfa görüntüleme kaydı bulunmuyor.</td></tr>';
            return;
        }
        
        // Verileri topla
        pageViewsData = [];
        pageViewsSnapshot.forEach(doc => {
            const data = doc.data();
            pageViewsData.push({
                id: doc.id,
                userId: data.userId,
                pageName: data.pageName,
                pageSlug: data.pageSlug,
                duration: data.duration,
                timestamp: data.timestamp ? new Date(data.timestamp.toDate()) : new Date(),
                processID: data.processID
            });
        });
        
        // Tarihe göre sırala (en yeniden en eskiye)
        pageViewsData.sort((a, b) => b.timestamp - a.timestamp);
        
        // Tüm kullanıcıları al ve kullanıcı dropdown'ını doldur
        await loadUsersForFilter();
        
        // Tabloya verileri göster
        displayPageViewsTableData();
        
        // Grafikleri güncelle
        updatePageViewsCharts();
        
        // Toplam görüntülenme süresini güncelle
        updateTotalViewTime();
        
        // Kullanıcı seçim alanını sıfırla ve placeholder'ı göster
        const userSelect = document.getElementById('userSelect');
        if (userSelect) {
            userSelect.value = '';
        }
        document.getElementById('userChartContainer').style.display = 'none';
        document.getElementById('userChartPlaceholder').style.display = 'block';
        
        // Varsa önceki grafikleri temizle
        if (userPageViewsChart) {
            userPageViewsChart.destroy();
            userPageViewsChart = null;
        }
        if (userTimeBasedChart) {
            userTimeBasedChart.destroy();
            userTimeBasedChart = null;
        }
    } catch (error) {
        console.error('Sayfa görüntüleme verileri yüklenirken hata:', error);
        document.getElementById('pageViewsTableBody').innerHTML = `<tr><td colspan="4" class="text-center text-danger">Hata: ${error.message}</td></tr>`;
    }
}

// Kullanıcıları al ve filtre dropdown'ını doldur
async function loadUsersForFilter() {
    try {
        // Firestore'dan kullanıcıları al
        const usersSnapshot = await db.collection('users').get();
        
        // Kullanıcı seçim dropdown'ını temizle ve varsayılan seçeneği ekle
        const userSelect = document.getElementById('userSelect');
        userSelect.innerHTML = '<option value="">-- Kullanıcı Seçiniz --</option>';
        userSelect.innerHTML += '<option value="all">Tüm Kullanıcılar</option>';
        
        // Verileri topla
        allUsers = [];
        usersSnapshot.forEach(doc => {
            const user = doc.data();
            allUsers.push({
                id: doc.id,
                displayName: user.displayName || user.email || 'İsimsiz Kullanıcı',
                email: user.email
            });
            
            // Dropdown'a kullanıcı ekle
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = user.displayName || user.email || 'İsimsiz Kullanıcı';
            userSelect.appendChild(option);
        });
        
        // Anonim kullanıcı seçeneği
        const anonOption = document.createElement('option');
        anonOption.value = 'anonymous';
        anonOption.textContent = 'Anonim Kullanıcılar';
        userSelect.appendChild(anonOption);
        
    } catch (error) {
        console.error('Kullanıcılar yüklenirken hata:', error);
    }
}

// Sayfa görüntüleme tablosuna verileri göster
function displayPageViewsTableData() {
    const tableBody = document.getElementById('pageViewsTableBody');
    tableBody.innerHTML = '';
    
    // Sayfalama için değerleri hesapla
    totalPageViewsPages = Math.ceil(pageViewsData.length / pageViewsPageSize);
    const startIndex = (pageViewsPage - 1) * pageViewsPageSize;
    const endIndex = Math.min(startIndex + pageViewsPageSize, pageViewsData.length);
    
    // Pagination bilgisini güncelle
    document.getElementById('pageViewsPagination').textContent = `Sayfa ${pageViewsPage} / ${totalPageViewsPages}`;
    
    // Pagination butonlarını güncelle
    document.getElementById('prevPageViewsPage').disabled = pageViewsPage === 1;
    document.getElementById('nextPageViewsPage').disabled = pageViewsPage === totalPageViewsPages || totalPageViewsPages === 0;
    
    // Eğer veri yoksa mesaj göster ve çık
    if (pageViewsData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Henüz sayfa görüntüleme kaydı bulunmuyor.</td></tr>';
        return;
    }
    
    // Sayfa için veri slice'ını al
    const pageData = pageViewsData.slice(startIndex, endIndex);
    
    // Her bir kayıt için tablo satırı oluştur
    pageData.forEach(view => {
        // Kullanıcı bilgisini bul
        const user = allUsers.find(u => u.id === view.userId);
        const userName = user ? user.displayName : (view.userId === 'anonymous' ? 'Anonim' : view.userId);
        
        // Tarih formatı
        const viewDate = view.timestamp.toLocaleString('tr-TR');
        
        // Tablo satırını oluştur
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${userName}</td>
            <td>${view.pageName}</td>
            <td>${view.duration} sn</td>
            <td>${viewDate}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Sayfa görüntüleme grafiklerini güncelle
function updatePageViewsCharts() {
    // Eğer daha önce grafikler oluşturulduysa, önce onları temizle
    if (pageViewsChart) {
        pageViewsChart.destroy();
    }
    
    // Sayfa adlarına göre süreleri topla
    const pageViewsStats = {};
    
    // Her bir kaydı işle
    pageViewsData.forEach(view => {
        const pageName = view.pageName;
        
        // Eğer sayfa istatistiği yoksa oluştur
        if (!pageViewsStats[pageName]) {
            pageViewsStats[pageName] = {
                totalDuration: 0,
                count: 0
            };
        }
        
        // Süreyi ve sayacı artır
        pageViewsStats[pageName].totalDuration += view.duration;
        pageViewsStats[pageName].count += 1;
    });
    
    // Grafik için verileri hazırla
    const labels = Object.keys(pageViewsStats);
    const durations = labels.map(page => pageViewsStats[page].totalDuration);
    
    // Renkleri hazırla
    const colors = generateChartColors(labels.length);
    
    // Pasta grafiği oluştur
    const ctx = document.getElementById('pageViewsChart').getContext('2d');
    pageViewsChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: durations,
                backgroundColor: colors,
                borderColor: '#fff',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        boxWidth: 12
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const totalDuration = value;
                            
                            // Süreyi daha okunabilir bir formata çevir
                            let durationText = '';
                            if (totalDuration >= 3600) {
                                const hours = Math.floor(totalDuration / 3600);
                                const minutes = Math.floor((totalDuration % 3600) / 60);
                                durationText = `${hours} saat ${minutes} dakika`;
                            } else if (totalDuration >= 60) {
                                const minutes = Math.floor(totalDuration / 60);
                                const seconds = totalDuration % 60;
                                durationText = `${minutes} dakika ${seconds} saniye`;
                            } else {
                                durationText = `${totalDuration} saniye`;
                            }
                            
                            return `${label}: ${durationText}`;
                        }
                    }
                }
            }
        }
    });
}

// Kullanıcı bazlı sayfa görüntüleme grafiğini güncelle
function updateUserPageViewsChart(userId) {
    // Eğer daha önce grafikler oluşturulduysa, önce onları temizle
    if (userPageViewsChart) {
        userPageViewsChart.destroy();
    }
    if (userTimeBasedChart) {
        userTimeBasedChart.destroy();
    }
    
    // Kullanıcı ID'si boş ise çık
    if (!userId) {
        document.getElementById('userChartContainer').style.display = 'none';
        document.getElementById('userChartPlaceholder').style.display = 'block';
        return;
    }
    
    // Filtrelenmiş verileri al
    let filteredData = [];
    
    if (userId === 'all') {
        // Tüm kullanıcılar için veri
        filteredData = [...pageViewsData];
    } else {
        // Belirli bir kullanıcı için veri
        filteredData = pageViewsData.filter(view => view.userId === userId);
    }
    
    // Eğer veri yoksa mesaj göster ve çık
    if (filteredData.length === 0) {
        const pieCtx = document.getElementById('userPageViewsChart').getContext('2d');
        pieCtx.clearRect(0, 0, pieCtx.canvas.width, pieCtx.canvas.height);
        pieCtx.font = '14px Arial';
        pieCtx.textAlign = 'center';
        pieCtx.fillStyle = '#999';
        pieCtx.fillText('Bu kullanıcı için görüntüleme verisi bulunmuyor', pieCtx.canvas.width / 2, pieCtx.canvas.height / 2);
        
        const timeCtx = document.getElementById('userTimeBasedChart').getContext('2d');
        timeCtx.clearRect(0, 0, timeCtx.canvas.width, timeCtx.canvas.height);
        timeCtx.font = '14px Arial';
        timeCtx.textAlign = 'center';
        timeCtx.fillStyle = '#999';
        timeCtx.fillText('Bu kullanıcı için zaman verisi bulunmuyor', timeCtx.canvas.width / 2, timeCtx.canvas.height / 2);
        
        // Kullanıcı graf konteynerini göster, placeholder'ı gizle
        document.getElementById('userChartContainer').style.display = 'block';
        document.getElementById('userChartPlaceholder').style.display = 'none';
        return;
    }
    
    // 1. Sayfa Dağılımı Grafiği için verileri hazırla
    const pageViewsStats = {};
    
    // Her bir kaydı işle
    filteredData.forEach(view => {
        const pageName = view.pageName;
        
        // Eğer sayfa istatistiği yoksa oluştur
        if (!pageViewsStats[pageName]) {
            pageViewsStats[pageName] = {
                totalDuration: 0,
                count: 0
            };
        }
        
        // Süreyi ve sayacı artır
        pageViewsStats[pageName].totalDuration += view.duration;
        pageViewsStats[pageName].count += 1;
    });
    
    // Pie grafik için verileri hazırla
    const pieLabels = Object.keys(pageViewsStats);
    const pieDurations = pieLabels.map(page => pageViewsStats[page].totalDuration);
    
    // Renkleri hazırla
    const colors = generateChartColors(pieLabels.length);
    
    // 2. Zamana Dayalı Görüntüleme Grafiği için verileri hazırla
    // Verileri zamana göre sıralayalım (en yeniden en eskiye)
    filteredData.sort((a, b) => b.timestamp - a.timestamp);
    
    // Her bir kaydı detaylı tarih/saat bilgisiyle hazırla
    filteredTimeData = filteredData.map(view => {
        const date = view.timestamp;
        const formattedTime = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        const formattedDate = date.toLocaleDateString('tr-TR');
        return {
            fullTimestamp: date,
            dateTime: `${formattedDate} ${formattedTime}`,
            duration: view.duration,
            pageName: view.pageName
        };
    });
    
    // Kullanıcı graf konteynerini göster, placeholder'ı gizle
    document.getElementById('userChartContainer').style.display = 'block';
    document.getElementById('userChartPlaceholder').style.display = 'none';
    
    // 1. Pie Chart oluştur (Sayfa dağılımı)
    const pieCtx = document.getElementById('userPageViewsChart').getContext('2d');
    userPageViewsChart = new Chart(pieCtx, {
        type: 'pie',
        data: {
            labels: pieLabels,
            datasets: [{
                data: pieDurations,
                backgroundColor: colors,
                borderColor: '#fff',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        boxWidth: 12
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const totalDuration = value;
                            
                            // Süreyi daha okunabilir bir formata çevir
                            let durationText = '';
                            if (totalDuration >= 3600) {
                                const hours = Math.floor(totalDuration / 3600);
                                const minutes = Math.floor((totalDuration % 3600) / 60);
                                durationText = `${hours} saat ${minutes} dakika`;
                            } else if (totalDuration >= 60) {
                                const minutes = Math.floor(totalDuration / 60);
                                const seconds = totalDuration % 60;
                                durationText = `${minutes} dakika ${seconds} saniye`;
                            } else {
                                durationText = `${totalDuration} saniye`;
                            }
                            
                            return `${label}: ${durationText}`;
                        }
                    }
                }
            }
        }
    });
    
    // 2. Zaman bazlı grafiği güncelle
    updateTimeBasedChart();
}

// Zaman bazlı grafiği güncelle (sayfalama dahil)
function updateTimeBasedChart() {
    // Önceki grafiği temizle
    if (userTimeBasedChart) {
        userTimeBasedChart.destroy();
    }
    
    // Eğer veri yoksa çık
    if (filteredTimeData.length === 0) {
        return;
    }
    
    // Mevcut sayfanın verilerini al
    const startIdx = timeChartPage * timeChartPageSize;
    const endIdx = Math.min(startIdx + timeChartPageSize, filteredTimeData.length);
    const pageData = filteredTimeData.slice(startIdx, endIdx);
    
    // Navigasyon butonlarını güncelle
    const prevBtn = document.getElementById('prevTimeDataBtn');
    const nextBtn = document.getElementById('nextTimeDataBtn');
    
    if (prevBtn) {
        prevBtn.disabled = timeChartPage === 0;
    }
    
    if (nextBtn) {
        const maxPages = Math.ceil(filteredTimeData.length / timeChartPageSize);
        nextBtn.disabled = timeChartPage >= maxPages - 1 || maxPages <= 1;
    }
    
    // Görselleştirme için veri hazırla
    const timeLabels = pageData.map(item => item.dateTime);
    const durations = pageData.map(item => item.duration);
    const pageNames = pageData.map(item => item.pageName);
    
    // Benzersiz sayfa adlarını al
    const uniquePages = [...new Set(pageNames)];
    
    // Sayfa adlarına göre renk haritası oluştur
    const pageColors = {};
    const colors = generateChartColors(uniquePages.length);
    uniquePages.forEach((page, index) => {
        pageColors[page] = colors[index];
    });
    
    // Her veri noktası için renk dizisi oluştur
    const pointBackgroundColors = pageData.map(item => {
        // Sayfa adına göre renk ata
        return pageColors[item.pageName];
    });
    
    // Line Chart oluştur
    const timeCtx = document.getElementById('userTimeBasedChart').getContext('2d');
    userTimeBasedChart = new Chart(timeCtx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [
                {
                    label: 'Görüntüleme Süresi (sn)',
                    data: durations,
                    borderColor: '#4BC0C0',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: pointBackgroundColors,
                    pointBorderColor: pointBackgroundColors,
                    pointHoverBackgroundColor: pointBackgroundColors,
                    pointHoverBorderColor: pointBackgroundColors,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Tarih ve Saat'
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Görüntüleme Süresi (sn)'
                    },
                    beginAtZero: true
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return context[0].label; // Tarih ve saat
                        },
                        afterTitle: function(context) {
                            const dataIndex = context[0].dataIndex;
                            return pageNames[dataIndex]; // Sayfa adı
                        },
                        label: function(context) {
                            let label = context.dataset.label || '';
                            
                            if (label) {
                                label += ': ';
                            }
                            
                            // Süre için özel formatlama
                            const duration = context.parsed.y;
                            if (duration >= 3600) {
                                const hours = Math.floor(duration / 3600);
                                const minutes = Math.floor((duration % 3600) / 60);
                                return label + `${hours} saat ${minutes} dakika`;
                            } else if (duration >= 60) {
                                const minutes = Math.floor(duration / 60);
                                const seconds = duration % 60;
                                return label + `${minutes} dakika ${seconds} saniye`;
                            } else {
                                return label + `${duration} saniye`;
                            }
                        }
                    }
                },
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        generateLabels: function(chart) {
                            // Özel lejant oluştur - sayfa adlarına göre
                            return uniquePages.map((page, index) => {
                                return {
                                    text: page,
                                    fillStyle: colors[index],
                                    strokeStyle: colors[index],
                                    lineWidth: 0,
                                    hidden: false
                                };
                            });
                        }
                    }
                }
            }
        }
    });
}

// Grafik için rastgele renkler oluştur
function generateChartColors(count) {
    // Önceden tanımlanmış renkler
    const predefinedColors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#8AC73E', '#F77825', '#00A8C6', '#D9534F',
        '#7FDBFF', '#2ECC40', '#FF4136', '#B10DC9', '#FF851B',
        '#39CCCC', '#3D9970', '#85144B', '#F012BE', '#AAAAAA'
    ];
    
    if (count <= predefinedColors.length) {
        return predefinedColors.slice(0, count);
    }
    
    // Yeterli önceden tanımlanmış renk yoksa, rastgele renkler oluştur
    const colors = [...predefinedColors];
    
    for (let i = predefinedColors.length; i < count; i++) {
        // Rastgele HSL değerleri (daha zengin renkler için)
        const h = Math.floor(Math.random() * 360); // Hue: 0-359
        const s = 70 + Math.floor(Math.random() * 30); // Saturation: 70-99%
        const l = 40 + Math.floor(Math.random() * 30); // Lightness: 40-69%
        
        colors.push(`hsl(${h}, ${s}%, ${l}%)`);
    }
    
    return colors;
}

// Toplam görüntülenme süresini güncelle
function updateTotalViewTime() {
    // Tüm süreleri topla
    let totalSeconds = 0;
    pageViewsData.forEach(view => {
        totalSeconds += view.duration;
    });
    
    // Saat, dakika, saniye olarak formatla
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    // Dashboard'da güncelle
    document.getElementById('totalViewTime').textContent = `${hours} sa ${minutes} dk ${seconds} sn`;
} 