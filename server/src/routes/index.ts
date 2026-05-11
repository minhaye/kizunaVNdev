import type { Router } from "express";
import { healthHandler } from "./health.js";
import { dbPingHandler } from "./db.js";
import { loginHandler, signUpHandler, logoutHandler, getMeHandler } from "./auth.js";
import { employeesHandler } from "./employees.js";
import {
  claimTaskHandler,
  createTaskHandler,
  getTaskHandler,
  listTasksHandler,
  updateTaskStatusHandler,
} from "./tasks.js";
import { createTaskReportHandler, listTaskReportsHandler } from "./reports.js";
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
  router.get("/employees", employeesHandler);
  router.get("/tasks", listTasksHandler);
  router.get("/tasks/:id", getTaskHandler);
  router.get("/tasks/:id/reports", listTaskReportsHandler);
  router.post("/tasks", createTaskHandler);
  router.post("/tasks/:id/reports", createTaskReportHandler);
  router.post("/tasks/:id/claim", claimTaskHandler);
  router.patch("/tasks/:id/status", updateTaskStatusHandler);
  
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
