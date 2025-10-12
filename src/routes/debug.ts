import express from "express";
import ProviderPaymentMethod from "../models/ProviderPaymentMethod";

const router = express.Router();

router.get("/providers", async (_req, res) => {
  const docs = await ProviderPaymentMethod.find({}).lean();
  res.json({ count: docs.length, docs });
});

router.get("/providers/:providerId", async (req, res) => {
  const doc = await ProviderPaymentMethod.findOne({
    providerId: req.params.providerId,
    active: true,
  }).lean();
  if (!doc) return res.status(404).json({ error: "NOT_FOUND" });
  res.json(doc);
});

export default router;
