import bcrypt from "bcryptjs";
import { SigninSchema, SignupSchema } from "../../types/index.js";
import type { Request, Response } from "express";
import client from "@metaverse2d/database";
import jwt from "jsonwebtoken";

const JWT_PASSWORD="asnjkn32083ehjskdjNSDJNS"

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
  const parsedData = SigninSchema.safeParse(req.body);
  if (!parsedData.success) {
    return res.status(400).json({ message: "Validation failed" });
  }

  try {
    const username = parsedData.data.username.toLowerCase().trim();

    const user = await client.user.findUnique({
      where: { username }
    });

    if (!user) {
      return res.status(403).json({ message: "User not found" });
    }

    const isValid = await bcrypt.compare(parsedData.data.password, user.password);
    if (!isValid) {
      return res.status(403).json({ message: "Invalid password" });
    }

    if (!JWT_PASSWORD) {
      throw new Error("JWT_PASSWORD not set in environment");
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_PASSWORD,
      { expiresIn: "1h" } 
    );

    res.status(201).json({ token });
  } catch (e) {
    console.error("Signin error:", e);
    res.status(500).json({ message: "Internal server error" });
  }
};
