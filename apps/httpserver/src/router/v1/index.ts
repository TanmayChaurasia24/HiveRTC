import { Router } from "express";
import {
  Signin,
  Signup,
} from "../../controllers/v1/auth.controller.js";
import {
  AvailableAvatars,
  getAllAvatars,
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
} from "../../controllers/v1/arena.controller.js";
import {
  CreateAvatar,
  CreateElement,
  CreateMap,
  UpdateElement,
} from "../../controllers/v1/admin.controller.js";
import { authenticateUser } from "../../middleware/user.js";
import { loginLimiter, signupLimiter } from "../../middleware/ratelimiter.js";
import { adminMiddleware } from "../../middleware/admin.js";

export const v1Router: Router = Router();

// auth controllers route...
v1Router.post("/signup", Signup);
v1Router.post("/signin", Signin);

// user info controllers route...
v1Router.post("/user/metadata",authenticateUser,UpdateMetadata);
v1Router.get("/user/avatars",authenticateUser, AvailableAvatars);
v1Router.get("/user/metadata/bulk", OtherUserMetadata);
v1Router.get("/avatars", getAllAvatars);

// space controllers route...
v1Router.post("/space",authenticateUser, CreateSpace);
v1Router.delete("/space/:spaceId",authenticateUser, DeleteSpace);
v1Router.get("/space/all",authenticateUser, GetMyExistingSpaces);

// arena controllers route...
v1Router.get("/space/:spaceId", GetSpace);
v1Router.post("/space/element", AddElementToArena);
v1Router.delete("/space/element", DeleteElementFromArena);

// admin controllers route...
v1Router.post("/admin/element",adminMiddleware, CreateElement);
v1Router.put("/admin/element/:elementId",adminMiddleware, UpdateElement);
v1Router.post("/admin/avatar",adminMiddleware, CreateAvatar);
v1Router.post("/admin/map",adminMiddleware, CreateMap);
