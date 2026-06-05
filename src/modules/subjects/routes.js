import express from "express";

import { authenticateJWT }
from "../../middleware/auth.js";

import {
  createSubjectController,
  getSubjectsController,
  updateSubjectController,
  deleteSubjectController
}
from "./controller.js";

const router = express.Router();

router.get(
  "/",
  authenticateJWT,
  getSubjectsController
);

router.post(
  "/",
  authenticateJWT,
  createSubjectController
);

router.put(
  "/:id",
  authenticateJWT,
  updateSubjectController
);

router.delete(
  "/:id",
  authenticateJWT,
  deleteSubjectController
);

export default router;
