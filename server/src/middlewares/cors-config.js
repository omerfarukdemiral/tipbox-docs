import cors from 'cors';
import 'dotenv/config';

// CORS yapılandırması
const corsOptions = {
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'https://tipbox-docs.web.app', '*'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};

export default cors(corsOptions); 