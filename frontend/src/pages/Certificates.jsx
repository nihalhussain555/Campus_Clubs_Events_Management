import React, { useEffect, useState } from 'react';
import {
  Award,
  CalendarDays,
  Download,
  GraduationCap,
  MapPin,
  ArrowLeft,
  Sparkles
} from 'lucide-react';

import Navbar from '../components/Navbar';
import LoadingScreen from '../components/LoadingScreen';
import Toast from '../components/Toast';
import { eventAPI } from '../services/api';

import jsPDF from 'jspdf';


const Certificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [toast, setToast] = useState(null);

  const user = JSON.parse(
    localStorage.getItem('user') || '{}'
  );


  // =====================================================
  // LOAD CERTIFICATES
  // =====================================================

  const fetchCertificates = async () => {
    try {
      setLoading(true);

      const response =
        await eventAPI.getMyCertificates();

      setCertificates(
        response.data.certificates || []
      );

    } catch (error) {
      console.error(
        'Certificate loading error:',
        error
      );

      setToast({
        message:
          error.response?.data?.message ||
          'Unable to load certificates',
        type: 'error'
      });

    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchCertificates();
  }, []);


  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (date) => {
    if (!date) return 'Date not available';

    return new Date(date).toLocaleDateString(
      'en-US',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }
    );
  };


  // =====================================================
  // DOWNLOAD CERTIFICATE
  // =====================================================

  const downloadCertificate = (certificate) => {
    try {
      setDownloadingId(
        certificate.certificateId
      );

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });


      const pageWidth =
        pdf.internal.pageSize.getWidth();

      const pageHeight =
        pdf.internal.pageSize.getHeight();


      // =================================================
      // BACKGROUND
      // =================================================

      pdf.setFillColor(
        248,
        250,
        252
      );

      pdf.rect(
        0,
        0,
        pageWidth,
        pageHeight,
        'F'
      );


      // =================================================
      // OUTER BORDER
      // =================================================

      pdf.setDrawColor(
        20,
        95,
        130
      );

      pdf.setLineWidth(1.2);

      pdf.rect(
        10,
        10,
        pageWidth - 20,
        pageHeight - 20
      );


      pdf.setLineWidth(0.4);

      pdf.rect(
        14,
        14,
        pageWidth - 28,
        pageHeight - 28
      );


      // =================================================
      // GRADUATION CAP SYMBOL
      // =================================================

      pdf.setFillColor(
        20,
        95,
        130
      );

      pdf.triangle(
        pageWidth / 2 - 10,
        28,
        pageWidth / 2 + 10,
        28,
        pageWidth / 2,
        21,
        'F'
      );


      pdf.rect(
        pageWidth / 2 - 8,
        27,
        16,
        3,
        'F'
      );


      // =================================================
      // TITLE
      // =================================================

      pdf.setTextColor(
        15,
        23,
        42
      );

      pdf.setFont(
        'helvetica',
        'bold'
      );

      pdf.setFontSize(28);

      pdf.text(
        'CERTIFICATE OF PARTICIPATION',
        pageWidth / 2,
        48,
        {
          align: 'center'
        }
      );


      // =================================================
      // SUBTITLE
      // =================================================

      pdf.setFont(
        'helvetica',
        'normal'
      );

      pdf.setFontSize(12);

      pdf.setTextColor(
        100,
        116,
        139
      );

      pdf.text(
        'Student & Club Management System',
        pageWidth / 2,
        58,
        {
          align: 'center'
        }
      );


      // =================================================
      // PRESENTATION TEXT
      // =================================================

      pdf.setFontSize(13);

      pdf.setTextColor(
        71,
        85,
        105
      );

      pdf.text(
        'This certificate is proudly presented to',
        pageWidth / 2,
        76,
        {
          align: 'center'
        }
      );


      // =================================================
      // STUDENT NAME
      // =================================================

      pdf.setFont(
        'helvetica',
        'bold'
      );

      pdf.setFontSize(25);

      pdf.setTextColor(
        20,
        95,
        130
      );

      pdf.text(
        user.name || 'Student',
        pageWidth / 2,
        91,
        {
          align: 'center'
        }
      );


      // =================================================
      // EVENT TEXT
      // =================================================

      pdf.setFont(
        'helvetica',
        'normal'
      );

      pdf.setFontSize(13);

      pdf.setTextColor(
        71,
        85,
        105
      );

      pdf.text(
        'for successfully participating in',
        pageWidth / 2,
        105,
        {
          align: 'center'
        }
      );


      // =================================================
      // EVENT NAME
      // =================================================

      pdf.setFont(
        'helvetica',
        'bold'
      );

      pdf.setFontSize(20);

      pdf.setTextColor(
        15,
        23,
        42
      );

      const eventName =
        certificate.eventName || 'Campus Event';

      pdf.text(
        eventName,
        pageWidth / 2,
        118,
        {
          align: 'center',
          maxWidth: 230
        }
      );


      // =================================================
      // EVENT DETAILS
      // =================================================

      pdf.setFont(
        'helvetica',
        'normal'
      );

      pdf.setFontSize(10);

      pdf.setTextColor(
        100,
        116,
        139
      );

      const details =
        `${certificate.clubName || 'Campus Club'}  •  ${formatDate(certificate.eventDate)}`;

      pdf.text(
        details,
        pageWidth / 2,
        132,
        {
          align: 'center'
        }
      );


      // =================================================
      // CERTIFICATE ID
      // =================================================

      pdf.setFontSize(9);

      pdf.text(
        `Certificate ID: ${certificate.certificateId}`,
        pageWidth / 2,
        145,
        {
          align: 'center'
        }
      );


      // =================================================
      // SIGNATURE AREA
      // =================================================

      const signatureY = 168;

      pdf.setDrawColor(
        148,
        163,
        184
      );

      pdf.line(
        45,
        signatureY,
        100,
        signatureY
      );

      pdf.line(
        pageWidth - 100,
        signatureY,
        pageWidth - 45,
        signatureY
      );


      pdf.setFontSize(9);

      pdf.setTextColor(
        71,
        85,
        105
      );

      pdf.text(
        'Student',
        72.5,
        signatureY + 7,
        {
          align: 'center'
        }
      );

      pdf.text(
        'Event Coordinator',
        pageWidth - 72.5,
        signatureY + 7,
        {
          align: 'center'
        }
      );


      // =================================================
      // FOOTER
      // =================================================

      pdf.setFontSize(8);

      pdf.setTextColor(
        148,
        163,
        184
      );

      pdf.text(
        'Student & Club Management System',
        pageWidth / 2,
        pageHeight - 17,
        {
          align: 'center'
        }
      );


      // =================================================
      // SAVE PDF
      // =================================================

      const safeName =
        (certificate.eventName || 'event')
          .replace(/[^a-z0-9]/gi, '-')
          .toLowerCase();

      pdf.save(
        `Certificate-${safeName}.pdf`
      );


      setToast({
        message:
          'Certificate downloaded successfully',
        type: 'success'
      });

    } catch (error) {
      console.error(
        'Certificate download error:',
        error
      );

      setToast({
        message:
          'Unable to generate certificate',
        type: 'error'
      });

    } finally {
      setDownloadingId(null);
    }
  };


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <LoadingScreen
        message="Loading certificates..."
      />
    );
  }


  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="app-page min-h-screen">
      <Navbar />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() =>
            setToast(null)
          }
        />
      )}


      <main className="page-section pt-8">
        <div className="page-container">


          {/* ==========================================
              BACK BUTTON
          ========================================== */}

          <button
            type="button"
            onClick={() =>
              window.history.back()
            }
            className="mb-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition hover:border-[#145f82] hover:bg-[#eef8fc] hover:text-[#145f82]"
          >
            <ArrowLeft size={17} />
            Back
          </button>


          {/* ==========================================
              HEADER
          ========================================== */}

          <div className="mb-8">

            <div className="mb-3 flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef8fc] text-[#145f82]">
                <Award size={25} />
              </div>

              <div>
                <span className="text-xs font-black uppercase tracking-[0.18em] text-[#145f82]">
                  Achievements
                </span>

                <h1 className="display-title text-4xl sm:text-5xl">
                  My Certificates
                </h1>
              </div>

            </div>

            <p className="section-copy max-w-2xl">
              View certificates earned by participating in
              completed campus events and download them
              as PDF documents.
            </p>

          </div>


          {/* ==========================================
              EMPTY STATE
          ========================================== */}

          {certificates.length === 0 ? (

            <div className="app-card overflow-hidden">

              <div className="flex flex-col items-center justify-center px-6 py-20 text-center">

                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#eef8fc]">
                  <GraduationCap
                    size={48}
                    className="text-[#145f82]"
                    strokeWidth={1.5}
                  />
                </div>

                <div className="mb-3 flex items-center gap-2 text-[#145f82]">
                  <Sparkles size={18} />
                  <span className="text-sm font-black uppercase tracking-wider">
                    Keep participating
                  </span>
                </div>

                <h2 className="text-2xl font-black text-slate-900">
                  No Certificates Yet
                </h2>

                <p className="mt-3 max-w-lg text-sm leading-6 text-slate-500">
                  Register for campus events and participate
                  in them. Once an event is completed,
                  your certificate will appear here.
                </p>

              </div>

            </div>

          ) : (

            /* ==========================================
               CERTIFICATE GRID
            ========================================== */

            <div className="grid gap-6 md:grid-cols-2">

              {certificates.map(
                (certificate) => (

                  <article
                    key={certificate.certificateId}
                    className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >

                    {/* Certificate Preview */}

                    <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-[#eef8fc] p-6">

                      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#145f82]/5" />

                      <div className="absolute -bottom-16 -left-10 h-32 w-32 rounded-full bg-[#145f82]/5" />


                      <div className="relative rounded-2xl border-2 border-[#145f82]/20 bg-white p-6 text-center">

                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#eef8fc]">
                          <GraduationCap
                            size={26}
                            className="text-[#145f82]"
                          />
                        </div>

                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#145f82]">
                          Certificate of Participation
                        </p>

                        <p className="mt-4 text-xs text-slate-500">
                          This certificate is presented to
                        </p>

                        <h2 className="mt-2 text-xl font-black text-slate-900">
                          {user.name || 'Student'}
                        </h2>

                        <p className="mt-3 text-xs text-slate-500">
                          for participating in
                        </p>

                        <h3 className="mt-1 line-clamp-2 text-lg font-black text-[#145f82]">
                          {certificate.eventName}
                        </h3>

                        <div className="mt-4 text-xs text-slate-400">
                          {formatDate(
                            certificate.eventDate
                          )}
                        </div>

                      </div>

                    </div>


                    {/* Certificate Information */}

                    <div className="p-6">

                      <div className="mb-5">

                        <h3 className="text-xl font-black text-slate-900">
                          {certificate.eventName}
                        </h3>

                        <p className="mt-1 text-sm font-semibold text-[#145f82]">
                          {certificate.clubName}
                        </p>

                      </div>


                      <div className="space-y-3 text-sm text-slate-600">

                        <div className="flex items-center gap-3">
                          <CalendarDays
                            size={17}
                            className="shrink-0 text-[#145f82]"
                          />

                          <span>
                            {formatDate(
                              certificate.eventDate
                            )}
                          </span>
                        </div>


                        <div className="flex items-center gap-3">
                          <MapPin
                            size={17}
                            className="shrink-0 text-[#145f82]"
                          />

                          <span>
                            {certificate.location ||
                              'Campus'}
                          </span>
                        </div>


                        <div className="flex items-center gap-3">
                          <Award
                            size={17}
                            className="shrink-0 text-[#145f82]"
                          />

                          <span className="font-mono text-xs">
                            {certificate.certificateId}
                          </span>
                        </div>

                      </div>


                      {/* Download */}

                      <button
                        type="button"
                        onClick={() =>
                          downloadCertificate(
                            certificate
                          )
                        }
                        disabled={
                          downloadingId ===
                          certificate.certificateId
                        }
                        className="btn-primary mt-6 w-full justify-center"
                      >

                        <Download size={18} />

                        {downloadingId ===
                        certificate.certificateId
                          ? 'Generating Certificate...'
                          : 'Download Certificate'}

                      </button>

                    </div>

                  </article>

                )
              )}

            </div>

          )}

        </div>
      </main>

    </div>
  );
};


export default Certificates;