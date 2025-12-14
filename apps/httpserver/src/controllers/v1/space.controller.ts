import type { Request, Response } from "express";
import { CreateSpaceSchema } from "../../types/index.js";
import client from "@metaverse2d/database";

export const CreateSpace = async (req: Request, res: Response) => {
  try {
    console.log("create space endpoint");

    const parsedData: any = CreateSpaceSchema.safeParse(req.body);
    if (!parsedData.success) {
      console.log(JSON.stringify(parsedData));
      return res
        .status(400)
        .json({
          message: "Validation failed",
          errors: parsedData.error.errors,
        });
    }

    // Empty space (no map provided)
    if (!parsedData.data.mapId) {
      const space = await client.space.create({
        data: {
          name: parsedData.data.name,
          width: parseInt(parsedData.data.dimensions.split("x")[0]),
          height: parseInt(parsedData.data.dimensions.split("x")[1]),
          creatorId: req.userId!,
        },
      });
      return res
        .status(201)
        .json({ message: "Space created successfully", spaceId: space.id });
    }

    // Find the map user wants to use
    const map = await client.map.findFirst({
      where: { id: parsedData.data.mapId },
      select: { mapElements: true, width: true, height: true },
    });

    if (!map) {
      return res.status(404).json({ message: "Map not found" });
    }

    // Create the space with map
    const space = await client.$transaction(async () => {
      const space = await client.space.create({
        data: {
          name: parsedData.data.name,
          width: map.width,
          height: map.height,
          creatorId: req.userId!,
        },
      });

      if (map.mapElements.length > 0) {
        await client.spaceElements.createMany({
          data: map.mapElements.map((e: any) => ({
            spaceId: space.id,
            elementId: e.elementId,
            x: e.x!,
            y: e.y!,
          })),
        });
      }

      return space;
    });

    res.status(200).json({
      message: "Space created successfully",
      spaceId: space.id,
    });
  } catch (error: any) {
    console.error("Error in CreateSpace:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const GetMyExistingSpaces = async (req: Request, res: Response) => {
  try {
    console.log("fetching all the existing spaces of user: ", req.userId);

    if (!req.userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const spaces = await client.space.findMany({
      where: { creatorId: req.userId },
    });

    res.status(200).json({
      spaces: spaces.map((s: any) => ({
        id: s.id,
        name: s.name,
        thumbnail: s.thumbnail,
        dimensions: `${s.width}x${s.height}`,
      })),
    });
  } catch (error: any) {
    console.error("Error in GetMyExistingSpaces:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const DeleteSpace = async (req: Request, res: Response) => {
  try {
    const { spaceId } = req.params;

    if (!spaceId) {
      return res.status(400).json({ message: "spaceId is required" });
    }

    const space = await client.space.findUnique({
      where: { id: spaceId },
      select: { creatorId: true },
    });

    if (!space) {
      return res.status(400).json({ message: "Space not found" });
    }

    if (space.creatorId !== req.userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await client.space.delete({ where: { id: spaceId } });

    res.status(200).json({ message: "Space deleted" });
  } catch (error: any) {
    console.error("Error in DeleteSpace:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
