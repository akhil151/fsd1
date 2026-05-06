import type { Response } from "express";
import Quiz from "../models/Quiz";
import MatchResult from "../models/MatchResult";
import StudentPerformance from "../models/StudentPerformance";
import type { AuthRequest } from "../middleware/protect";

// POST /api/quizzes — Create a new quiz
export const createQuiz = async (req: AuthRequest, res: Response): Promise<any> => {
    // SLOW DB SIMULATION
    if (process.env.SIMULATE_SLOW_DB === "true") {
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`[Controller] Executing createQuiz...`);

    const { title, questions, description, tags } = req.body;

        if (!title) {
            return res.status(400).json({ message: "Quiz title is required" }) as any;
        }

        const quiz = await Quiz.create({
            title,
            description,
            tags,
            creator: req.user!._id,
            questions: questions || [],
        });

    return res.status(201).json({ quiz }) as any;
};

// GET /api/quizzes — Get all quizzes by the logged-in teacher
export const getMyQuizzes = async (req: AuthRequest, res: Response): Promise<any> => {
    const quizzes = await Quiz.find({ creator: req.user!._id }).sort({
            createdAt: -1,
        });
    return res.json({ quizzes }) as any;
};

// DELETE /api/quizzes/:id — Delete a quiz (only its creator can)
export const deleteQuiz = async (req: AuthRequest, res: Response): Promise<any> => {
    const quiz = await Quiz.findById(req.params.id);

        if (!quiz) {
            return res.status(404).json({ message: "Quiz not found" }) as any;
        }

        if (String(quiz.creator) !== String(req.user!._id)) {
            return res.status(403).json({ message: "You can only delete your own quizzes" }) as any;
        }

    await quiz.deleteOne();
    return res.json({ message: "Quiz deleted successfully" }) as any;
};

// GET /api/quizzes/students/intelligence — Longitudinal Teacher View
export const getGlobalStudentIntelligence = async (req: AuthRequest, res: Response): Promise<any> => {
    // This returns performance for all students who have played the teacher's quizzes
    const studentPerf = await StudentPerformance.find()
        .populate("userId", "name email avatar")
        .sort({ updatedAt: -1 }) // Show recently active students first
        .lean();

    // Map to a more actionable "Intervention Center" format
    const actionableStudents = studentPerf.map(s => {
        const topWeakness = s.topicMastery.sort((a, b) => a.difficultyWeightedMastery - b.difficultyWeightedMastery)[0];
        
        return {
            ...s,
            interventionNeeded: s.riskLevel === "high" || s.riskLevel === "medium",
            primaryWeakness: topWeakness ? topWeakness.topic : "N/A",
            recentTrend: s.quizHistory.length >= 2 
                ? s.quizHistory[s.quizHistory.length - 1].accuracy - s.quizHistory[s.quizHistory.length - 2].accuracy
                : 0
        };
    });

    return res.json({ students: actionableStudents }) as any;
};

// GET /api/quizzes/:id/intelligence — Advanced Learning Analytics
export const getQuizIntelligence = async (req: AuthRequest, res: Response): Promise<any> => {
    const quizId = req.params.id;

    const results = await MatchResult.find({ quizId }).lean();
    const quiz = await Quiz.findById(quizId).lean();

    if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" }) as any;
    }

    if (results.length === 0) {
        return res.json({
            summary: { totalSessions: 0, avgAccuracy: 0, totalResponses: 0 },
            topicMastery: [],
            questionIntelligence: [],
            insights: ["No data available yet. Host a match to see insights."]
        }) as any;
    }

    // 1. Topic Mastery Analysis
    const topicStats: Record<string, { correct: number, total: number, avgTime: number }> = {};
    const questionStats: Record<number, { correct: number, total: number, distractors: Record<number, number>, avgTime: number }> = {};

    results.forEach(match => {
        match.responses.forEach(resp => {
            const qIndex = resp.questionIndex;
            const question = quiz.questions[qIndex];
            if (!question) return;

            // Topic Stats
            const topic = question.topic || "General";
            if (!topicStats[topic]) topicStats[topic] = { correct: 0, total: 0, avgTime: 0 };
            topicStats[topic].total++;
            if (resp.isCorrect) topicStats[topic].correct++;
            topicStats[topic].avgTime += resp.responseTimeMs;

            // Question Stats
            if (!questionStats[qIndex]) questionStats[qIndex] = { correct: 0, total: 0, distractors: {}, avgTime: 0 };
            questionStats[qIndex].total++;
            if (resp.isCorrect) questionStats[qIndex].correct++;
            else {
                questionStats[qIndex].distractors[resp.answerIndex] = (questionStats[qIndex].distractors[resp.answerIndex] || 0) + 1;
            }
            questionStats[qIndex].avgTime += resp.responseTimeMs;
        });
    });

    const topicMastery = Object.entries(topicStats).map(([name, stats]) => ({
        topic: name,
        accuracy: (stats.correct / stats.total) * 100,
        avgResponseTime: stats.avgTime / stats.total,
        totalAttempts: stats.total
    }));

    const questionIntelligence = Object.entries(questionStats).map(([idx, stats]) => ({
        index: parseInt(idx),
        text: quiz.questions[parseInt(idx)].text,
        accuracy: (stats.correct / stats.total) * 100,
        avgResponseTime: stats.avgTime / stats.total,
        commonDistractor: Object.entries(stats.distractors).sort((a, b) => b[1] - a[1])[0]?.[0]
    }));

    // 2. Behavioral Narrative Engine
    const insights: string[] = [];
    
    // Check for hard topics
    const hardTopic = topicMastery.sort((a, b) => a.accuracy - b.accuracy)[0];
    if (hardTopic && hardTopic.accuracy < 60) {
        insights.push(`Class is struggling with "${hardTopic.topic}" (${Math.round(hardTopic.accuracy)}% accuracy). Consider a remedial session.`);
    }

    // Check for "Kill Zone" questions
    const killZone = questionIntelligence.sort((a, b) => a.accuracy - b.accuracy)[0];
    if (killZone && killZone.accuracy < 40) {
        insights.push(`Question ${killZone.index + 1} stumped most students. Check if the distractors are too misleading.`);
    }

    // Check for overthinking (High accuracy but high response time)
    const overthinkingTopics = topicMastery.filter(t => t.accuracy > 80 && t.avgResponseTime > 8000);
    if (overthinkingTopics.length > 0) {
        insights.push(`Students are correct but hesitant in "${overthinkingTopics[0].topic}". Focus on building fluency.`);
    }

    return res.json({
        summary: {
            totalSessions: results.length,
            avgAccuracy: topicMastery.reduce((sum, t) => sum + t.accuracy, 0) / topicMastery.length,
            totalResponses: results.reduce((sum, m) => sum + m.responses.length, 0)
        },
        topicMastery,
        questionIntelligence,
        insights
    }) as any;
};
