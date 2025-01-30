// Firebase yapılandırması
const firebaseConfig = {
    // Firebase config
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Token yönetimi
async function createToken() {
    try {
        const response = await fetch('http://localhost:3000/auth/create-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Token oluşturulamadı');
        
        const data = await response.json();
        console.log('Token oluşturuldu:', data);
        loadTokens(); // Token listesini yenile
    } catch (error) {
        console.error('Token oluşturma hatası:', error);
        alert('Token oluşturulurken bir hata oluştu');
    }
}

// Token listesini yükle
function loadTokens() {
    const tokenListDiv = document.querySelector('.token-list');
    const tokensRef = db.ref('invite_codes');
    
    tokensRef.on('value', (snapshot) => {
        const tokens = [];
        tokenListDiv.innerHTML = '';
        
        snapshot.forEach((child) => {
            const token = child.val();
            token.code = child.key;
            tokens.push(token);
            
            const tokenItem = document.createElement('div');
            tokenItem.className = 'token-item';
            tokenItem.innerHTML = `
                <span class="token-code">${token.code}</span>
                <span class="token-usage">${token.used_count}/${token.max_uses} kullanım</span>
            `;
            tokenListDiv.appendChild(tokenItem);
        });
        
        updateTokenUsageChart(tokens);
    });
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
function loadUsers() {
    const userListDiv = document.querySelector('.user-list');
    const usersRef = db.ref('PageTimer');
    
    usersRef.on('value', (snapshot) => {
        userListDiv.innerHTML = '';
        
        snapshot.forEach((child) => {
            const userId = child.key;
            const userItem = document.createElement('a');
            userItem.href = '#';
            userItem.className = 'list-group-item';
            userItem.textContent = userId;
            userItem.onclick = (e) => {
                e.preventDefault();
                document.querySelectorAll('.user-list .list-group-item').forEach(item => {
                    item.classList.remove('active');
                });
                userItem.classList.add('active');
                loadUserStats(userId);
            };
            userListDiv.appendChild(userItem);
        });
    });
}

// Kullanıcı istatistiklerini yükle
function loadUserStats(userId) {
    const userRef = db.ref(`PageTimer/${userId}`);
    
    userRef.on('value', (snapshot) => {
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

// Sayfa kullanım grafiğini güncelle
function updatePageUsageChart() {
    const ctx = document.getElementById('pageUsageChart').getContext('2d');
    const total = Object.values(fakePageData.total_durations).reduce((a, b) => a + b, 0);
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Project Blueprint', 'Project Deck', 'Project Blurb', 'Tokeneconomics'],
            datasets: [{
                data: Object.values(fakePageData.total_durations).map(d => ((d / total) * 100).toFixed(1)),
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

// Kullanıcı grafiğini güncelle
function updateUserChart(userData) {
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

// Token kullanım grafiği
function updateTokenUsageChart(tokens) {
    const ctx = document.getElementById('tokenUsageChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: tokens.map(t => t.code),
            datasets: [{
                label: 'Kullanım',
                data: tokens.map(t => t.used_count),
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }, {
                label: 'Maksimum',
                data: tokens.map(t => t.max_uses),
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Event listeners
document.getElementById('createTokenBtn').addEventListener('click', createToken);

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    loadTokens();
    updatePageUsageChart();
    loadUsers();
}); 