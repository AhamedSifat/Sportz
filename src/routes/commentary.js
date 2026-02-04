import { Router } from 'express';
import { db } from '../db/db.js';
import { commentary } from '../db/schema.js';
import { matchIdParamSchema } from '../validation/matches.js';
import {
  createCommentarySchema,
  listCommentaryQuerySchema,
} from '../validation/commentary.js';
import { eq, desc } from 'drizzle-orm';

export const commentaryRouter = Router();
const MAX_LIMIT = 100;

commentaryRouter.get('/:matchId/commentary', async (req, res) => {
  try {
    const paramsResult = matchIdParamSchema.safeParse({
      id: req.params.matchId,
    });
    if (!paramsResult.success) {
      return res.status(400).json({
        error: 'Invalid match ID',
        details: paramsResult.error.issues,
      });
    }

    const queryResult = listCommentaryQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return res.status(400).json({
        error: 'Invalid query',
        details: queryResult.error.issues,
      });
    }

    const { id: matchId } = paramsResult.data;
    const { limit = 10 } = queryResult.data;

    const safeLimit = Math.min(limit, MAX_LIMIT);

    const events = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, matchId))
      .orderBy(desc(commentary.createdAt))
      .limit(safeLimit);

    return res.status(200).json({ data: events });
  } catch (error) {
    console.error('Error validating match ID:', error);
    return res.status(500).json({
      error: 'Failed to validate match ID',
      details: error.message,
    });
  }
});

commentaryRouter.post('/:matchId/commentary', async (req, res) => {
  try {
    const paramsResult = matchIdParamSchema.safeParse({
      id: req.params.matchId,
    });
    if (!paramsResult.success) {
      return res.status(400).json({
        error: 'Invalid match ID',
        details: paramsResult.error.issues,
      });
    }

    const bodyResult = createCommentarySchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({
        error: 'Invalid payload',
        details: bodyResult.error.issues,
      });
    }

    const { id: matchId } = paramsResult.data;
    const { minute, ...rest } = bodyResult.data;

    const [newCommentary] = await db
      .insert(commentary)
      .values({
        minute,
        ...rest,
        matchId,
      })
      .returning();

    if (res.locals.broadcastCommentary) {
      res.locals.broadcastCommentary(newCommentary.matchId, newCommentary);
    }

    return res.status(201).json({ data: newCommentary });
  } catch (error) {
    console.error('Error creating commentary:', error);
    return res.status(500).json({
      error: 'Failed to create commentary',
      details: error.message,
    });
  }
});
