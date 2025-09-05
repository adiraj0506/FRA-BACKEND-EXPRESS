import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger';
import claims from './routes/claims';
import analyticsRoutes from './routes/analytics';

const app = express();
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));

app.use('/api/claims', claims);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/analytics", analyticsRoutes);

const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`API listening on :${port}`));

export default app;