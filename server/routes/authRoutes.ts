import { Router } from "express";
import { register, login, getMe } from "../controllers/authController";
import { protect } from "../middleware/protect";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.get("/me", protect as any, asyncHandler(getMe));

export default router;
