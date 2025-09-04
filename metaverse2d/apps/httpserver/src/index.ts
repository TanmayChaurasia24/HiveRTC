import express from "express";
import cors from "cors";
import { v1Router } from "./router/v1/index.js";
import helmet from "helmet";


const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use("/api/v1", v1Router);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
