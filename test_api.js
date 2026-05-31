const axios = require('axios');
const mongoose = require('mongoose');

// Need a valid patient token
require('dotenv').config();

const Patient = require('./models/patient');
const Doctor = require('./models/doctor');
const jwt = require("jsonwebtoken");

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/Doc_app')
  .then(async () => {
    const p = await Patient.findOne();
    const d = await Doctor.findOne();
    if (!p || !d) return console.log("Missing data");

    const token = jwt.sign({ id: p._id, role: 'patient' }, process.env.JWT_SECRET || "default_secret", { expiresIn: "30d" });

    try {
        const res = await axios.post(`http://localhost:5001/api/doctors/${d._id}/rate`, { rating: 5 }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("SUCCESS:", res.data);
    } catch (e) {
        console.log("FAIL:", e.response ? e.response.data : e.message);
    }
    process.exit();
  });
