import express from 'express';
import session from 'express-session';
import 'dotenv/config';
import passport from './middlewares/passport-config.js';
import corsMiddleware from './middlewares/cors-config.js';

// Rotalar
import authRoutes from './routes/auth-routes.js';
import timeTrackingRoutes from './routes/time-tracking-routes.js';

const app = express();
const port = process.env.PORT || 3000;

// CORS middleware'ini ekle
app.use(corsMiddleware);

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

// Rotaları tanımla
app.use('/auth', authRoutes);
app.use('/api', timeTrackingRoutes);

// Ana sayfa
app.get('/', (req, res) => {
    res.send('Tipbox API Sunucusu Çalışıyor');
});

// Sunucuyu başlat
app.listen(port, () => {
    console.log(`Server ${port} portunda çalışıyor`);
}); 