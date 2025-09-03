import express from "express";
import cors from "cors";
import { v1Router } from "./router/v1/index.js";
import client from "@metaverse2d/database";

const app = express();

app.use(express.json());
app.use(cors());

app.use("api/v1", v1Router);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
