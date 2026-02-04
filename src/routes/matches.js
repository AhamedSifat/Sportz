import { Router } from 'express';
import { createMatchSchema } from '../validation/matches.js';
import { db } from '../db/db.js';
import { matches } from '../db/schema.js';
import { getMatchStatus } from '../utils/match-status.js';

export const matchesRouter = Router();

matchesRouter.get('/', (req, res) => {
  res.status(200).json({ message: 'Matches list' });
});

matchesRouter.post('/', async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.errors });
  }

  try {
    const [event] = await db
      .insert(matches)
      .values({
        ...parsed.data,
        status: getMatchStatus(parsed.data.startTime, parsed.data.endTime),
        startTime: new Date(parsed.data.startTime),
        endTime: new Date(parsed.data.endTime),
        homeScore: parsed.data.homeScore ?? 0,
        awayScore: parsed.data.awayScore ?? 0,
      })
      .returning();
    return res.status(201).json({ data: event });
  } catch (error) {
    console.error('Error creating match:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});
