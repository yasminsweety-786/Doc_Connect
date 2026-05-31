const mongoose = require('mongoose');
const Appointment = require('./models/appointment');
const Doctor = require('./models/doctor');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const generate = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        // Find Rahul Deshmukh's appointment
        const appointment = await Appointment.findOne({ patientName: /Rahul Deshmukh/i }).populate('doctorId');
        if (!appointment) return console.log("Rahul not found");

        const appointmentId = appointment._id;
        const notes = "DIAGNOSIS: INFLUENZA (VIRAL FEVER)\n\n1. Tab. Paracetamol 650mg - 1 Tab as needed for fever.\n2. Tab. Vitamin C 500mg - 1 Tab daily for 10 days.\n3. Syrup Alex Cough (10ml) - 2 times a day after meals.\n4. Tab. Pantop 40mg - 1 Tab empty stomach for 5 days.\n\nADVICE: Steam inhalation twice a day. Plenty of warm fluids and 3 days complete bed rest.";

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const filename = `prescription_rahul_official_${Date.now()}.pdf`;
        const filepath = path.join(__dirname, 'uploads/', filename);

        if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
        const writeStream = fs.createWriteStream(filepath);
        doc.pipe(writeStream);

        // --- PDF LAYOUT (Official Branding) ---
        doc.rect(0, 0, doc.page.width, 140).fill('#0d9488');
        doc.font('Helvetica-Bold').fontSize(28).fillColor('white').text('CITY HEALTH HOSPITAL', 0, 40, { align: 'center' });
        doc.font('Helvetica').fontSize(11).fillColor('#ccfbf1').text('International Healthcare District, NY 10001', 0, 75, { align: 'center' });

        doc.moveDown(4.5);
        doc.font('Helvetica-Bold').fontSize(18).fillColor('#1e293b').text('OFFICIAL E-PRESCRIPTION', { align: 'center', underline: true });
        doc.moveDown(1.5);

        doc.lineWidth(2).strokeColor('#0d9488').moveTo(50, 200).lineTo(50, 750).stroke();

        doc.rect(70, 200, 475, 100).lineWidth(1).strokeColor('#e2e8f0').stroke();
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e293b').text('PATIENT INFORMATION', 85, 215);
        doc.font('Helvetica').fontSize(10).fillColor('#475569').text(`Name: ${appointment.patientName}`, 85, 235);
        doc.text(`Age/Sex: 26Y / Male`, 85, 250); 
        doc.text(`Patient ID: ${appointment.patientId.toString().substring(0, 7).toUpperCase()}`, 85, 265);

        doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f766e').text('PRACTITIONER', 315, 215);
        doc.font('Helvetica').fontSize(10).fillColor('#475569').text(`Dr. ${appointment.doctorId.name}`, 315, 235);
        doc.text(`Specialty: ${appointment.doctorId.specialization}`, 315, 250);
        doc.text(`Date: ${appointment.date}`, 315, 265);

        doc.rect(70, 315, 475, 40).fill('#f1f5f9');
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#64748b').text('BP: 110/70 mmHg', 85, 330);
        doc.text('Temp: 101.2 \u00B0F', 185, 330);
        doc.text('Pulse: 84 bpm', 285, 330);
        doc.text('Weight: 72 kg', 385, 330);

        doc.moveDown(4);
        doc.font('Helvetica-Bold').fontSize(38).fillColor('#0d9488').text('Rx', 70, 370);
        doc.font('Helvetica').fontSize(13).fillColor('#1e293b').text('Clinical Advice & Medication:', 120, 388);

        doc.rect(70, 420, 475, 230).lineWidth(0.5).strokeColor('#cbd5e1').stroke();
        doc.font('Helvetica').fontSize(12).fillColor('#334155').text(notes, 85, 435, { lineGap: 8, width: 445 });

        doc.rect(300, 670, 245, 100).lineWidth(1).strokeColor('#e2e8f0').stroke();
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#0f766e').text(`Dr. ${appointment.doctorId.name}`, 310, 690, { align: 'center', width: 225 });
        doc.font('Helvetica').fontSize(9).fillColor('#64748b').text('Regd Medical Practitioner', 310, 715, { align: 'center', width: 225 });

        doc.end();

        writeStream.on('finish', async () => {
            appointment.prescriptionUrl = `/uploads/${filename}`;
            appointment.status = 'Completed';
            await appointment.save();
            console.log("Rahul Deshmukh's official prescription generated and database updated.");
            process.exit(0);
        });

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

generate();
