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
): Promise<any> => {
    let token: string | undefined;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer ")
    ) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        const err = new Error("Not authorized — no token") as any;
        err.status = 401;
        return next(err);
    }

    try {
        const secret = process.env.JWT_SECRET!;
        const decoded = jwt.verify(token, secret) as { id: string; role: string };
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            const err = new Error("User no longer exists") as any;
            err.status = 401;
            return next(err);
        }

        req.user = user;
        next();
    } catch {
        const err = new Error("Not authorized — invalid token") as any;
        err.status = 401;
        return next(err);
    }
};

export const teacherOnly = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): any => {
    if (req.user?.role !== "teacher") {
        const err = new Error("Access restricted to teachers only") as any;
        err.status = 403;
        return next(err);
    }
    next();
};
