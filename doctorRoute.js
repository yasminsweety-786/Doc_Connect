const express = require("express");
const router = express.Router();
const { getAllDoctors, getDoctorById, rateDoctor } = require("../controllers/doctorController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", getAllDoctors);
router.get("/:id", getDoctorById);
router.post("/:id/rate", protect, rateDoctor);

module.exports = router;