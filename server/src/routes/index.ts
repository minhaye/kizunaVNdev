import type { Router } from "express";
import { healthHandler } from "./health.js";
import { dbPingHandler } from "./db.js";
import { loginHandler, signUpHandler, logoutHandler, getMeHandler } from "./auth.js";

export const registerRoutes = (router: Router) => {
  router.get("/health", healthHandler);
  router.get("/db/ping", dbPingHandler);
  
  // Auth routes
  router.post("/auth/login", loginHandler);
  router.post("/auth/signup", signUpHandler);
  router.post("/auth/logout", logoutHandler);
  router.get("/auth/me", getMeHandler);
};
