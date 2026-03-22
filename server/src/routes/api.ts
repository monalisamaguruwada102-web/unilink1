import { Router } from 'express';
import usersRouter from './users';
import matchesRouter from './matches';
import communityRouter from './community';

const router = Router();

// API grouping
router.use('/users', usersRouter);
router.use('/matches', matchesRouter);
router.use('/community', communityRouter);

export default router;
