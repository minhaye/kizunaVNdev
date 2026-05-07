import type { Router } from "express";
import { healthHandler } from "./health";
import { dbPingHandler } from "./db";

export const registerRoutes = (router: Router) => {
  router.get("/health", healthHandler);
  router.get("/db/ping", dbPingHandler);
};
