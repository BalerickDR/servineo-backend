import { Router } from 'express';
import * as JobController from '../controllers/jobsPayments.controller';

const router = Router();

router.get("/jobs", JobController.listJobs);
export default router;
