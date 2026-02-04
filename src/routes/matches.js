import { Router } from 'express';
import {
  createMatchSchema,
  listMatchesQuerySchema,
} from '../validation/matches.js';
import { db } from '../db/db.js';
import { matches } from '../db/schema.js';
import { getMatchStatus } from '../utils/match-status.js';
import { desc } from 'drizzle-orm';

export const matchesRouter = Router();
const MAX_LIMIT = 100;

matchesRouter.get('/', async (req, res) => {
  const parsed = listMatchesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ errors: 'Invalid query', details: parsed.error.issues });
  }

  const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

  try {
    const events = await db
      .select()
      .from(matches)
      .orderBy(desc(matches.createdAt))
      .limit(limit);
    return res.status(200).json({ data: events });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to list matches' });
  }
});

matchesRouter.post('/', async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ errors: 'Invalid playload', details: parsed.error.issues });
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
    return res
      .status(500)
      .json({ error: 'Failed to create match', details: error.message });
  }
});
