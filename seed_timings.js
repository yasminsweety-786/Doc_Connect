const mongoose = require('mongoose');
const Doctor = require('./models/doctor');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/Doc_app')
  .then(async () => {
    console.log('Connected to DB');
    
    // Realistic timings with 1 PM lunch break
    const realisticTimings = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'];
    
    const result = await Doctor.updateMany(
      {},
      { $set: { availableTimings: realisticTimings } }
    );

    console.log(`Updated ${result.modifiedCount} doctors with accurate lunch-break timings.`);

    mongoose.disconnect();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
