import { Router } from 'express';
const r = Router();
r.get('/', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));
export default r;
