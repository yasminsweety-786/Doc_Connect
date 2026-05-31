const mongoose = require('mongoose');
const Appointment = require('./models/appointment');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/Doc_app')
  .then(async () => {
    console.log('Connected to DB');
    
    // Find all appointments
    const allAppts = await Appointment.find({});
    
    // Track unique slots
    const seenSlots = new Set();
    const duplicates = [];

    for (const appt of allAppts) {
        // Skip cancelled appointments
        if (appt.status === 'Cancelled by Admin') continue;

        const slotKey = `${appt.doctorId.toString()}_${appt.date}_${appt.time}`;
        if (seenSlots.has(slotKey)) {
            duplicates.push(appt._id);
        } else {
            seenSlots.add(slotKey);
        }
    }

    if (duplicates.length > 0) {
        await Appointment.deleteMany({ _id: { $in: duplicates } });
        console.log(`Deleted ${duplicates.length} duplicate appointments.`);
    } else {
        console.log('No duplicate appointments found.');
    }

    mongoose.disconnect();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
