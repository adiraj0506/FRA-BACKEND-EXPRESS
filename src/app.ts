import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger';
import claimsRouter from './routes/claims';
import analyticsRoutes from './routes/analytics';

const app = express();

// Global timeout middleware
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    res.status(408).json({ error: 'Request timeout' });
  });
  next();
});

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: '✅ FRA Backend API is running...',
    version: '1.0.0',
    endpoints: {
      claims: '/api/claims',
      analytics: '/api/analytics',
      documentation: '/docs',
      health: '/api/health'
    }
  });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const { pool } = await import('./db/pool');
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: err instanceof Error ? err.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

app.use('/api/claims', claimsRouter);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/analytics", analyticsRoutes);

const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`API listening on :${port}`));

export default app;