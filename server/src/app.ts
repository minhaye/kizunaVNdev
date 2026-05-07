import express from "express";
import cors from "cors";
import { Router } from "express";
import { registerRoutes } from "./routes";

export const app = express();

app.use(cors());
app.use(express.json());

const router = Router();
registerRoutes(router);
app.use(router);
