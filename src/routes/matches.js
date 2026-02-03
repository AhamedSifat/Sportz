import { Router } from 'express';

export const matchesRouter = Router();

matchesRouter.get('/', (req, res) => {
  res.status(200).json({ message: 'Matches list' });
});
