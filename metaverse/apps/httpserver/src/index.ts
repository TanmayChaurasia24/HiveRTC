import express from "express"
import cors from "cors";
import { v1Router } from "./router/v1/index.js";

const app = express();

app.use(express.json());
app.use(cors())

// defining prefix rotuers ...
app.use("api/v1", v1Router);

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
