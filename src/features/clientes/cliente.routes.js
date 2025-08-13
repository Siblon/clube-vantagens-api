import { Router } from 'express';
import { create } from './cliente.controller.js';

const router = Router();

router.post('/', create);

export default router;
