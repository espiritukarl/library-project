import { Router } from 'express';

import { authRouter } from './auth';
import { booksRouter } from './books';
import { userRouter } from './user';

export const router = Router();

router.get('/', (_req, res) => {
  res.json({ message: 'API root' });
});

router.use('/auth', authRouter);
router.use('/books', booksRouter);
router.use('/user', userRouter);
