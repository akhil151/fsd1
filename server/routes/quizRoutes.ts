import { Router } from "express";
import {
    createQuiz,
    getMyQuizzes,
    deleteQuiz,
} from "../controllers/quizController";
import { protect, teacherOnly } from "../middleware/protect";

const router = Router();

// All quiz routes require authentication and teacher role
router.use(protect as any, teacherOnly as any);

router.get("/", getMyQuizzes);
router.post("/", createQuiz);
router.delete("/:id", deleteQuiz);

export default router;
