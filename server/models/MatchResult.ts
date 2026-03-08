import mongoose, { Schema, Document, Types } from "mongoose";

interface IPlayerResult {
    id: string;
    name: string;
    avatar?: string;
    score: number;
}

export interface IMatchResult extends Document {
    quizId: Types.ObjectId | string;
    roomCode: string;
    players: IPlayerResult[];
    winner: IPlayerResult | null;
    createdAt: Date;
}

const PlayerResultSchema = new Schema<IPlayerResult>(
    {
        id: { type: String, required: true },
        name: { type: String, required: true },
        avatar: { type: String },
        score: { type: Number, required: true, default: 0 },
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
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<IMatchResult>("MatchResult", MatchResultSchema);

