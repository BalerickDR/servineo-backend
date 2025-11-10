import express from "express";
import { listJobs } from "../controllers/jobs.controller";

const router = express.Router();

router.get("/jobs", listJobs);

export default router;
