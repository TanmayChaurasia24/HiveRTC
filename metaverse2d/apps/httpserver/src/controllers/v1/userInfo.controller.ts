import type { Request, Response } from "express";
import { UpdateMetadataSchema } from "../../types/index.js";
import client from "@metaverse2d/database";

export const UpdateMetadata = async (req: Request, res: Response) => {
  console.log("inside update metadata");

  const parsedData = UpdateMetadataSchema.safeParse(req.body);
  if (!parsedData.success) {
    return res.status(400).json({ message: "Validation failed" });
  }

  const avatar = await client.avatar.findUnique({
    where: {
      id: parsedData.data.avatarId,
    },
  });

  if (!avatar) {
    return res.status(400).json({ message: "Avatar not found" });
  }

  await client.user.update({
    where: {
      id: req.userId as string,
    },
    data: {
      avatarId: parsedData.data.avatarId,
    },
  });

  return res.status(201).json({
    message: "Metadata updated successfully",
  });
};

export const AvailableAvatars = async (req: Request, res: Response) => {
  try {
    const avatars = await client.avatar.findMany();
    res.json({
      avatars: avatars.map((x: any) => ({
        id: x.id,
        imageUrl: x.imageUrl,
        name: x.name,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const OtherUserMetadata = async (req: Request, res: Response) => {
  const userIdString = (req.query.ids ?? "[]") as string;
  const userIds = userIdString.slice(1, userIdString?.length - 1).split(",");

  console.log(userIds);

  const metadata = await client.user.findMany({
    where: {
      id: {
        in: userIds,
      },
    },
    select: {
      avatar: true,
      id: true,
    },
  });

  res.json({
    avatars: metadata.map((m: any) => ({
      userId: m.id,
      avatarId: m.avatar?.id,
    })),
  });
};
