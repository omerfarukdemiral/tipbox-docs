import passport from 'passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import axios from 'axios';
import admin from '../config/firebase.js';
import 'dotenv/config';

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

export default passport; 