import { Router } from "express";
import { rechargeFixerWallet } from "../controllers/walletController";

const router = Router();

// POST /api/wallet/recharge-fixer
router.post("/recharge-fixer", rechargeFixerWallet);

//jhoel FALTA
// GET /api/fixers/:fixerId/wallet
router.get("/fixers/:fixerId/wallet", async (req, res) => {
  const { fixerId } = req.params;
  try {
    // Lógica para obtener la data del wallet del fixer
    const walletData = await getWalletDataForFixer(fixerId); // función que debes implementar
    if (!walletData) {
      return res.status(404).json({ message: "Wallet no encontrado para el fixer" });
    }
    res.json(walletData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

//

export default router;
