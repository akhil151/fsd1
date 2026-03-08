import { Router } from "express";
import { register, login, getMe } from "../controllers/authController";
import { protect } from "../middleware/protect";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect as any, getMe);

export default router;
