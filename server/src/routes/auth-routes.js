import express from 'express';
import { 
    linkedinLogin, 
    linkedinCallback, 
    guestLogin, 
    createToken, 
    createBulkTokens,
    searchUsers 
} from '../controllers/auth-controller.js';

const router = express.Router();

// LinkedIn OAuth rotaları
router.get('/linkedin', linkedinLogin);
router.get('/linkedin/callback', linkedinCallback);

// Misafir girişi rotası
router.post('/guest', guestLogin);

// Token oluşturma rotaları
router.post('/create-token', createToken);
router.post('/create-bulk-tokens', createBulkTokens);

// Kullanıcı arama rotası
router.get('/search', searchUsers);

export default router; 