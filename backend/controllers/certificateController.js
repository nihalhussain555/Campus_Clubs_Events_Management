import crypto from "crypto";
import PDFDocument from "pdfkit";

import Certificate from "../models/Certificate.js";
import Event from "../models/Event.js";
import User from "../models/User.js";

/* =========================================================
   ISSUE CERTIFICATE
========================================================= */

export const issueCertificate = async (userId, eventId) => {
  const event = await Event.findById(eventId).populate(
    "club",
    "clubName category"
  );

  if (!event) {
    throw new Error("Event not found");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  // Check registration
  const registered = (event.registeredStudents || []).some(
    (id) => id.toString() === userId.toString()
  );

  if (!registered) {
    throw new Error("Student is not registered for this event");
  }

  // Check attendance
  const attended = (event.participants || []).some(
    (id) => id.toString() === userId.toString()
  );

  if (!attended) {
    throw new Error("Attendance is not marked");
  }

  // Check certificate setting
  if (!event.certificateEnabled) {
    throw new Error("Certificate generation is disabled for this event");
  }

  // Prevent duplicate certificate
  const existing = await Certificate.findOne({
    user: userId,
    event: eventId,
  });

  if (existing) {
    return existing;
  }

  const certificateId =
    `CERT-${Date.now()}-${crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase()}`;

  const qrToken = crypto.randomBytes(32).toString("hex");

  const certificate = await Certificate.create({
    certificateId,

    user: userId,

    event: event._id,

    studentName: user.name,

    eventName: event.title,

    eventDate: event.date,

    endDate: event.endDate,

    location: event.location || "TBD",

    clubName:
      event.club?.clubName ||
      "Campus Club",

    category:
      event.category ||
      "General",

    issuedAt: new Date(),

    qrToken,

    verified: true,
  });

  // Add recipient if field exists
  if (Array.isArray(event.certificateRecipients)) {
    const alreadyAdded =
      event.certificateRecipients.some(
        (id) =>
          id.toString() === userId.toString()
      );

    if (!alreadyAdded) {
      event.certificateRecipients.push(userId);
    }
  }

  event.certificateIssuedAt = new Date();

  await event.save();

  return certificate;
};


/* =========================================================
   CREATE / ISSUE CERTIFICATE
========================================================= */

export const createCertificate = async (req, res) => {
  try {
    const { userId, eventId } = req.body;

    if (!userId || !eventId) {
      return res.status(400).json({
        success: false,
        message: "userId and eventId are required",
      });
    }

    const certificate = await issueCertificate(
      userId,
      eventId
    );

    return res.status(201).json({
      success: true,
      message: "Certificate generated successfully",
      certificate,
    });
  } catch (error) {
    console.error(
      "Certificate creation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* =========================================================
   GET MY CERTIFICATE HISTORY
========================================================= */

export const getMyCertificates = async (
  req,
  res
) => {
  try {
    const userId =
      req.user?.id ||
      req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    const certificates =
      await Certificate.find({
        user: userId,
      })
        .populate("event")
        .sort({
          issuedAt: -1,
        });

    const frontendUrl =
      process.env.FRONTEND_URL ||
      "http://localhost:5173";

    const result = certificates.map(
      (certificate) => ({
        ...certificate.toObject(),

        verificationUrl:
          `${frontendUrl}/verify-certificate/` +
          certificate.qrToken,
      })
    );

    return res.json({
      success: true,
      certificates: result,
    });
  } catch (error) {
    console.error(
      "Get certificates error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* =========================================================
   GET CERTIFICATE BY ID
========================================================= */

export const getCertificateById = async (
  req,
  res
) => {
  try {
    const certificate =
      await Certificate.findOne({
        certificateId:
          req.params.certificateId,
      })
        .populate(
          "user",
          "name email"
        )
        .populate("event");

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
      });
    }

    return res.json({
      success: true,
      certificate,
    });
  } catch (error) {
    console.error(
      "Get certificate error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* =========================================================
   VERIFY CERTIFICATE
========================================================= */

export const verifyCertificate = async (
  req,
  res
) => {
  try {
    const token =
      req.params.Token;

    if (!token) {
      return res.status(400).json({
        success: false,
        verified: false,
        message:
          "Certificate verification token is required",
      });
    }

    const certificate =
      await Certificate.findOne({
        $or: [
          {
            qrToken: token,
          },
          {
            certificateId: token,
          },
        ],
      })
        .populate(
          "user",
          "name email"
        )
        .populate("event");

    if (!certificate) {
      return res.status(404).json({
        success: false,
        verified: false,
        message:
          "Invalid certificate",
      });
    }

    return res.json({
      success: true,

      verified: true,

      certificate,
    });
  } catch (error) {
    console.error(
      "Certificate verification error:",
      error
    );

    return res.status(500).json({
      success: false,
      verified: false,
      message:
        "Certificate verification failed",
    });
  }
};


/* =========================================================
   DOWNLOAD CERTIFICATE PDF
========================================================= */

export const downloadCertificatePDF = async (
  req,
  res
) => {
  try {
    const userId =
      req.user?.id ||
      req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    const certificate =
      await Certificate.findOne({
        certificateId:
          req.params.certificateId,

        user: userId,
      });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message:
          "Certificate not found",
      });
    }

    const filename =
      `${certificate.certificateId}.pdf`;

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    const doc =
      new PDFDocument({
        size: "A4",
        layout: "landscape",
        margin: 40,
      });

    doc.pipe(res);

    const pageWidth =
      doc.page.width;

    const pageHeight =
      doc.page.height;

    /* Outer border */

    doc
      .lineWidth(4)
      .rect(
        20,
        20,
        pageWidth - 40,
        pageHeight - 40
      )
      .stroke("#145f82");

    /* Inner border */

    doc
      .lineWidth(1)
      .rect(
        30,
        30,
        pageWidth - 60,
        pageHeight - 60
      )
      .stroke("#888888");

    /* Header */

    doc
      .fontSize(34)
      .fillColor("#145f82")
      .font("Helvetica-Bold")
      .text(
        "CERTIFICATE",
        0,
        75,
        {
          align: "center",
        }
      );

    doc
      .fontSize(17)
      .fillColor("#444444")
      .font("Helvetica")
      .text(
        "OF PARTICIPATION",
        0,
        120,
        {
          align: "center",
        }
      );

    doc
      .fontSize(15)
      .fillColor("#555555")
      .text(
        "This certificate is proudly presented to",
        0,
        170,
        {
          align: "center",
        }
      );

    /* Student */

    doc
      .fontSize(31)
      .fillColor("#111111")
      .font("Helvetica-Bold")
      .text(
        certificate.studentName ||
          "Student",
        0,
        205,
        {
          align: "center",
        }
      );

    /* Description */

    doc
      .fontSize(15)
      .fillColor("#555555")
      .font("Helvetica")
      .text(
        "for successfully participating in",
        0,
        260,
        {
          align: "center",
        }
      );

    /* Event */

    doc
      .fontSize(24)
      .fillColor("#145f82")
      .font("Helvetica-Bold")
      .text(
        certificate.eventName ||
          "Campus Event",
        80,
        290,
        {
          width:
            pageWidth - 160,
          align: "center",
        }
      );

    /* Club */

    doc
      .fontSize(14)
      .fillColor("#444444")
      .font("Helvetica")
      .text(
        `Organized by ${
          certificate.clubName ||
          "Campus Club"
        }`,
        0,
        335,
        {
          align: "center",
        }
      );

    /* Information */

    const infoY = 410;

    doc
      .fontSize(11)
      .fillColor("#333333");

    doc.text(
      `Event Date: ${
        certificate.eventDate
          ? new Date(
              certificate.eventDate
            ).toLocaleDateString(
              "en-IN"
            )
          : "N/A"
      }`,
      80,
      infoY
    );

    doc.text(
      `Location: ${
        certificate.location ||
        "N/A"
      }`,
      80,
      infoY + 25
    );

    doc.text(
      `Certificate ID: ${
        certificate.certificateId
      }`,
      80,
      infoY + 50
    );

    doc.text(
      `Issued On: ${
        certificate.issuedAt
          ? new Date(
              certificate.issuedAt
            ).toLocaleDateString(
              "en-IN"
            )
          : "N/A"
      }`,
      80,
      infoY + 75
    );

    /* Verification */

    const frontendUrl =
      process.env.FRONTEND_URL ||
      "http://localhost:5173";

    const verificationUrl =
      `${frontendUrl}/verify-certificate/` +
      certificate.qrToken;

    doc
      .fontSize(9)
      .fillColor("#145f82")
      .text(
        verificationUrl,
        80,
        525,
        {
          width:
            pageWidth - 160,
        }
      );

    doc
      .fontSize(9)
      .fillColor("#777777")
      .text(
        "Scan the QR code or open the verification URL to verify this certificate.",
        80,
        545,
        {
          width:
            pageWidth - 160,
        }
      );

    doc.end();
  } catch (error) {
    console.error(
      "PDF generation error:",
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message:
          "Unable to generate certificate PDF",
      });
    }
  }
};