import type { Router } from "express";
import { healthHandler } from "./health.js";
import { dbPingHandler } from "./db.js";
import { loginHandler, signUpHandler, logoutHandler, getMeHandler } from "./auth.js";
import { employeesHandler } from "./employees.js";
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
  createChatMessageHandler,
  getChatRoomDetailHandler,
  listChatRoomsHandler,
  pinChatRoomHandler,
  unpinChatRoomHandler,
} from "./chat.js";
import {
  createTaskReportHandler,
  listTaskReportsHandler,
} from "./report.js";
import {
  createWikiArticleHandler,
  getWikiArticleDetailHandler,
  listWikiArticlesHandler,
} from "./wiki.js";
import { listNotificationsHandler, markNotificationsReadHandler } from "./notifications.js";
import { heartbeatHandler, getMySettingsHandler, updateMySettingsHandler } from "./settings.js";

export const registerRoutes = (router: Router) => {
  router.get("/health", healthHandler);
  router.get("/db/ping", dbPingHandler);
  router.get("/employees", employeesHandler);
  router.get("/users", usersHandler);
  router.post("/users", createUserHandler);
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
  router.post("/auth/logout", logoutHandler);
  router.get("/auth/me", getMeHandler);
  
  // Posts routes
  router.get("/posts", postsListHandler);
  router.post("/posts", createPostHandler);
  router.get("/posts/:id", postsDetailHandler);
  router.get("/posts/:id/reactions", getPostReactionsHandler);
  router.post("/posts/:id/reactions", postReactionsHandler);
  router.delete("/posts/:id/reactions", deletePostReactionHandler);

  // Chat routes
  router.get("/chat/rooms", listChatRoomsHandler);
  router.get("/chat/rooms/:id", getChatRoomDetailHandler);
  router.post("/chat/rooms/:id/messages", createChatMessageHandler);
  router.post("/chat/rooms/:id/pin", pinChatRoomHandler);
  router.delete("/chat/rooms/:id/pin", unpinChatRoomHandler);

  // Wiki routes
  router.get("/wiki", listWikiArticlesHandler);
  router.post("/wiki", createWikiArticleHandler);
  router.get("/wiki/:slug", getWikiArticleDetailHandler);

  // Notifications routes
  router.get("/notifications", listNotificationsHandler);
  router.post("/notifications/read-all", markNotificationsReadHandler);
  router.patch("/settings/me", updateMySettingsHandler);
  router.get("/settings/me", getMySettingsHandler);
  router.post("/presence/heartbeat", heartbeatHandler);
};
