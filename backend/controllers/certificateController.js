import Certificate from '../models/Certificate.js';

// =====================================================
// GENERATE UNIQUE CERTIFICATE ID
// =====================================================

const generateCertificateId = () => {
  const year = new Date().getFullYear();

  const randomPart = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();

  return `CERT-${year}-${randomPart}`;
};


// =====================================================
// GET MY CERTIFICATES
// GET /api/certificates/my
// =====================================================

export const getMyCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find({
      student: req.user.id
    })
      .populate('event', 'title description date endDate location')
      .populate('student', 'name email')
      .sort({ issuedAt: -1 });

    res.status(200).json({
      success: true,
      count: certificates.length,
      certificates
    });
  } catch (error) {
    console.error('Get certificates error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to load certificates',
      error: error.message
    });
  }
};


// =====================================================
// GET CERTIFICATE BY ID
// GET /api/certificates/:certificateId
// PUBLIC
// =====================================================

export const getCertificateById = async (req, res) => {
  try {
    const certificate = await Certificate.findOne({
      certificateId: req.params.certificateId
    })
      .populate('student', 'name email')
      .populate(
        'event',
        'title description date endDate location category'
      );

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    res.status(200).json({
      success: true,
      certificate
    });
  } catch (error) {
    console.error('Certificate verification error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to verify certificate',
      error: error.message
    });
  }
};


// =====================================================
// CREATE CERTIFICATE
// Used by event attendance logic
// =====================================================

export const createCertificate = async ({
  studentId,
  eventId
}) => {
  try {
    // Check if certificate already exists
    const existingCertificate = await Certificate.findOne({
      student: studentId,
      event: eventId
    });

    if (existingCertificate) {
      return existingCertificate;
    }

    let certificateId;
    let exists = true;

    // Ensure certificate ID is unique
    while (exists) {
      certificateId = generateCertificateId();

      exists = await Certificate.exists({
        certificateId
      });
    }

    const frontendUrl =
      process.env.FRONTEND_URL || 'http://localhost:5173';

    const verificationUrl =
      `${frontendUrl}/verify-certificate/${certificateId}`;

    const certificate = await Certificate.create({
      certificateId,
      student: studentId,
      event: eventId,
      issuedAt: new Date(),
      verificationUrl
    });

    return certificate;
  } catch (error) {
    console.error('Create certificate error:', error);
    throw error;
  }
};