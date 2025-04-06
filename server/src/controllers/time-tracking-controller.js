import admin from '../config/firebase.js';
import 'dotenv/config';

// Kullanıcı ID'lerine göre son istek zamanlarını saklayacak Map
const lastRequestTimes = new Map(); // userId -> timestamp
// Minimum istek aralığı
const MIN_REQUEST_INTERVAL = parseInt(process.env.MIN_REQUEST_INTERVAL);

// Timer verilerini kaydetmek için endpoint
export const saveTimeData = async (req, res) => {   
    try {
        const data = {
            userId: req.body.userId,
            page: req.body.page,
            duration: parseInt(req.body.duration),
            timestamp: req.body.timestamp
        };

        // Verileri kontrol et
        if (!data.userId || !data.page || !data.duration) {
            console.error('Eksik veri:', data);
            return res.status(400).send('Eksik veri');
        }

        // Son istek zamanını kontrol et
        const now = Date.now();
        const lastRequestTime = lastRequestTimes.get(data.userId) || 0;
        const timeSinceLastRequest = now - lastRequestTime;

        // Minimum istek aralığından önce gelen istekleri reddet
        if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
            console.log(`${data.userId} için çok erken istek (${Math.round(timeSinceLastRequest / 1000)} saniye). Reddedildi.`);
            return res.status(429).send('Çok sık istek gönderildi');
        }

        // Son istek zamanını güncelle
        lastRequestTimes.set(data.userId, now);

        // Firebase'e kaydet
        const newRecordRef = admin.database().ref(`PageTimer/${data.userId}/${data.page}`).push();
        await newRecordRef.set({
            timestamp: data.timestamp,
            duration: data.duration,
            page: data.page
        });

        console.log('Timer verisi kaydedildi:', data);
        res.status(200).send('OK');
    } catch (error) {
        console.error('Timer kayıt hatası:', error);
        res.status(500).send(error.message);
    }
};

// Son istek zamanlarını temizleme işlemi
export const cleanupLastRequestTimes = () => {
    const now = Date.now();
    for (const [userId, timestamp] of lastRequestTimes.entries()) {
        if (now - timestamp > MIN_REQUEST_INTERVAL * 2) {
            lastRequestTimes.delete(userId);
        }
    }
};

// Temizleme işlemini belirli aralıklarla çalıştır
setInterval(cleanupLastRequestTimes, MIN_REQUEST_INTERVAL * 2); 