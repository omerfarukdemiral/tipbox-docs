import express from 'express';
import { 
    linkedinLogin, 
    linkedinCallback, 
    guestLogin, 
    createToken, 
    searchUsers 
} from '../controllers/auth-controller.js';

const router = express.Router();

// LinkedIn OAuth rotaları
router.get('/linkedin', linkedinLogin);
router.get('/linkedin/callback', linkedinCallback);

// Misafir girişi rotası
router.post('/guest', guestLogin);

// Token oluşturma rotası
router.post('/create-token', createToken);

// Kullanıcı arama rotası
router.get('/search', searchUsers);

export default router; 