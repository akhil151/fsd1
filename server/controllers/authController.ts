import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";

const generateToken = (id: string, role: string): string => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET!, {
        expiresIn: "7d",
    });
};

// POST /api/auth/register
export const register = async (req: Request, res: Response): Promise<any> => {
    // SLOW DB SIMULATION
    if (process.env.SIMULATE_SLOW_DB === "true") {
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email and password are required" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: "An account with that email already exists" });
        }

        const user = await User.create({
            name,
            email,
            password, // will be hashed by pre-save hook
            role: role === "teacher" ? "teacher" : "student",
        });

        const token = generateToken(String(user._id), user.role);

        return res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
};

// POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<any> => {
    // SLOW DB SIMULATION
    if (process.env.SIMULATE_SLOW_DB === "true") {
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // select: false on password, so we must explicitly include it
        const user = await User.findOne({ email }).select("+password");
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const token = generateToken(String(user._id), user.role);

        return res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
};

// GET /api/auth/me  (protected)
export const getMe = async (req: Request, res: Response): Promise<any> => {
    const user = (req as any).user;
    return res.json({ user }) as any;
};
