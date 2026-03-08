import type { Response } from "express";
import Quiz from "../models/Quiz";
import type { AuthRequest } from "../middleware/protect";

// POST /api/quizzes — Create a new quiz
export const createQuiz = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { title, questions } = req.body;

        if (!title) {
            res.status(400).json({ message: "Quiz title is required" });
            return;
        }

        const quiz = await Quiz.create({
            title,
            creator: req.user!._id,
            questions: questions || [],
        });

        res.status(201).json({ quiz });
    } catch (err) {
        res.status(500).json({ message: (err as Error).message });
    }
};

// GET /api/quizzes — Get all quizzes by the logged-in teacher
export const getMyQuizzes = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const quizzes = await Quiz.find({ creator: req.user!._id }).sort({
            createdAt: -1,
        });
        res.json({ quizzes });
    } catch (err) {
        res.status(500).json({ message: (err as Error).message });
    }
};

// DELETE /api/quizzes/:id — Delete a quiz (only its creator can)
export const deleteQuiz = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const quiz = await Quiz.findById(req.params.id);

        if (!quiz) {
            res.status(404).json({ message: "Quiz not found" });
            return;
        }

        if (String(quiz.creator) !== String(req.user!._id)) {
            res.status(403).json({ message: "You can only delete your own quizzes" });
            return;
        }

        await quiz.deleteOne();
        res.json({ message: "Quiz deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: (err as Error).message });
    }
};
