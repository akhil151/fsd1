import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import User, { IUser } from "../models/User";

export interface AuthRequest extends Request {
    user?: IUser;
}

export const protect = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    let token: string | undefined;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer ")
    ) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        res.status(401).json({ message: "Not authorized — no token" });
        return;
    }

    try {
        const secret = process.env.JWT_SECRET!;
        const decoded = jwt.verify(token, secret) as { id: string; role: string };
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            res.status(401).json({ message: "User no longer exists" });
            return;
        }

        req.user = user;
        next();
    } catch {
        res.status(401).json({ message: "Not authorized — invalid token" });
    }
};

export const teacherOnly = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): void => {
    if (req.user?.role !== "teacher") {
        res.status(403).json({ message: "Access restricted to teachers only" });
        return;
    }
    next();
};
