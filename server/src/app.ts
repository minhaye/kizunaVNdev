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

// Dev debug routes removed

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