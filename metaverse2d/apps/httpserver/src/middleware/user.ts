import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { JWT_PASSWORD } from "../config.js";

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(403).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_PASSWORD) as {
      role: string;
      userId: string;
    };
    req.userId = decoded.userId;
    next();
  } catch (e) {
    return res.status(403).json({ message: "Invalid token" });
  }
};
