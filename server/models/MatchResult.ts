import mongoose, { Schema, Document, Types } from "mongoose";

interface IResponseRecord {
    questionIndex: number;
    userId: string;
    answerIndex: number;
    isCorrect: boolean;
    responseTimeMs: number;
    timestamp: Date;
    hesitationDetected: boolean;
}

interface IPlayerResult {
    id: string;
    name: string;
    avatar?: string;
    score: number;
    accuracy: number;
    averageResponseTime: number;
}

export interface IMatchResult extends Document {
    quizId: Types.ObjectId | string;
    roomCode: string;
    players: IPlayerResult[];
    winner: IPlayerResult | null;
    responses: IResponseRecord[];
    sessionMetadata: {
        totalDurationMs: number;
        avgClassAccuracy: number;
        hardestQuestionIndex?: number;
    };
    createdAt: Date;
}

const ResponseRecordSchema = new Schema<IResponseRecord>(
    {
        questionIndex: { type: Number, required: true },
        userId: { type: String, required: true },
        answerIndex: { type: Number, required: true },
        isCorrect: { type: Boolean, required: true },
        responseTimeMs: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now },
        hesitationDetected: { type: Boolean, default: false },
    },
    { _id: false }
);

const PlayerResultSchema = new Schema<IPlayerResult>(
    {
        id: { type: String, required: true },
        name: { type: String, required: true },
        avatar: { type: String },
        score: { type: Number, required: true, default: 0 },
        accuracy: { type: Number, default: 0 },
        averageResponseTime: { type: Number, default: 0 },
    },
    { _id: false }
);

const MatchResultSchema = new Schema<IMatchResult>(
    {
        quizId: {
            type: Schema.Types.ObjectId,
            ref: "Quiz",
            required: true,
        },
        roomCode: {
            type: String,
            required: true,
            index: true,
        },
        players: {
            type: [PlayerResultSchema],
            default: [],
        },
        winner: {
            type: PlayerResultSchema,
            default: null,
        },
        responses: {
            type: [ResponseRecordSchema],
            default: [],
        },
        sessionMetadata: {
            totalDurationMs: { type: Number, default: 0 },
            avgClassAccuracy: { type: Number, default: 0 },
            hardestQuestionIndex: { type: Number },
        },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

MatchResultSchema.index({ quizId: 1, createdAt: -1 });

export default mongoose.model<IMatchResult>("MatchResult", MatchResultSchema);

