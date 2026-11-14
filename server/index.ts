import cors from 'cors';
import express from 'express';
import { db } from './db.ts';

export const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number })?.count ?? 0;
  res.json({
    status: 'ok',
    message: 'Blank starter server is running.',
    usersCount: userCount,
  });
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}
