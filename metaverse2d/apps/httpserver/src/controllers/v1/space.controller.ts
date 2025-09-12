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
  res.json({ spaceId: space.id });
};

export const GetMyExistingSpaces = () => {};

export const DeleteSpace = () => {};
