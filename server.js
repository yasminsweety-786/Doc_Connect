const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const path = require("path");

dotenv.config({ path: path.join(__dirname, '.env') });
connectDB();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/doctors", require("./routes/doctorRoute"));
app.use("/api/appointments", require("./routes/appointmentRoute"));
app.use("/api/admin", require("./routes/adminRoute"));
app.use("/api/notifications", require("./routes/notificationRoute").router);

// Serve frontend in production (Hugging Face / Docker)
// The Dockerfile will place the React build in /app/build, and the server runs in /app/backend
app.use(express.static(path.join(__dirname, '../build')));

app.get(/(.*)/, (req, res) => {
    res.sendFile(path.resolve(__dirname, '../build', 'index.html'));
});

// Use port 7860 if not specified (Hugging Face Spaces requirement)
const PORT = process.env.PORT || 7860;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));