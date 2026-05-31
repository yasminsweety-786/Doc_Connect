const Doctor = require("../models/doctor");

// Get all available doctors
exports.getAllDoctors = async (req, res) => {
    try {
        const doctors = await Doctor.find({}).select("-password");
        res.json({ success: true, count: doctors.length, data: doctors });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get single doctor details
exports.getDoctorById = async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id).select("-password");
        if (!doctor) {
            return res.status(404).json({ success: false, message: "Doctor not found" });
        }
        res.json({ success: true, data: doctor });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ success: false, message: "Invalid Doctor ID" });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// Rate a doctor
exports.rateDoctor = async (req, res) => {
    try {
        const { rating } = req.body;
        const doctorId = req.params.id;
        const patientId = req.user.id;

        const doctor = await Doctor.findById(doctorId);
        if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });

        if (!doctor.ratings) doctor.ratings = [];

        const existingRating = doctor.ratings.find(r => r.patientId && r.patientId.toString() === patientId.toString());
        if (existingRating) {
            existingRating.rating = Number(rating);
        } else {
            doctor.ratings.push({ patientId, rating: Number(rating) });
        }

        const total = doctor.ratings.reduce((acc, curr) => acc + curr.rating, 0);
        doctor.averageRating = parseFloat((total / doctor.ratings.length).toFixed(1));

        await doctor.save();
        res.json({ success: true, message: "Rating submitted successfully", averageRating: doctor.averageRating });
    } catch (error) {
        console.error("Rating Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
