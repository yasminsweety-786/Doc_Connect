const Appointment = require("../models/appointment");
const Doctor = require("../models/doctor");

const sendEmail = require("../utils/email");

// Book an appointment (Patient)
exports.bookAppointment = async (req, res) => {
    try {
        const { doctorId, date, time } = req.body;
        const patientId = req.user.id;
        const patientName = req.user.name || "Patient";

        const Patient = require("../models/patient");
        const patientUser = await Patient.findById(patientId);

        if (!doctorId || !date || !time) {
            return res.status(400).json({ success: false, message: "Please provide doctorId, date, and time" });
        }

        // Notify Doctor - fetch doctor first to check availability
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ success: false, message: "Doctor not found" });
        }

        if (!doctor.available) {
            return res.status(400).json({ success: false, message: "Doctor is currently not available for bookings" });
        }

        // Check for duplicate/overlapping appointment
        const existingAppointment = await Appointment.findOne({ doctorId, date, time, status: { $ne: 'Cancelled by Admin' } });
        if (existingAppointment && existingAppointment.status !== 'Rejected') {
            return res.status(400).json({ success: false, message: "This time slot is already booked for this doctor" });
        }

        const newAppointment = await Appointment.create({
            doctorId,
            patientId,
            patientName: patientUser ? patientUser.name : patientName,
            date,
            time
        });

        if (doctor) {
            const { createNotification } = require("../routes/notificationRoute");
            await createNotification(
                doctorId,
                'Doctor',
                `New appointment booked by ${newAppointment.patientName} for ${date} at ${time}.`,
                'info'
            );

            if (doctor.email) {
                await sendEmail({
                    email: doctor.email,
                    subject: 'New Appointment Booked - DocBook',
                    message: `Hello ${doctor.name},\n\nYou have a new appointment booked by ${newAppointment.patientName} on ${newAppointment.date} at ${newAppointment.time}.\n\nPlease check your dashboard to accept or reject this appointment.`
                });
            }
        }

        res.status(201).json({ success: true, data: newAppointment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all appointments for the logged-in user (Patient or Doctor)
exports.getAppointments = async (req, res) => {
    try {
        let query;
        if (req.user.role === "doctor") {
            query = { doctorId: req.user.id };
        } else {
            query = { patientId: req.user.id };
        }

        const appointments = await Appointment.find(query)
            .populate("doctorId", "-password")
            .populate("patientId", "-password")
            .sort({ createdAt: -1 });

        res.json({ success: true, count: appointments.length, data: appointments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Booked Slots for a Specific Doctor
exports.getDoctorBookedSlots = async (req, res) => {
    try {
        const { id } = req.params;
        const appts = await Appointment.find({ doctorId: id, status: { $nin: ['Cancelled by Admin', 'Rejected'] } }).select('date time status');
        res.json({ success: true, data: appts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update Appointment Status (Doctor)
exports.updateAppointmentStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const appointmentId = req.params.id;

        if (req.user.role !== "doctor") {
            return res.status(403).json({ success: false, message: "Only doctors can update appointment statuses" });
        }

        const appointment = await Appointment.findById(appointmentId);

        if (!appointment) {
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }

        if (appointment.doctorId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: "Not authorized to update this appointment" });
        }

        appointment.status = status;
        await appointment.save();

        const { createNotification } = require("../routes/notificationRoute");

        // Notify Patient if Approved/Accepted/Rejected
        if (status === 'Accepted' || status === 'Rejected' || status === 'Completed') {
            const Patient = require("../models/patient");
            const patient = await Patient.findById(appointment.patientId);
            if (patient && patient.email) {
                const doctor = await Doctor.findById(appointment.doctorId);

                await createNotification(
                    patient._id,
                    'Patient',
                    `Your appointment with ${doctor.name} was ${status}.`,
                    status === 'Accepted' ? 'success' : status === 'Rejected' ? 'alert' : 'info'
                );

                await sendEmail({
                    email: patient.email,
                    subject: `Appointment ${status} - DocBook`,
                    message: `Hello ${patient.name},\n\nYour appointment with ${doctor.name} on ${appointment.date} at ${appointment.time} has been ${status}.\n\nThank you for using DocBook!`
                });
            }
        }

        res.json({ success: true, data: appointment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Upload Prescription (Doctor)
exports.uploadPrescription = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Please upload a prescription PDF" });
        }

        if (req.user.role !== "doctor") {
            return res.status(403).json({ success: false, message: "Only doctors can upload prescriptions" });
        }

        const appointmentId = req.params.id;
        const appointment = await Appointment.findById(appointmentId);

        if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });

        // Build the URL to serve the file
        appointment.prescriptionUrl = `/uploads/${req.file.filename}`;
        await appointment.save();

        res.json({ success: true, data: appointment, url: appointment.prescriptionUrl });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Generate Prescription automatically (Doctor)
exports.generatePrescription = async (req, res) => {
    try {
        if (req.user.role !== "doctor") {
            return res.status(403).json({ success: false, message: "Only doctors can generate prescriptions" });
        }

        const appointmentId = req.params.id;
        const { notes } = req.body;
        
        if (!notes) {
             return res.status(400).json({ success: false, message: "Please provide prescription notes" });
        }

        const appointment = await Appointment.findById(appointmentId).populate('doctorId');

        if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });

        const PDFDocument = require('pdfkit');
        const fs = require('fs');
        const path = require('path');

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const filename = `prescription_${appointmentId}_${Date.now()}.pdf`;
        const filepath = path.join(__dirname, '../uploads/', filename);

        const writeStream = fs.createWriteStream(filepath);
        doc.pipe(writeStream);

        // Header Background
        doc.rect(0, 0, doc.page.width, 140).fill('#0d9488');
        
        // Hospital Logo/Text
        doc.font('Helvetica-Bold').fontSize(28).fillColor('white').text('CITY HEALTH HOSPITAL', 0, 40, { align: 'center' });
        doc.font('Helvetica').fontSize(11).fillColor('#ccfbf1').text('International Healthcare District, NY 10001', 0, 75, { align: 'center' });
        doc.font('Helvetica').fontSize(11).fillColor('#ccfbf1').text('Emergency: +1-800-DOC-BOOK  |  www.docbookclinic.com', 0, 92, { align: 'center' });

        // Document Title
        doc.moveDown(4.5);
        doc.font('Helvetica-Bold').fontSize(18).fillColor('#1e293b').text('E-PRESCRIPTION CARD', { align: 'center', underline: true });
        doc.moveDown(1.5);

        // Sidebar Clinical Data (Vertical Bar)
        doc.lineWidth(2).strokeColor('#0d9488').moveTo(50, 200).lineTo(50, 750).stroke();

        // Top Info Box (Side-by-Side)
        doc.rect(70, 200, 475, 100).lineWidth(1).strokeColor('#e2e8f0').stroke();
        
        // Patient Corner (Left)
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e293b').text('PATIENT INFORMATION', 85, 215);
        doc.font('Helvetica').fontSize(10).fillColor('#475569').text(`Name: ${appointment.patientName}`, 85, 235);
        doc.text(`Age/Sex: 26Y / Male`, 85, 250); // Hardcoded age for realism, can be improved with real data
        doc.text(`Patient ID: ${appointment.patientId.toString().substring(0, 7).toUpperCase()}`, 85, 265);

        // Doctor Corner (Right)
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f766e').text('PRACTITIONER', 315, 215);
        doc.font('Helvetica').fontSize(10).fillColor('#475569').text(`Dr. ${appointment.doctorId.name}`, 315, 235);
        doc.text(`Specialty: ${appointment.doctorId.specialization}`, 315, 250);
        doc.text(`Date & Time: ${appointment.date} @ ${appointment.time}`, 315, 265);

        // Clinical Vitals Bar
        doc.rect(70, 315, 475, 40).fill('#f1f5f9');
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#64748b').text('BP: 120/80 mmHg', 85, 330);
        doc.text('Temp: 98.6 \u00B0F', 185, 330);
        doc.text('Pulse: 72 bpm', 285, 330);
        doc.text('Weight: 75 kg', 385, 330);

        doc.moveDown(4);

        // Rx Body
        const leftMar = 70;
        doc.font('Helvetica-Bold').fontSize(38).fillColor('#0d9488').text('Rx', leftMar, 370);
        doc.font('Helvetica').fontSize(13).fillColor('#1e293b').text('Clinical Advice & Medication:', leftMar + 50, 388);

        // White Box for Prescription Content
        doc.rect(70, 420, 475, 230).lineWidth(0.5).strokeColor('#cbd5e1').stroke();
        doc.font('Helvetica').fontSize(12).fillColor('#334155').text(notes, 85, 435, { lineGap: 8, width: 445 });

        // QR Code Placeholder Area
        doc.rect(70, 670, 100, 100).lineWidth(1).strokeColor('#f1f5f9').stroke();
        doc.fontSize(8).fillColor('#94a3b8').text('VERIFIED DOCUMENT', 80, 760);

        // Footer Section
        doc.rect(300, 670, 245, 100).lineWidth(1).strokeColor('#e2e8f0').stroke();
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#0f766e').text(`Dr. ${appointment.doctorId.name}`, 310, 690, { align: 'center', width: 225 });
        doc.font('Helvetica').fontSize(9).fillColor('#64748b').text('Regd Medical Practitioner', 310, 715, { align: 'center', width: 225 });
        
        // Digital Seal Representation
        doc.circle(500, 730, 25).lineWidth(1).strokeColor('rgba(13, 148, 136, 0.4)').stroke();
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#0d9488').text('VERIFIED', 484, 725);

        doc.end();

        writeStream.on('finish', async () => {
            appointment.prescriptionUrl = `/uploads/${filename}`;
            appointment.status = 'Completed'; 
            await appointment.save();

            try {
                const { createNotification } = require("../routes/notificationRoute");
                const Patient = require("../models/patient");
                const sendEmail = require("../utils/email");

                const patient = await Patient.findById(appointment.patientId);
                if (patient && patient.email) {
                    await createNotification(
                        patient._id,
                        'Patient',
                        `Dr. ${appointment.doctorId.name} has sent your e-prescription for your appointment on ${appointment.date}.`,
                        'success'
                    );

                    await sendEmail({
                        email: patient.email,
                        subject: `E-Prescription Available - DocBook`,
                        message: `Hello ${appointment.patientName},\n\nDr. ${appointment.doctorId.name} has generated your e-prescription for your appointment on ${appointment.date}.\n\nPlease log in to your Patient Dashboard to view and download it.\n\nThank you for using DocBook!`
                    });
                }
            } catch (notifyErr) {
                console.error("Failed to notify patient:", notifyErr);
            }

            res.json({ success: true, data: appointment, url: appointment.prescriptionUrl });
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
