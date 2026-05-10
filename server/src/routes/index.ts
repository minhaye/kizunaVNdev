import type { Router } from "express";
import { healthHandler } from "./health.js";
import { dbPingHandler } from "./db.js";
import { loginHandler, signUpHandler, logoutHandler, getMeHandler } from "./auth.js";
import {
  deletePostReactionHandler,
  getPostReactionsHandler,
  postsDetailHandler,
  postsListHandler,
  postReactionsHandler,
} from "./posts.js";

export const registerRoutes = (router: Router) => {
  router.get("/health", healthHandler);
  router.get("/db/ping", dbPingHandler);
  
  // Auth routes
  router.post("/auth/login", loginHandler);
  router.post("/auth/signup", signUpHandler);
  router.post("/auth/logout", logoutHandler);
  router.get("/auth/me", getMeHandler);
  
  // Posts routes
  router.get("/posts", postsListHandler);
  router.get("/posts/:id", postsDetailHandler);
  router.get("/posts/:id/reactions", getPostReactionsHandler);
  router.post("/posts/:id/reactions", postReactionsHandler);
  router.delete("/posts/:id/reactions", deletePostReactionHandler);
};
