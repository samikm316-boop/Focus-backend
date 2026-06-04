const express = require("express");
const router = express.Router();

const { getDashboard } = require("./dashboard.controller");
const authenticateJWT = require("../../middleware/authenticateJWT");

router.get("/", authenticateJWT, getDashboard);

module.exports = router;
