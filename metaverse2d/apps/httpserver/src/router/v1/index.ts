import { Router } from "express";
import { Signin, Signup } from "../../controllers/v1/auth.controller.js";
import {
  AvailableAvatars,
  OtherUserMetadata,
  UpdateMetadata,
} from "../../controllers/v1/userInfo.controller.js";
import {
  CreateSpace,
  DeleteSpace,
  GetMyExistingSpaces,
} from "../../controllers/v1/space.controller.js";
import {
  AddElementToArena,
  DeleteElementFromArena,
  GetSpace,
  SeeAllElementsInArena,
} from "../../controllers/v1/arena.controller.js";
import {
  CreateAvatar,
  CreateElement,
  CreateMap,
  UpdateElement,
} from "../../controllers/v1/admin.controller.js";

export const v1Router: Router = Router();

// auth controllers route...
v1Router.post("/sign-up", Signup);
v1Router.post("/sign-in", Signin);

// user info controllers route...
v1Router.post("/user/metadata", UpdateMetadata);
v1Router.get("/user/avatars", AvailableAvatars);
v1Router.get("/user/metadata/bulk", OtherUserMetadata);

// space controllers route...
v1Router.post("/space", CreateSpace);
v1Router.delete("/space/:spaceId", DeleteSpace);
v1Router.get("/space/all", GetMyExistingSpaces);

// arena controllers route...
v1Router.get("/space/:spaceId", GetSpace);
v1Router.post("/space/element", AddElementToArena);
v1Router.delete("/space/element", DeleteElementFromArena);
v1Router.get("/elements", SeeAllElementsInArena);

// admin controllers route...
v1Router.post("/admin/element", CreateElement);
v1Router.put("/admin/element/:elementId", UpdateElement);
v1Router.post("/admin/avatar", CreateAvatar);
v1Router.post("/admin/map", CreateMap);
