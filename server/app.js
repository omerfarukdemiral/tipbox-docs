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
    type: "service_account",
    project_id: "tipbox-docs",
    private_key_id: "402904f2b9362bcdb377c718108d76b7836e0ba5",
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCcvxooE/uSuOEx\nK/4EYEzPCR+L5vHKthY/wGMdubC6c/QLxjgz1GA0UAdaao3RI+CoXWWJDlSj6Lcz\n60Fj3NJj3V/DeYZJq10hgpHiTANL3c4niMjLQF1c0yBHU67hjssB+5Ev0/jq/OoX\ncpzsS0EcAx5sb7Z+rTbd/jdurwT8Dd6aHL+Utf3DpzXO5BbNnv2pfNc1i+9p8F5U\nURtJRe/dMSLiP0UKoe8NbRzM4Ud2tGf9wL4okTPiSy7R3NiAADZtvoSdZTtX/ulK\nDynGSYG2UDUfntYPVIG8WweVibxRnZeJ3yr+hudJkv53pml3PIvvlDFVbsbv6Mpr\ngzwtasUtAgMBAAECggEACkvfWvydDPFKEaHTKNRulzcBNH5yKZ+2bG+l0yEMg+L0\nCAX4USdFPop3QTA4qqFRs52W+t7PHok955IvlHC//UFgdgW4lYRFNNtP2+6kVMp4\nLU6l6fwLZfqUZzsPBNANc87jpaGl+0Gr2uhzeG4lE8L8r6DS+xVDwmddms6yZCAm\nw/9iwQQgQjfS7Dl49G7ewLTDT9ZPGNLVcnHpCN0FQerNEn5oQJ3MdsaUEtMEiSZP\nHUVmsgjazHmVZBBz8u2GYyzolvQ8j7QYywSSqeiTlYaLh/XsN6nZZU3QGyFGvjez\nLFix0kZW2buJYtMrkVjSGezAzLjPRb3BdPntv7vP4QKBgQDRpJG0f8LWVF32NnMP\nILr/9h97OVtzhqq/pRlpiuxpgtzvYlIfVm6iV4c9nEHdK3q55dkT2jL2t4rss1jr\nLUFKxBPvP3Ze3AvaKCexsNC6z3Qdb6qqtR5Veah4/ypBQzvCfUdka8wrHJukmwOt\nU9WsJ74DBeCsBtqrwHh4sdFy2QKBgQC/aC8fwIP/CXnS1GtASteNN3eF7qdcIAzQ\nYZfw2aQlqk6NdC7fPFB+F6g2/zOF4EF0UVF08H+b749TcdYMZrK2Ghk0Jgur53vc\nORL1HJfoX/vYB2ahW2Wffvu8JDxI1nVBGH5u7CgGkCHNcRardQZ0GnF2WuB3Kx6y\n7qG0OF6IdQKBgDbY8W3hxx2/8N1LnYqlq4bv44iflveAkgeVsDJWsEdif175wDaG\nrGc4sx9BVFIC4BbmtYZmHdNCbcxDl83fhyeCaRy848EpnMg0nT313oYhZGWXI3WJ\n8Se3roYJbAqrBmV51UXGliHpWCcWjz23oz1pIGM2FHOtT2SD9IDPNNbxAoGBAJ/7\nO5AFgA4V5H4ET9R/+aQt3TfTnozQuQUe3TlRH/LfYyK2Hks2BW0u5sl5Cp52Lx9C\nrJvaPD6gv6IWPrtEx1CPhcthlVXMeGk8Rw0aJhnyx/PrU6vAUbM7FrtNahnTLlQH\nXf3mYxoBNE+bm0AZ4xf91iH/mSfhoZoa/Is+pjzVAoGBALtNFXpwbTv/5DC39Bdy\n/OMtGc0jLcTynYe9ZHJOKZ0IaRc+6DaG7Ys960ygo9dpsQenYOEqYFXK6TUsgyDT\nV1jI901uk0qIM1gQElNqz8+pBhmumuY2HnBmKouwecFiKNabh6UrmuU7Xuz4Vf3d\nZHjyMNMeWa7ymWXAhxagn2DW\n-----END PRIVATE KEY-----\n",
    client_email: "firebase-adminsdk-fbsvc@tipbox-docs.iam.gserviceaccount.com",
    client_id: "108262318003452977587",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40tipbox-docs.iam.gserviceaccount.com",
    universe_domain: "googleapis.com"
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://tipbox-docs-default-rtdb.europe-west1.firebasedatabase.app"
});

const app = express();
const port = 3000;

// CORS yapılandırması
const corsOptions = {
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500'], // İzin verilen originler
    methods: ['GET', 'POST'], // İzin verilen HTTP metodları
    allowedHeaders: ['Content-Type', 'Authorization'], // İzin verilen headerlar
    credentials: true, // Credentials izni (cookies, authorization headers vb.)
    optionsSuccessStatus: 200 // Bazı tarayıcılar için 204 yerine 200 döndür
};

// CORS middleware'ini ekle
app.use(cors(corsOptions));

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
    secret: 'your-secret-key',
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
    authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
    clientID: '77vgx5tgbm3ojp',
    clientSecret: 'WPL_AP1.I26cbCm31pW87ihN.hNOvUg==',
    callbackURL: "http://localhost:3000/auth/linkedin/callback",
    scope: ['openid', 'profile', 'email'],
    authorizationParams: {
        prompt: 'login',
        response_type: 'code',
    }
}, async function(accessToken, refreshToken, params, profile, done) {
    console.log('Passport strategy callback başladı');
    try {
        // LinkedIn'den kullanıcı bilgilerini al
        const userInfoResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
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

    const baseUrl = 'https://www.linkedin.com/oauth/v2/authorization';
    const params = new URLSearchParams({
        ...authParams,
        client_id: '77vgx5tgbm3ojp',
        redirect_uri: 'http://localhost:3000/auth/linkedin/callback',
        scope: 'openid profile email',
    });

    res.redirect(`${baseUrl}?${params.toString()}`);
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
const MIN_REQUEST_INTERVAL = 10000;

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