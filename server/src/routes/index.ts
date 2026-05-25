import type { Router } from "express";
import { healthHandler } from "./health.js";
import { dbPingHandler } from "./db.js";
import {
  forgotPasswordRequestHandler,
  forgotPasswordResetHandler,
  forgotPasswordVerifyHandler,
  getMeHandler,
  loginHandler,
  logoutHandler,
  signUpHandler,
} from "./auth.js";
import { employeeFeedbacksHandler, employeesHandler } from "./employees.js";
import { createUserHandler, usersHandler } from "./users.js";
import {
  claimTaskHandler,
  createTaskHandler,
  getTaskHandler,
  listTasksHandler,
  updateTaskStatusHandler,
} from "./tasks.js";
import {
  createPostHandler,
  deletePostReactionHandler,
  getPostReactionsHandler,
  postsDetailHandler,
  postsListHandler,
  postReactionsHandler,
} from "./posts.js";
import {
  createManagedUserHandler,
  deleteManagedUserHandler,
  getModerationPostHandler,
  listManagedUsersHandler,
  listPendingPostsHandler,
  moderatePostHandler,
  updateManagedUserHandler,
} from "./admin.js";

export const registerRoutes = (router: Router) => {
  router.get("/health", healthHandler);
  router.get("/db/ping", dbPingHandler);
  router.get("/employees", employeesHandler);
  router.get("/users", usersHandler);
  router.post("/users", createUserHandler);
  router.get("/employees/:id/feedbacks", employeeFeedbacksHandler);
  router.get("/tasks", listTasksHandler);
  router.get("/tasks/:id", getTaskHandler);
  router.post("/tasks", createTaskHandler);
  router.post("/tasks/:id/claim", claimTaskHandler);
  router.patch("/tasks/:id/status", updateTaskStatusHandler);
  router.get("/tasks/:id/reports", listTaskReportsHandler);
  router.post("/tasks/:id/report", createTaskReportHandler);
  
  // Auth routes
  router.post("/auth/login", loginHandler);
  router.post("/auth/signup", signUpHandler);
  router.post("/auth/forgot-password/request", forgotPasswordRequestHandler);
  router.post("/auth/forgot-password/verify", forgotPasswordVerifyHandler);
  router.post("/auth/forgot-password/reset", forgotPasswordResetHandler);
  router.post("/auth/logout", logoutHandler);
  router.get("/auth/me", getMeHandler);
  
  // Posts routes
  router.get("/posts", postsListHandler);
  router.post("/posts", createPostHandler);
  router.get("/posts/:id", postsDetailHandler);
  router.get("/posts/:id/reactions", getPostReactionsHandler);
  router.post("/posts/:id/reactions", postReactionsHandler);
  router.delete("/posts/:id/reactions", deletePostReactionHandler);

  // Admin management routes
  router.get("/admin/users", listManagedUsersHandler);
  router.post("/admin/users", createManagedUserHandler);
  router.patch("/admin/users/:source/:id", updateManagedUserHandler);
  router.delete("/admin/users/:source/:id", deleteManagedUserHandler);
  router.get("/admin/posts/pending", listPendingPostsHandler);
  router.get("/admin/posts/:id", getModerationPostHandler);
  router.patch("/admin/posts/:id/moderation", moderatePostHandler);
};
