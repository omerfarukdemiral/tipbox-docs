import express from 'express';
import passport from 'passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import session from 'express-session';
import axios from 'axios';
import admin from 'firebase-admin';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import 'dotenv/config';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Firebase Admin SDK'yı initialize et
const serviceAccount = {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
});

const app = express();
const port = process.env.PORT || 3000;

// CORS yapılandırması
const corsOptions = {
    origin: process.env.CORS_ORIGINS.split(','),
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};

// CORS middleware'ini ekle
app.use(cors(corsOptions));

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Passport serialization
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// LinkedIn OAuth2 strategy
passport.use('linkedin', new OAuth2Strategy({
    authorizationURL: process.env.LINKEDIN_AUTH_URL,
    tokenURL: process.env.LINKEDIN_TOKEN_URL,
    clientID: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackURL: process.env.LINKEDIN_CALLBACK_URL,
    scope: ['openid', 'profile', 'email'],
    authorizationParams: {
        prompt: 'login',
        response_type: 'code',
    }
}, async function(accessToken, refreshToken, params, profile, done) {
    console.log('Passport strategy callback başladı');
    try {
        // LinkedIn'den kullanıcı bilgilerini al
        const userInfoResponse = await axios.get(process.env.LINKEDIN_USER_INFO_URL, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const userInfo = userInfoResponse.data;
        console.log('User Info:', userInfo);

        // Firebase'de kullanıcı oluştur veya güncelle
        const firebaseUser = {
            uid: `linkedin:${userInfo.sub}`,
            email: userInfo.email,
            displayName: userInfo.name,
            photoURL: userInfo.picture,
            customClaims: {
                linkedinId: userInfo.sub,
                givenName: userInfo.given_name,
                familyName: userInfo.family_name,
                provider: 'linkedin'
            }
        };

        try {
            // Kullanıcıyı Firebase'de ara veya oluştur
            await admin.auth().getUser(firebaseUser.uid);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                // Kullanıcı yoksa oluştur
                await admin.auth().createUser(firebaseUser);
            }
        }

        // Custom claims güncelle
        await admin.auth().setCustomUserClaims(firebaseUser.uid, firebaseUser.customClaims);

        // Firebase custom token oluştur
        const firebaseToken = await admin.auth().createCustomToken(firebaseUser.uid);

        // Tüm bilgileri user nesnesine ekle
        return done(null, {
            ...firebaseUser,
            firebaseToken,
            accessToken
        });
    } catch (error) {
        console.error('Passport strategy error:', error);
        return done(error);
    }
}));

// Auth routes
app.get('/auth/linkedin', (req, res, next) => {
    const authParams = {
        prompt: 'login',
        response_type: 'code',
        state: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
        auth_type: 'reauthenticate',
        force_verify: 'true'
    };

    const params = new URLSearchParams({
        ...authParams,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        redirect_uri: process.env.LINKEDIN_CALLBACK_URL,
        scope: 'openid profile email',
    });

    res.redirect(`${process.env.LINKEDIN_AUTH_URL}?${params.toString()}`);
});

app.get('/auth/linkedin/callback', (req, res, next) => {
    console.log('LinkedIn callback alındı');
    passport.authenticate('linkedin', { session: false }, (err, user) => {
        if (err) {
            console.error('Authentication error:', err);
            return res.status(500).send('Authentication failed');
        }
        if (!user) {
            console.error('No user returned');
            return res.status(401).send('Authentication failed');
        }
        
        console.log('Authentication successful, user:', user);
        
        // Sadece gerekli bilgileri gönder
        const clientUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
        };

        res.send(`
            <script>
                try {
                    window.opener.postMessage({
                        type: 'linkedinAuthSuccess',
                        firebaseToken: '${user.firebaseToken}',
                        user: ${JSON.stringify(clientUser)}
                    }, 'http://127.0.0.1:5500');
                    // Callback penceresini kapat
                    window.close();
                } catch (error) {
                    console.error('postMessage hatası:', error);
                }
            </script>
        `);
    })(req, res, next);
});

// Misafir girişi için custom token oluşturma
app.post('/auth/guest', async (req, res) => {
    try {
        const { code } = req.body;
        
        // Kod kontrolü
        const codeSnapshot = await admin.database().ref('invite_codes/' + code).once('value');
        const codeData = codeSnapshot.val();

        if (!codeData || codeData.used_count >= codeData.max_uses) {
            return res.status(400).json({ error: 'Geçersiz veya kullanılmış kod' });
        }

        // Custom token oluştur
        const uid = `guest:${code}`;
        const customToken = await admin.auth().createCustomToken(uid, {
            provider: 'guest',
            inviteCode: code
        });

        res.json({ firebaseToken: customToken });
    } catch (error) {
        console.error('Guest auth error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Token oluşturma endpoint'i
app.post('/auth/create-token', async (req, res) => {
    try {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const tokenRef = admin.database().ref('invite_codes/' + code);
        
        await tokenRef.set({
            created_at: new Date().toISOString(),
            max_uses: 10,
            used_count: 0
        });

        res.json({ code: code });
    } catch (error) {
        console.error('Token oluşturma hatası:', error);
        res.status(500).json({ error: error.message });
    }
});

const upload = multer();

const lastRequestTimes = new Map(); // userId -> timestamp
// Minimum istek aralığı (10 saniye = 10000 ms)
const MIN_REQUEST_INTERVAL = parseInt(process.env.MIN_REQUEST_INTERVAL);

// Timer verilerini kaydetmek için endpoint
app.post('/api/save-time', upload.none(), async (req, res) => {   
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

        // 10 saniyeden önce gelen istekleri reddet
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
});

// Son istek zamanlarını temizlemek için (isteğe bağlı)
setInterval(() => {
    const now = Date.now();
    for (const [userId, timestamp] of lastRequestTimes.entries()) {
        if (now - timestamp > MIN_REQUEST_INTERVAL * 2) {
            lastRequestTimes.delete(userId);
        }
    }
}, MIN_REQUEST_INTERVAL * 2);

app.listen(port, () => {
    console.log(`Server ${port} portunda çalışıyor`);
}); 