import { Router } from 'express';
import { create } from './assinatura.controller.js';

const router = Router();

router.post('/', create);

export default router;
