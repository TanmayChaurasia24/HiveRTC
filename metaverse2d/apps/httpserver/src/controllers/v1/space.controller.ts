import type { Request, Response } from "express";
import { CreateSpaceSchema } from "../../types/index.js";
import client from "@metaverse2d/database";

export const CreateSpace = async (req: Request, res: Response) => {
  console.log("create space endpoint");

  const parsedData: any = CreateSpaceSchema.safeParse(req.body);
  if (!parsedData.success) {
    console.log(JSON.stringify(parsedData));
    res.status(400).json({ message: "Validation failed" });
    return;
  }

  if (!parsedData.data.mapId) {
    // creating a empty space with no map
    const space = await client.space.create({
      data: {
        name: parsedData.data.name,
        width: parseInt(parsedData.data.dimensions.split("x")[0]),
        height: parseInt(parsedData.data.dimensions.split("x")[1]),
        creatorId: req.userId!,
      },
    });
    res.json({ message: "Space created successfully", spaceId: space.id });
    return;
  }

  // find the map that user wants to use
  const map = await client.map.findFirst({
    where: {
      id: parsedData.data.mapId,
    },
    select: {
      mapElements: true,
      width: true,
      height: true,
    },
  });
  console.log("after");
  if (!map) {
    res.status(400).json({ message: "Map not found" });
    return;
  }
  console.log("map.mapElements.length");
  console.log(map.mapElements.length);

  // create the space in that map
  let space = await client.$transaction(async () => {
    const space = await client.space.create({
      data: {
        name: parsedData.data.name,
        width: map.width,
        height: map.height,
        creatorId: req.userId!,
      },
    });

    await client.spaceElements.createMany({
      data: map.mapElements.map((e) => ({
        spaceId: space.id,
        elementId: e.elementId,
        x: e.x!,
        y: e.y!,
      })),
    });

    return space;
  });
  console.log("space crated");
  res.status(201).json({
    message: "Space created successfully",
    spaceId: space.id,
  });
};

export const GetMyExistingSpaces = async (req: Request, res: Response) => {
  console.log("fetching all the existing spaces of user: ", req.userId);

  if (!req.userId) {
    return res.status(403).json({
      message: "Unauthorized",
    });
  }

  const spaces = await client.space.findMany({
    where: {
      creatorId: req.userId!,
    },
  });

  res.status(201).json({
    spaces: spaces.map((s) => ({
      id: s.id,
      name: s.name,
      thumbnail: s.thumbnail,
      dimensions: `${s.width}x${s.height}`,
    })),
  });
};

export const DeleteSpace = async (req: Request, res: Response) => {
  console.log("req.params.spaceId", req.params.spaceId);
  const space = await client.space.findUnique({
    where: {
      id: req.params.spaceId as string,
    },
    select: {
      creatorId: true,
    },
  });

  if (!space) {
    res.status(400).json({ message: "Space not found" });
    return;
  }

  if (space.creatorId !== req.userId) {
    console.log("code should reach here");
    res.status(403).json({ message: "Unauthorized" });
    return;
  }

  await client.space.delete({
    where: {
      id: req.params.spaceId as string,
    },
  });
  res.status(201).json({ message: "Space deleted" });
};
