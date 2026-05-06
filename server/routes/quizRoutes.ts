import { Router } from "express";
import {
    createQuiz,
    getMyQuizzes,
    deleteQuiz,
    getQuizIntelligence,
    getGlobalStudentIntelligence,
} from "../controllers/quizController";
import MatchResult from "../models/MatchResult";
import { protect, teacherOnly } from "../middleware/protect";

import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

// All quiz routes require authentication and teacher role
router.use(protect as any, teacherOnly as any);

router.get("/", asyncHandler(getMyQuizzes));
router.post("/", asyncHandler(createQuiz));
router.get("/students/intelligence", asyncHandler(getGlobalStudentIntelligence));
router.delete("/:id", asyncHandler(deleteQuiz));
router.get("/:id/intelligence", asyncHandler(getQuizIntelligence));

// Simple analytics endpoint for match results related to a quiz
router.get("/:id/analytics", asyncHandler(async (req, res): Promise<any> => {
    const quizId = req.params.id;

    const results = await MatchResult.find({ quizId })
        .sort({ createdAt: -1 })
        .lean();

    return res.json({
        success: true,
        results,
    });
}));

export default router;
