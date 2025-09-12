import {
  CreateAvatarSchema,
  CreateElementSchema,
  CreateMapSchema,
  UpdateElementSchema,
} from "../../types/index.js";
import client from "@metaverse2d/database";
import type { Request, Response } from "express";

export const CreateElement = async (req: Request, res: Response) => {
  try {
    const parsedData = CreateElementSchema.safeParse(req.body);
    if (!parsedData.success) {
      res.status(400).json({ message: "Validation failed" });
      return;
    }

    const element = await client.element.create({
      data: {
        width: parsedData.data.width,
        height: parsedData.data.height,
        static: parsedData.data.static,
        imageUrl: parsedData.data.imageUrl,
      },
    });

    res.status(201).json({
      message: "Element created successfully",
      id: element.id,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const UpdateElement = async (req: Request, res: Response) => {
  try {
    const parsedData = UpdateElementSchema.safeParse(req.body);
    if (!parsedData.success) {
      res.status(400).json({ message: "Validation failed" });
      return;
    }
    client.element.update({
      where: {
        id: req.params.elementId as string,
      },
      data: {
        imageUrl: parsedData.data.imageUrl,
      },
    });
    res.status(201).json({ message: "Element updated" });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const CreateAvatar = async (req: Request, res: Response) => {
  try {
    const parsedData = CreateAvatarSchema.safeParse(req.body);
    if (!parsedData.success) {
      res.status(400).json({ message: "Validation failed" });
      return;
    }
    const avatar = await client.avatar.create({
      data: {
        name: parsedData.data.name,
        imageUrl: parsedData.data.imageUrl,
      },
    });
    res.status(201).json({ avatarId: avatar.id });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const CreateMap = async (req: Request, res: Response) => {
  try {
    const parsedData = CreateMapSchema.safeParse(req.body);
    if (!parsedData.success) {
      res.status(400).json({ message: "Validation failed" });
      return;
    }
    const map = await client.map.create({
      data: {
        name: parsedData.data.name,
        width: parseInt(parsedData.data.dimensions.split("x")[0] as string),
        height: parseInt(parsedData.data.dimensions.split("x")[1] as string),
        thumbnail: parsedData.data.thumbnail,
        mapElements: {
          create: parsedData.data.defaultElements.map((e) => ({
            elementId: e.elementId,
            x: e.x,
            y: e.y,
          })),
        },
      },
    });

    res.status(201).json({
      message: "Map created successfully",
      id: map.id,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
