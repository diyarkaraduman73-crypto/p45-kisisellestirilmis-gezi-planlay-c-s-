// Express uygulaması (test edilebilmesi için sunucu başlatmadan ayrı tutulur).
import express from 'express';
import cors from 'cors';
import apiRouter from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { securityHeaders } from './middleware/security.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // Render bir proxy arkasında çalışır
const origins = (process.env.CORS_ORIGIN || '*').split(',').map((s) => s.trim());

app.use(cors({ origin: origins.includes('*') ? true : origins }));
app.use(securityHeaders);
app.use(express.json({ limit: '100kb' })); // aşırı büyük gövdeler reddedilir

app.get('/', (_req, res) => res.json({ name: 'P45 Gezi Planlayıcı API', health: '/api/health' }));
app.use('/api', apiRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
