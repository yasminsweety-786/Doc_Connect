const mongoose = require('mongoose');
const Appointment = require('./models/appointment');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/Doc_app')
  .then(async () => {
    console.log('Connected to DB');
    
    // Find all appointments
    const allAppts = await Appointment.find({}).sort({ createdAt: 1 });
    
    const seenMap = new Map();
    let deletedCount = 0;

    for (const appt of allAppts) {
        const slotKey = `${appt.doctorId.toString()}_${appt.date}_${appt.time}`;
        
        if (seenMap.has(slotKey)) {
            // Already seen this exact slot, delete this duplicate!
            await Appointment.deleteOne({ _id: appt._id });
            deletedCount++;
        } else {
            // Mark as seen
            seenMap.set(slotKey, true);
        }
    }

    console.log(`Aggressively deleted ${deletedCount} duplicate appointments.`);

    mongoose.disconnect();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
