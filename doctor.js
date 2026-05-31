const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  specialization: { type: String, required: true },
  availableTimings: { type: [String], default: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'] },
  ratings: {
      type: [{
          patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
          rating: { type: Number, required: true }
      }],
      default: []
  },
  averageRating: { type: Number, default: 0 }
}, { timestamps: true, collection: 'doctors' });

module.exports = mongoose.model("Doctor", doctorSchema);