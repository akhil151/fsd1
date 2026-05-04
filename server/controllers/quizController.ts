import type { Response } from "express";
import Quiz from "../models/Quiz";
import type { AuthRequest } from "../middleware/protect";

// POST /api/quizzes — Create a new quiz
export const createQuiz = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { title, questions } = req.body;

        if (!title) {
            return res.status(400).json({ message: "Quiz title is required" }) as any;
        }

        const quiz = await Quiz.create({
            title,
            creator: req.user!._id,
            questions: questions || [],
        });

        return res.status(201).json({ quiz }) as any;
    } catch (err) {
        return res.status(500).json({ message: (err as Error).message }) as any;
    }
};

// GET /api/quizzes — Get all quizzes by the logged-in teacher
export const getMyQuizzes = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const quizzes = await Quiz.find({ creator: req.user!._id }).sort({
            createdAt: -1,
        });
        return res.json({ quizzes }) as any;
    } catch (err) {
        return res.status(500).json({ message: (err as Error).message }) as any;
    }
};

// DELETE /api/quizzes/:id — Delete a quiz (only its creator can)
export const deleteQuiz = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const quiz = await Quiz.findById(req.params.id);

        if (!quiz) {
            return res.status(404).json({ message: "Quiz not found" }) as any;
        }

        if (String(quiz.creator) !== String(req.user!._id)) {
            return res.status(403).json({ message: "You can only delete your own quizzes" }) as any;
        }

        await quiz.deleteOne();
        return res.json({ message: "Quiz deleted successfully" }) as any;
    } catch (err) {
        return res.status(500).json({ message: (err as Error).message }) as any;
    }
};
