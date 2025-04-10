import admin from '../config/firebase.js';
import passport from '../middlewares/passport-config.js';

// LinkedIn oturum açma başlatma fonksiyonu
export const linkedinLogin = (req, res) => {
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
};

// LinkedIn callback işleme fonksiyonu
export const linkedinCallback = (req, res, next) => {
    passport.authenticate('linkedin', { session: false }, async (err, user) => {
        if (err) {
            return res.status(500).send('Authentication failed');
        }
        if (!user) {
            return res.status(401).send('Authentication failed');
        }        
        try {
            // Firestore'da kullanıcı kontrolü ve oluşturma
            const firestore = admin.firestore();
            const userRef = firestore.collection('users').doc(user.uid);
            
            // Kullanıcı dokümanını kontrol et
            const userDoc = await userRef.get();
            
            if (!userDoc.exists) {
                // Kullanıcı ilk defa giriş yapıyor, Firestore'a kaydet
                await userRef.set({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    provider: 'linkedin',
                    role: 'user', // Default rol
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    lastLoginAt: admin.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Kullanıcı zaten var, son giriş zamanını güncelle
                await userRef.update({
                    lastLoginAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            
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
        } catch (error) {
            return res.status(500).send('İşlem sırasında hata oluştu');
        }
    })(req, res, next);
};

// Misafir girişi için custom token oluşturma
export const guestLogin = async (req, res) => {
    try {
        const { code } = req.body;
        console.log("Giriş için kullanılan token:", code);
        
        // Kod kontrolü - Firestore'dan al
        const tokenDoc = await admin.firestore().collection('guestTokens').doc(code).get();
        
        console.log("Token dokümanı mevcut mu:", tokenDoc.exists);
        
        if (!tokenDoc.exists) {
            console.log("Token bulunamadı:", code);
            return res.status(400).json({ error: 'Geçersiz kod' });
        }
        
        const tokenData = tokenDoc.data();
        console.log("Token verileri:", JSON.stringify(tokenData));
        
        if (!tokenData.isActive) {
            console.log("Token aktif değil");
            return res.status(400).json({ error: 'Bu kod artık aktif değil' });
        }
        
        if (tokenData.usageCount >= tokenData.maxUsageCount) {
            console.log("Token maksimum kullanım sayısına ulaşmış");
            return res.status(400).json({ error: 'Bu kod maksimum kullanım sayısına ulaşmış' });
        }

        // Kullanım sayısını artır
        try {
            console.log("Kullanım sayısı artırılıyor...");
            await admin.firestore().collection('guestTokens').doc(code).update({
                usageCount: admin.firestore.FieldValue.increment(1),
                lastUsedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log("Kullanım sayısı başarıyla artırıldı");
        } catch (updateError) {
            console.error("Kullanım sayısı artırılırken hata:", updateError);
            // Hata olsa da devam et, kullanıcının girişini engellemek istemiyoruz
        }

        // Custom token oluştur
        const uid = `guest:${code}`;
        const customToken = await admin.auth().createCustomToken(uid, {
            provider: 'guest',
            inviteCode: code
        });

        console.log("Custom token oluşturuldu");
        res.json({ firebaseToken: customToken });
    } catch (error) {
        console.error("Guest login hatası:", error);
        res.status(500).json({ error: error.message });
    }
};

// Token oluşturma endpoint'i
export const createToken = async (req, res) => {
    try {
        // 8 karakter uzunluğunda bir token oluştur
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        // Firestore'a kaydet
        await admin.firestore().collection('guestTokens').doc(code).set({
            token: code,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: req.user?.uid || 'system',
            usageCount: 0,
            maxUsageCount: 20,
            isActive: true
        });

        res.json({ code: code });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Toplu token oluşturma endpoint'i (20 adet)
export const createBulkTokens = async (req, res) => {
    try {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const tokensToCreate = 20;
        const createdTokens = [];
        const firestore = admin.firestore();
        const batch = firestore.batch();
        
        // 20 adet token oluştur
        for (let i = 0; i < tokensToCreate; i++) {
            let code = '';
            for (let j = 0; j < 8; j++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            
            // Batch işlemine ekle
            const docRef = firestore.collection('guestTokens').doc(code);
            batch.set(docRef, {
                token: code,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: req.user?.uid || 'system',
                usageCount: 0,
                maxUsageCount: 20,
                isActive: true
            });
            
            createdTokens.push(code);
        }
        
        // Batch işlemini uygula
        await batch.commit();
        console.log("20 adet token başarıyla oluşturuldu:", createdTokens);
        
        res.json({ 
            success: true, 
            message: '20 adet token başarıyla oluşturuldu', 
            tokens: createdTokens 
        });
    } catch (error) {
        console.error("Toplu token oluşturma hatası:", error);
        res.status(500).json({ error: error.message });
    }
};

// Kullanıcı arama endpoint'i
export const searchUsers = async (req, res) => {
    try {
        const query = req.query.q?.toLowerCase() || '';

        // Boş sorgu kontrolü
        if (!query || query.length < 2) {
            return res.json([]);
        }

        const listUsersResult = await admin.auth().listUsers(1000); // Maksimum 1000 kullanıcı
        const users = listUsersResult.users.filter(user => {
            const email = user.email?.toLowerCase() || '';
            const uid = user.uid?.toLowerCase() || '';
            const displayName = user.displayName?.toLowerCase() || '';
            
            return email.includes(query) || 
                   uid.includes(query) || 
                   displayName.includes(query);
        });

        const sanitizedUsers = users.map(user => ({
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            provider: user.providerData[0]?.providerId || 'unknown'
        }));

        res.json(sanitizedUsers);
    } catch (error) {
        res.status(500).json({ 
            error: 'Kullanıcılar listelenirken bir hata oluştu',
            details: error.message 
        });
    }
}; 