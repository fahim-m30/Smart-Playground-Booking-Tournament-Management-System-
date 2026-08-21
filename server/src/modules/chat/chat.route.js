const express = require("express");
const router = express.Router();
const chatController = require("./chat.controller");
const verifyToken = require("../../middlewares/verifyToken");
const authorize = require("../../middlewares/role.middleware");

router.use(verifyToken, authorize("customer", "playground-admin", "super-admin"));
router.post("/send-message", chatController.sendMessage);
router.get("/contacts", chatController.getContacts);
router.get("/conversations", chatController.getConversations);
router.get("/contacts/:contactId/messages", chatController.getMessages);

module.exports = router;
