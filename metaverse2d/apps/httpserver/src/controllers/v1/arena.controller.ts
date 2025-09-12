import type { Request, Response } from "express";
import { AddElementSchema, DeleteElementSchema } from "../../types/index.js";
import client from "@metaverse2d/database";
import type { any } from "zod";

export const GetSpace = async (req: Request, res: Response) => {
  try {
    const { spaceId } = req.params;
    if (!spaceId) {
      return res.status(400).json({ message: "spaceId is required" });
    }

    const space: any = await client.space.findUnique({
      where: { id: spaceId },
      include: {
        elements: {
          include: {
            element: true,
          },
        },
      },
    });

    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }

    res.json({
      dimensions: `${space.width}x${space.height}`,
      elements: space.elements.map((e: any) => ({
        id: e.id,
        element: {
          id: e.element.id,
          imageUrl: e.element.imageUrl,
          width: e.element.width,
          height: e.element.height,
          static: e.element.static,
        },
        x: e.x,
        y: e.y,
      })),
    });
  } catch (error: any) {
    console.error("Error in GetSpace:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const AddElementToArena = async (req: Request, res: Response) => {
  try {
    const parsedData = AddElementSchema.safeParse(req.body);
    if (!parsedData.success) {
      return res
        .status(400)
        .json({ message: "Validation failed", errors: parsedData.error });
    }

    const { spaceId, elementId, x, y } = req.body;

    if (!spaceId || !elementId || x === undefined || y === undefined) {
      return res
        .status(400)
        .json({ message: "spaceId, elementId, x, and y are required" });
    }

    const space = await client.space.findUnique({
      where: {
        id: spaceId,
        creatorId: req.userId!,
      },
      select: {
        width: true,
        height: true,
      },
    });

    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }

    if (x < 0 || y < 0 || x > space.width || y > space.height) {
      return res
        .status(400)
        .json({ message: "Point is outside of the boundary" });
    }

    await client.spaceElements.create({
      data: {
        spaceId,
        elementId,
        x,
        y,
      },
    });

    res.json({ message: "Element added" });
  } catch (error: any) {
    console.error("Error in AddElementToArena:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const DeleteElementFromArena = async (req: Request, res: Response) => {
  try {
    const parsedData = DeleteElementSchema.safeParse(req.body);
    if (!parsedData.success) {
      return res
        .status(400)
        .json({ message: "Validation failed", errors: parsedData.error });
    }

    const { id } = parsedData.data;

    if (!id) {
      return res.status(400).json({ message: "Element id is required" });
    }

    const spaceElement = await client.spaceElements.findFirst({
      where: { id },
      include: { space: true },
    });

    if (!spaceElement) {
      return res.status(404).json({ message: "Element not found" });
    }

    if (
      !spaceElement.space?.creatorId ||
      spaceElement.space.creatorId !== req.userId
    ) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await client.spaceElements.delete({
      where: { id },
    });

    res.json({ message: "Element deleted" });
  } catch (error: any) {
    console.error("Error in DeleteElementFromArena:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
