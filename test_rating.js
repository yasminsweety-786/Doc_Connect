const mongoose = require('mongoose');
const Doctor = require('./models/doctor');
const Patient = require('./models/patient');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/Doc_app')
  .then(async () => {
    try {
        const doc = await Doctor.findOne();
        const pat = await Patient.findOne();
        console.log("Testing doctor saving...");
        
        if (!doc.ratings) doc.ratings = [];
        doc.ratings.push({ patientId: pat._id, rating: 4 });
        
        await doc.save();
        console.log("Saved successfully!");
    } catch (e) {
        console.error("Error saving:", e);
    }
    process.exit(0);
  });
