import express from 'express';
import multer from 'multer';
import { saveTimeData } from '../controllers/time-tracking-controller.js';

const router = express.Router();
const upload = multer();

// Timer verilerini kaydetmek için endpoint
router.post('/save-time', upload.none(), saveTimeData);

export default router; 