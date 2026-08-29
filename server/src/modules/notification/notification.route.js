const router = require("express").Router();
const controller = require("./notification.controller");
const verifyToken = require("../../middlewares/verifyToken");

router.get("/", verifyToken, controller.getMine);
router.patch("/read-all", verifyToken, controller.markAllRead);
router.patch("/:id/read", verifyToken, controller.markRead);
router.delete("/:id", verifyToken, controller.deleteMine);

module.exports = router;
