import bcrypt from "bcryptjs";
import { SigninSchema, SignupSchema } from "../../types/index.js";
import type { Request, Response } from "express";
import client from "@metaverse2d/database";
import { JWT_SECRET } from "../../config.js";
import jwt from "jsonwebtoken";

const JWT_ACCESS_SECRET = "saojhfof2803hfassl";
const JWT_REFRESH_SECRET = "f3420hfjsnasnljfndd";

const ACCESS_TTL = "15m"; // short-lived access token
const REFRESH_TTL = "7d"; // long-lived refresh token (in HttpOnly cookie)
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 min rolling window
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 min lock

function signAccessToken(payload: object) {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}
function signRefreshToken(payload: object) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

function setRefreshCookie(res: Response, token: string) {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export const Signup = async (req: Request, res: Response) => {
  console.log("inside signup");

  const parsedData = SignupSchema.safeParse(req.body);
  if (!parsedData.success) {
    return res.status(400).json({ message: "Validation failed" });
  }

  const username = parsedData.data.username.toLowerCase().trim();
  const hashedPassword = await bcrypt.hash(parsedData.data.password, 10);

  try {
    const user = await client.user.create({
      data: {
        username: username,
        password: hashedPassword,
        role: parsedData.data.type === "admin" ? "Admin" : "User",
      },
    });

    res.status(201).json({ userId: user.id });
  } catch (e: any) {
    console.error("Signup error:", e);
    if (e.code === "P2002") {
      // Prisma unique constraint error for checking user in database...
      return res.status(409).json({ message: "User already exists" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

export const Signin = async (req: Request, res: Response) => {
  console.log("inside signin");
  const parsedData = SigninSchema.safeParse(req.body);
  if (!parsedData.success) {
    return res.status(400).json({ message: "Validation failed" });
  }
  const username = parsedData.data.username.toLowerCase().trim();

  try {
    const user = await client.user.findUnique({
      where: {
        username: username,
      },
    });
    if (!user) {
      return res.status(403).json({ message: "Invalid username or password" });
    }

    // Account lockout checks
    const now = Date.now();
    if (user.lockedUntil && new Date(user.lockedUntil).getTime() > now) {
      return res
        .status(429)
        .json({ message: "Account temporarily locked. Try later." });
    }

    const isPasswordCorrect = await bcrypt.compare(
      parsedData.data.password,
      user.password
    );
    if (!isPasswordCorrect) {
      // update failed attempts
      const last = user.lastFailedAt
        ? new Date(user.lastFailedAt).getTime()
        : 0;
      const withinWindow = now - last < LOCKOUT_WINDOW_MS;
      const failedAttempts = withinWindow ? user.failedAttempts + 1 : 1;

      const lockedUntil =
        failedAttempts >= MAX_FAILED_ATTEMPTS
          ? new Date(now + LOCKOUT_DURATION_MS)
          : null;

      await client.user.update({
        where: { id: user.id },
        data: {
          failedAttempts,
          lastFailedAt: new Date(now),
          lockedUntil,
        },
      });

      return res.status(403).json({ message: "Invalid username or password" });
    }

    await client.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lastFailedAt: null, lockedUntil: null },
    });

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = signRefreshToken({
      userId: user.id,
      tokenVersion: user.tokenVersion,
    });

    setRefreshCookie(res, refreshToken);

    return res.status(200).json({ accessToken, expiresIn: ACCESS_TTL });
  } catch (e: any) {
    console.error("Signin error:", e);
    res.status(500).json({ message: "Internal server error" });
  }
};
