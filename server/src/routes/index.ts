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
import { createUserHandler, updateUserStatusHandler, usersHandler } from "./users.js";
import {
  claimTaskHandler,
  createTaskHandler,
  getTaskHandler,
  listTasksHandler,
  updateTaskStatusHandler,
} from "./tasks.js";
import {
  approvePostHandler,
  createPostHandler,
  deletePostReactionHandler,
  getPostReactionsHandler,
  postsDetailHandler,
  postsListHandler,
  postReactionsHandler,
  rejectPostHandler,
} from "./posts.js";
import {
  createChatRoomHandler,
  createChatMessageHandler,
  getChatFeedbackHandler,
  getChatRoomDetailHandler,
  listChatRoomsHandler,
  markChatRoomReadHandler,
  pinChatRoomHandler,
  saveChatFeedbackHandler,
  unpinChatRoomHandler,
} from "./chat.js";
import {
  createTaskReportHandler,
  listTaskReportsHandler,
} from "./report.js";
import {
  approveWikiArticleHandler,
  createWikiArticleHandler,
  getWikiArticleDetailHandler,
  listWikiArticlesHandler,
  rejectWikiArticleHandler,
} from "./wiki.js";
import { listNotificationsHandler, markNotificationsReadHandler } from "./notifications.js";
import { heartbeatHandler, getMySettingsHandler, updateMySettingsHandler } from "./settings.js";

export const registerRoutes = (router: Router) => {
  router.get("/health", healthHandler);
  router.get("/db/ping", dbPingHandler);
  router.get("/employees", employeesHandler);
  router.get("/users", usersHandler);
  router.post("/users", createUserHandler);
  router.patch("/users/:id/status", updateUserStatusHandler);
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
  router.post("/posts/:id/approve", approvePostHandler);
  router.post("/posts/:id/reject", rejectPostHandler);

  // Chat routes
  router.get("/chat/rooms", listChatRoomsHandler);
  router.post("/chat/rooms", createChatRoomHandler);
  router.get("/chat/rooms/:id", getChatRoomDetailHandler);
  router.post("/chat/rooms/:id/read", markChatRoomReadHandler);
  router.get("/chat/rooms/:id/feedback", getChatFeedbackHandler);
  router.post("/chat/rooms/:id/messages", createChatMessageHandler);
  router.post("/chat/rooms/:id/feedback", saveChatFeedbackHandler);
  router.post("/chat/rooms/:id/pin", pinChatRoomHandler);
  router.delete("/chat/rooms/:id/pin", unpinChatRoomHandler);

  // Wiki routes
  router.get("/wiki", listWikiArticlesHandler);
  router.post("/wiki", createWikiArticleHandler);
  router.get("/wiki/:slug", getWikiArticleDetailHandler);
  router.post("/wiki/:id/approve", approveWikiArticleHandler);
  router.post("/wiki/:id/reject", rejectWikiArticleHandler);

  // Notifications routes
  router.get("/notifications", listNotificationsHandler);
  router.post("/notifications/read-all", markNotificationsReadHandler);
  router.patch("/settings/me", updateMySettingsHandler);
  router.get("/settings/me", getMySettingsHandler);
  router.post("/presence/heartbeat", heartbeatHandler);
};
