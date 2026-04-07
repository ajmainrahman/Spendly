import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

const SECRET = process.env.SESSION_SECRET || "dev-secret-change-in-production";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized — please log in" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, SECRET) as { userId: number; email: string };
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "Session expired — please log in again" });
  }
}
