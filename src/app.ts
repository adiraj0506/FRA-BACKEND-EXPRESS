import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger';
import health from './routes/health';
import claims from './routes/claims';

const app = express();
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));

app.use('/health', health);
app.use('/api/claims', claims);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`API listening on :${port}`));

export default app;