import express from "express";
import mongoose from "mongoose";

const router = express.Router();

router.get("/dbinfo", async (_req, res) => {
  const name = mongoose.connection.name;
  const collections = await mongoose.connection.db.listCollections().toArray();
  res.json({
    db: name,
    hasProviderPaymentMethods: collections.some(c =>
      ["providerpaymentmethods","providerPaymentMethods"].includes(c.name)
    ),
    collections: collections.map(c => c.name),
  });
});

router.get("/providers/:providerId", async (req, res) => {
  const names = ["providerpaymentmethods","providerPaymentMethods"];
  for (const coll of names) {
    const doc = await mongoose.connection.db
      .collection(coll)
      .findOne({ providerId: req.params.providerId, active: true });
    if (doc) return res.json({ collection: coll, doc });
  }
  res.status(404).json({ error: "NOT_FOUND" });
});

export default router;
