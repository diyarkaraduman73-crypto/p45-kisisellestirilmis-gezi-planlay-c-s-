// Express uygulaması (test edilebilmesi için sunucu başlatmadan ayrı tutulur).
import express from 'express';
import cors from 'cors';
import apiRouter from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();
const origins = (process.env.CORS_ORIGIN || '*').split(',').map((s) => s.trim());

app.use(cors({ origin: origins.includes('*') ? true : origins }));
app.use(express.json());

app.get('/', (_req, res) => res.json({ name: 'P45 Gezi Planlayıcı API', health: '/api/health' }));
app.use('/api', apiRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
