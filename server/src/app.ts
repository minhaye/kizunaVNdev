import express from 'express';
import cors from 'cors';
import { supabase } from './supabase.js';
import { registerRoutes } from './routes/index.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Chrome DevTools probes this endpoint in local development.
// Return 204 to avoid noisy 404 logs.
app.get('/.well-known/appspecific/com.chrome.devtools.json', (_req, res) => {
    res.status(204).end();
});

// Register routes
const router = express.Router();
registerRoutes(router);
app.use('/api', router);

// Dev debug: decode signed token payload (only in non-production)
if (process.env.NODE_ENV !== 'production') {
    app.post('/debug/decode-token', async (req, res) => {
        const { token } = req.body || {};
        if (!token || typeof token !== 'string') return res.status(400).json({ error: 'token required' });
        try {
            const [encoded, signature] = token.split('.');
            const payloadRaw = Buffer.from(encoded, 'base64url').toString('utf8');
            const expected = (await import('./env.js')).env.authTokenSecret;
            const crypto = (await import('node:crypto'));
            const expectedSig = crypto.createHmac('sha256', expected).update(encoded).digest('base64url');
            return res.json({ decoded: JSON.parse(payloadRaw), signature, expectedSig });
        } catch (err) {
            return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
        }
    });
}

// Health check endpoint
app.get('/check-db', async (req, res) => {
    const { data, error } = await supabase.from('employees').select('*').limit(1);

    if (error) {
        return res.json({
            status: "Lỗi kết nối",
            message: error.message
        });
    }

    return res.json({
        status: "Ngon lành!",
        message: "Đã kết nối được tới Supabase",
        data: data
    });
});

export default app;