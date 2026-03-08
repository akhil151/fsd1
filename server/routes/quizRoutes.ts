import { Router } from "express";
import {
    createQuiz,
    getMyQuizzes,
    deleteQuiz,
} from "../controllers/quizController";
import MatchResult from "../models/MatchResult";
import { protect, teacherOnly } from "../middleware/protect";

const router = Router();

// All quiz routes require authentication and teacher role
router.use(protect as any, teacherOnly as any);

router.get("/", getMyQuizzes);
router.post("/", createQuiz);
router.delete("/:id", deleteQuiz);

// Simple analytics endpoint for match results related to a quiz
router.get("/:id/analytics", async (req, res) => {
    try {
        const quizId = req.params.id;

        const results = await MatchResult.find({ quizId })
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            results,
        });
    } catch (err: any) {
        res.status(500).json({
            success: false,
            message: "Failed to load analytics",
        });
    }
});

export default router;
