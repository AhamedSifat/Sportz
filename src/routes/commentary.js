import { Router } from 'express';
import { db } from '../db/db.js';
import { commentary } from '../db/schema.js';
import { matchIdParamSchema } from '../validation/matches.js';
import { createCommentarySchema } from '../validation/commentary.js';

export const commentaryRouter = Router();

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

    return res.status(201).json({ data: newCommentary });
  } catch (error) {
    console.error('Error creating commentary:', error);
    return res.status(500).json({
      error: 'Failed to create commentary',
      details: error.message,
    });
  }
});
