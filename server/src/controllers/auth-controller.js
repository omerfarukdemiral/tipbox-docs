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
    console.log('LinkedIn callback alındı');
    passport.authenticate('linkedin', { session: false }, async (err, user) => {
        if (err) {
            console.error('Authentication error:', err);
            return res.status(500).send('Authentication failed');
        }
        if (!user) {
            console.error('No user returned');
            return res.status(401).send('Authentication failed');
        }
        
        console.log('Authentication successful, user:', user);
        
        try {
            // Firestore'da kullanıcı kontrolü ve oluşturma
            const firestore = admin.firestore();
            const userRef = firestore.collection('users').doc(user.uid);
            
            // Kullanıcı dokümanını kontrol et
            const userDoc = await userRef.get();
            
            if (!userDoc.exists) {
                // Kullanıcı ilk defa giriş yapıyor, Firestore'a kaydet
                console.log(`İlk kez giriş yapan kullanıcı için Firestore kaydı oluşturuluyor: ${user.uid}`);
                
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
                
                console.log(`Kullanıcı Firestore'a kaydedildi: ${user.uid}`);
            } else {
                // Kullanıcı zaten var, son giriş zamanını güncelle
                console.log(`Var olan kullanıcı girişi: ${user.uid}`);
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
            console.error('Firestore işlem hatası:', error);
            return res.status(500).send('İşlem sırasında hata oluştu');
        }
    })(req, res, next);
};

// Misafir girişi için custom token oluşturma
export const guestLogin = async (req, res) => {
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
};

// Token oluşturma endpoint'i
export const createToken = async (req, res) => {
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
};

// Kullanıcı arama endpoint'i
export const searchUsers = async (req, res) => {
    try {
        const query = req.query.q?.toLowerCase() || '';
        console.log("Arama sorgusu:", query);

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

        console.log(`${users.length} kullanıcı bulundu`);

        const sanitizedUsers = users.map(user => ({
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            provider: user.providerData[0]?.providerId || 'unknown'
        }));

        res.json(sanitizedUsers);
    } catch (error) {
        console.error('Kullanıcı arama hatası:', error);
        res.status(500).json({ 
            error: 'Kullanıcılar listelenirken bir hata oluştu',
            details: error.message 
        });
    }
}; 