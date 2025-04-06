import cors from 'cors';
import 'dotenv/config';

// CORS yapılandırması
const corsOptions = {
    origin: process.env.CORS_ORIGINS.split(','),
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};

export default cors(corsOptions); 