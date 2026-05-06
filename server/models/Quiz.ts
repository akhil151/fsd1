import mongoose, { Schema, Document, Types } from "mongoose";

export interface IQuestion {
    text: string;
    options: string[];
    correctAnswer: number; // index into options
    difficulty: "easy" | "medium" | "hard" | "beginner" | "intermediate" | "advanced" | "expert";
    topic?: string;
    subtopic?: string;
}

export interface IQuiz extends Document {
    title: string;
    description?: string;
    creator: Types.ObjectId;
    questions: IQuestion[];
    playCount: number;
    tags?: string[];
}

const QuestionSchema = new Schema<IQuestion>({
    text: { type: String, required: true },
    options: {
        type: [String],
        required: true,
        validate: {
            validator: (v: string[]) => v.length >= 2,
            message: "At least 2 options required",
        },
    },
    correctAnswer: {
        type: Number,
        required: true,
        min: 0,
        validate: {
            validator(this: any, v: number) {
                return Array.isArray(this.options) && v < this.options.length;
            },
            message: "correctAnswer must reference a valid option index",
        },
    },
    difficulty: {
        type: String,
        enum: ["easy", "medium", "hard", "beginner", "intermediate", "advanced", "expert"],
        default: "intermediate",
    },
    topic: { type: String, trim: true },
    subtopic: { type: String, trim: true },
});

const QuizSchema = new Schema<IQuiz>(
    {
        title: {
            type: String,
            required: [true, "Quiz title is required"],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        creator: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        questions: {
            type: [QuestionSchema],
            default: [],
        },
        playCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        tags: [String],
    },
    { timestamps: true }
);

QuizSchema.index({ creator: 1, createdAt: -1 });

export default mongoose.model<IQuiz>("Quiz", QuizSchema);
