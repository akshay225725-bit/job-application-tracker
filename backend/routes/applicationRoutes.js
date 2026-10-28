const express = require("express");

const {
    createApplication,
    getApplications,
    getApplicationStats,
    getApplicationById,
    updateApplication,
    updateApplicationStatus,
    deleteApplication
} = require("../controllers/applicationController");

const router = express.Router();

// Statistics
router.get("/stats", getApplicationStats);

// Create and list
router.post("/", createApplication);
router.get("/", getApplications);

// Update status
router.patch("/:id/status", updateApplicationStatus);

// Edit and delete
router.put("/:id", updateApplication);
router.delete("/:id", deleteApplication);

// Get one application
router.get("/:id", getApplicationById);

module.exports = router;
