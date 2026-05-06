import mongoose, { Schema, Document, Types } from "mongoose";

export interface ITopicMastery {
    topic: string;
    accuracy: number;
    avgResponseTimeMs: number;
    totalAttempts: number;
    lastAttemptAt: Date;
    confidenceScore: number; // 0 to 1 based on sample size and consistency
    difficultyWeightedMastery: number; // mastery adjusted for question difficulty
}

export interface IBehavioralPattern {
    patternType: "rushing" | "hesitation" | "focus_drop" | "consistency";
    frequency: number; // 0 to 1
    description: string;
    confidence: "high" | "medium" | "low";
}

export interface IRetentionMetric {
    topic: string;
    retentionStrength: number; // 0 to 1 (decaying over time)
    lastReinforcedAt: Date;
}

export interface IQuizSnapshot {
    quizId: Types.ObjectId;
    accuracy: number;
    score: number;
    avgResponseTimeMs: number;
    date: Date;
}

export interface IStudentPerformance extends Document {
    userId: Types.ObjectId;
    totalQuizzesPlayed: number;
    globalAccuracy: number;
    globalAvgResponseTimeMs: number;
    topicMastery: ITopicMastery[];
    behavioralPatterns: IBehavioralPattern[];
    retentionMetrics: IRetentionMetric[];
    quizHistory: IQuizSnapshot[];
    recommendations: {
        text: string;
        priority: "high" | "medium" | "low";
        reason: string;
        confidence: number;
    }[];
    riskLevel: "high" | "medium" | "low";
    updatedAt: Date;
}

const StudentPerformanceSchema = new Schema<IStudentPerformance>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true,
        },
        totalQuizzesPlayed: { type: Number, default: 0 },
        globalAccuracy: { type: Number, default: 0 },
        globalAvgResponseTimeMs: { type: Number, default: 0 },
        topicMastery: [
            {
                topic: { type: String, required: true },
                accuracy: { type: Number, default: 0 },
                avgResponseTimeMs: { type: Number, default: 0 },
                totalAttempts: { type: Number, default: 0 },
                lastAttemptAt: { type: Date, default: Date.now },
                confidenceScore: { type: Number, default: 0 },
                difficultyWeightedMastery: { type: Number, default: 0 },
            },
        ],
        behavioralPatterns: [
            {
                patternType: {
                    type: String,
                    enum: ["rushing", "hesitation", "focus_drop", "consistency"],
                },
                frequency: { type: Number, default: 0 },
                description: { type: String },
                confidence: { type: String, enum: ["high", "medium", "low"], default: "low" },
            },
        ],
        retentionMetrics: [
            {
                topic: { type: String, required: true },
                retentionStrength: { type: Number, default: 1 },
                lastReinforcedAt: { type: Date, default: Date.now },
            },
        ],
        quizHistory: [
            {
                quizId: { type: Schema.Types.ObjectId, ref: "Quiz" },
                accuracy: { type: Number },
                score: { type: Number },
                avgResponseTimeMs: { type: Number },
                date: { type: Date, default: Date.now },
            },
        ],
        recommendations: [
            {
                text: { type: String },
                priority: { type: String, enum: ["high", "medium", "low"] },
                reason: { type: String },
                confidence: { type: Number },
            },
        ],
        riskLevel: { type: String, enum: ["high", "medium", "low"], default: "low" },
    },
    { timestamps: true }
);

// Indexes for teacher search and analytics
StudentPerformanceSchema.index({ globalAccuracy: -1 });
StudentPerformanceSchema.index({ updatedAt: -1 });

export default mongoose.model<IStudentPerformance>(
    "StudentPerformance",
    StudentPerformanceSchema
);
