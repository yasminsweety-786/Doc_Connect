const mongoose = require('mongoose');
const Notification = require('./models/notification');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/Doc_app')
  .then(async () => {
    console.log('Connected to DB');
    
    // Find all notifications and delete them to clean up old duplicates
    const res = await Notification.deleteMany({});
    
    console.log(`Deleted ${res.deletedCount} notifications.`);

    mongoose.disconnect();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
