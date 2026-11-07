import React, { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import {
  Award,
  CalendarDays,
  Download,
  Eye,
  Hash,
  MapPin,
  ShieldCheck,
  Tag,
  X,
} from "lucide-react";

import { QRCodeSVG } from "qrcode.react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LoadingScreen from "../components/LoadingScreen";
import Toast from "../components/Toast";

import { certificateAPI } from "../services/api";

const Certificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [selectedCertificate, setSelectedCertificate] =
    useState(null);

  const [downloading, setDownloading] = useState(null);

  // =====================================================
  // FETCH CERTIFICATES
  // =====================================================

  const fetchCertificates = async () => {
    try {
      const response =
        await certificateAPI.getMyCertificates();

      setCertificates(
        response.data?.certificates || []
      );
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message ||
          "Failed to load certificates",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  // =====================================================
  // DOWNLOAD CERTIFICATE
  // =====================================================

  const downloadPDF = async (certificate) => {
    try {
      setDownloading(certificate.certificateId);

      const response =
        await certificateAPI.downloadCertificate(
          certificate.certificateId
        );

      const blob = new Blob([response.data], {
        type: "application/pdf",
      });

      const url =
        window.URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        `${certificate.certificateId}.pdf`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);

      setToast({
        message:
          "Certificate downloaded successfully",
        type: "success",
      });
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message ||
          "Failed to download certificate",
        type: "error",
      });
    } finally {
      setDownloading(null);
    }
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (date) => {
    if (!date) return "N/A";

    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );
  };

  // =====================================================
  // GET USER NAME
  // =====================================================

  const getStudentName = (certificate) => {
    if (certificate?.studentName) {
      return certificate.studentName;
    }

    if (certificate?.user?.name) {
      return certificate.user.name;
    }

    if (certificate?.recipientName) {
      return certificate.recipientName;
    }

    try {
      const user =
        JSON.parse(
          localStorage.getItem("user")
        );

      return user?.name || "Student";
    } catch {
      return "Student";
    }
  };

  // =====================================================
  // GET VERIFY URL
  // =====================================================

  // Prefer the link the server was configured with, so a code scanned on a
  // phone resolves to the public site; fall back to the running origin, which
  // keeps a LAN or localhost preview working.
  const getVerifyUrl = (certificate) =>
    certificate.verificationUrl ||
    `${window.location.origin}/verify-certificate/${certificate.qrToken}`;

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
    <div className="app-page">

      <Navbar />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <main className="page-section pt-8">

        <div className="page-container">

          {/* =================================================
              PAGE HEADER
          ================================================= */}

          <div className="mb-8">

            <span className="eyebrow flex items-center gap-2">
              <Award size={16} />
              Achievements
            </span>

            <h1 className="display-title text-4xl sm:text-5xl">
              My Certificates
            </h1>

            <p className="section-copy mt-4">
              Every certificate you have earned, with the QR link anyone
              can use to check that it is genuine.
            </p>

            {certificates.length > 0 && (
              <p className="chip mt-5">
                {certificates.length}{" "}
                {certificates.length === 1
                  ? "certificate"
                  : "certificates"}
              </p>
            )}

          </div>


          {/* =================================================
              EMPTY STATE
          ================================================= */}

          {certificates.length === 0 ? (

            <div className="app-card py-14 text-center">

              <div className="icon-tile mx-auto">
                <Award size={26} />
              </div>

              <h2 className="mt-5 text-2xl font-black">
                No certificates yet
              </h2>

              <p className="mx-auto mt-2 max-w-md text-slate-500">
                Certificates are issued automatically once you check in
                at an event you registered for.
              </p>

              <Link
                to="/events"
                className="btn-primary mx-auto mt-6"
              >
                Browse events
              </Link>

            </div>

          ) : (

            <div className="grid gap-6 lg:grid-cols-2">

              {certificates.map((certificate) => {

                const verifyUrl =
                  getVerifyUrl(certificate);

                return (

                  <article
                    key={certificate._id}
                    className="app-card app-card-hover flex flex-col"
                  >

                    {/* Club and event */}

                    <div className="flex items-start justify-between gap-4">

                      <div className="min-w-0">

                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                          {certificate.clubName || "Campus Club"}
                        </p>

                        <h3 className="mt-1 text-2xl font-black">
                          {certificate.eventName}
                        </h3>

                      </div>

                      <div className="icon-tile">
                        <Award size={22} />
                      </div>

                    </div>


                    {/* Details */}

                    <dl className="mt-5 grid grid-cols-[1rem_auto_1fr] items-center gap-x-3 gap-y-2.5 text-sm">

                      <CalendarDays
                        size={16}
                        className="text-slate-400"
                      />

                      <dt className="text-slate-500">
                        Event date
                      </dt>

                      <dd className="font-bold text-slate-800">
                        {formatDate(certificate.eventDate)}
                      </dd>

                      <MapPin
                        size={16}
                        className="text-slate-400"
                      />

                      <dt className="text-slate-500">
                        Location
                      </dt>

                      <dd className="truncate font-bold text-slate-800">
                        {certificate.location || "TBD"}
                      </dd>

                      <Tag
                        size={16}
                        className="text-slate-400"
                      />

                      <dt className="text-slate-500">
                        Category
                      </dt>

                      <dd className="font-bold text-slate-800">
                        {certificate.category || "General"}
                      </dd>

                      <Hash
                        size={16}
                        className="text-slate-400"
                      />

                      <dt className="text-slate-500">
                        Certificate ID
                      </dt>

                      <dd className="break-all font-mono text-xs font-bold text-slate-800">
                        {certificate.certificateId}
                      </dd>

                    </dl>


                    {/* Actions sit at the bottom so cards line up */}

                    <div className="mt-auto">

                      <div className="mt-6 grid grid-cols-2 gap-3">

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedCertificate(
                              certificate
                            )
                          }
                          className="btn-primary flex items-center justify-center gap-2"
                        >

                          <Eye size={16} />

                          View

                        </button>


                        <a
                          href={verifyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary flex items-center justify-center gap-2"
                        >

                          <ShieldCheck size={16} />

                          Verify

                        </a>

                      </div>


                      {/* Issued date */}

                      <p className="mt-4 text-xs text-slate-500">
                        Issued{" "}
                        {formatDate(
                          certificate.issuedAt
                        )}
                      </p>

                    </div>

                  </article>

                );
              })}

            </div>

          )}

        </div>

      </main>


      <Footer />


      {/* =====================================================
          CERTIFICATE PREVIEW MODAL
      ===================================================== */}

      {selectedCertificate && (

        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          onClick={() =>
            setSelectedCertificate(null)
          }
        >

          <div
            className="relative w-full max-w-6xl max-h-[95vh] overflow-y-auto rounded-3xl bg-white p-4 sm:p-6 shadow-2xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* CLOSE */}

            <button
              type="button"
              onClick={() =>
                setSelectedCertificate(null)
              }
              className="absolute right-5 top-5 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-lg border border-slate-200 hover:bg-slate-100"
              aria-label="Close certificate"
            >

              <X size={22} />

            </button>


            {/* =================================================
                CERTIFICATE
            ================================================= */}

            <div className="certificate-sheet">

              {/* =================================================
                  LEFT CURVED DESIGN
              ================================================= */}

              <div className="certificate-curve" aria-hidden="true">

                <span className="certificate-arc-a" />
                <span className="certificate-arc-b" />
                <span className="certificate-arc-c" />
                <span className="certificate-arc-d" />
                <span className="certificate-arc-e" />
                <span className="certificate-arc-f" />

              </div>


              {/* =================================================
                  CERTIFICATE CONTENT
              ================================================= */}

              <div className="certificate-body">

                <p className="certificate-brand">
                  Campus Clubs
                </p>

                <div className="certificate-main">

                  <p className="certificate-kicker">
                    Participation Certificate
                  </p>

                  <p className="certificate-lead">
                    This certificate is proudly presented to
                  </p>

                  <h1 className="certificate-name">
                    {getStudentName(
                      selectedCertificate
                    )}
                  </h1>

                  <div className="certificate-rule" />

                  <p className="certificate-for">
                    for taking part in
                  </p>

                  <h2 className="certificate-event">
                    {selectedCertificate.eventName}
                  </h2>

                </div>


                {/* Three equal cells keep the footer aligned */}

                <div className="certificate-footer">

                  <div className="certificate-cell">

                    <p className="certificate-value">
                      {formatDate(
                        selectedCertificate.eventDate ||
                        selectedCertificate.issuedAt
                      )}
                    </p>

                    <div className="certificate-line" />

                    <p className="certificate-caption">
                      Date
                    </p>

                  </div>


                  <div className="certificate-cell">

                    <div className="certificate-qr">

                      <QRCodeSVG
                        value={getVerifyUrl(
                          selectedCertificate
                        )}
                        size={120}
                        level="H"
                        includeMargin={false}
                      />

                    </div>

                    <p className="certificate-caption">
                      Scan to verify
                    </p>

                  </div>


                  <div className="certificate-cell">

                    <p className="certificate-sign">
                      Campus Clubs
                    </p>

                    <div className="certificate-line" />

                    <p className="certificate-caption">
                      Issued by
                    </p>

                  </div>

                </div>


                <p className="certificate-meta">
                  {selectedCertificate.clubName || "Campus Club"}
                  {" · "}
                  {selectedCertificate.location || "TBD"}
                </p>

                <p className="certificate-id">
                  {selectedCertificate.certificateId}
                </p>

              </div>

            </div>


            {/* =================================================
                DOWNLOAD BUTTON
            ================================================= */}

            <div className="flex justify-center pt-5">

              <button
                type="button"
                onClick={() =>
                  downloadPDF(
                    selectedCertificate
                  )
                }
                disabled={
                  downloading ===
                  selectedCertificate.certificateId
                }
                className="btn-primary flex items-center justify-center gap-2 px-8"
              >

                <Download size={18} />

                {downloading ===
                selectedCertificate.certificateId
                  ? "Downloading..."
                  : "Download Certificate"}

              </button>

            </div>

          </div>

        </div>

      )}

      {/* =====================================================
          CERTIFICATE PAPER STYLES

          A certificate is a document, so it keeps one fixed paper palette
          whatever the app theme is. Literal hex on private class names is
          deliberate: the dark stylesheet only ever re-declares Tailwind
          utility names, so it cannot reach these.
      ===================================================== */}

      <style>
        {`
          .certificate-sheet {
            position: relative;
            display: flex;
            width: 100%;
            min-height: 520px;
            aspect-ratio: 1.414 / 1;
            overflow: hidden;
            border: 1px solid #d4dbe2;
            background: #ffffff;
            box-shadow: 0 18px 50px rgba(15, 23, 42, 0.14);
          }

          .certificate-curve {
            position: relative;
            flex: 0 0 30%;
            overflow: hidden;
          }

          .certificate-curve > span {
            position: absolute;
            display: block;
            border-radius: 9999px;
          }

          .certificate-arc-a {
            top: -10%;
            left: -70%;
            width: 165%;
            height: 120%;
            background: #bfc1c3;
          }

          .certificate-arc-b {
            top: -8%;
            left: -90%;
            width: 150%;
            height: 116%;
            border: 14px solid #ffffff;
            background: #2587bb;
          }

          .certificate-arc-c {
            top: 5%;
            left: -62%;
            width: 140%;
            height: 92%;
            border: 10px solid #ffffff;
            background: #c6c7c9;
          }

          .certificate-arc-d {
            top: 8%;
            left: -35%;
            width: 135%;
            height: 82%;
            background: #ffffff;
          }

          .certificate-arc-e {
            bottom: -25%;
            left: -30%;
            width: 150%;
            height: 48%;
            border-radius: 0;
            background: #243746;
            transform: rotate(-25deg);
          }

          .certificate-arc-f {
            bottom: -20%;
            left: -40%;
            width: 152%;
            height: 30%;
            border-radius: 0;
            border-top: 8px solid #ffffff;
            background: #2587bb;
            transform: rotate(-25deg);
          }

          .certificate-body {
            position: relative;
            z-index: 10;
            display: flex;
            flex: 1;
            flex-direction: column;
            min-width: 0;
            padding: 2.25rem 2.5rem 1.75rem;
          }

          .certificate-brand {
            font-size: 1.35rem;
            font-weight: 900;
            color: #0f172a;
          }

          .certificate-main {
            display: flex;
            flex: 1;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
          }

          .certificate-kicker {
            font-size: 0.78rem;
            font-weight: 800;
            letter-spacing: 0.24em;
            text-transform: uppercase;
            color: #243746;
          }

          .certificate-lead {
            margin-top: 0.9rem;
            font-size: 0.95rem;
            color: #334155;
          }

          .certificate-name {
            margin-top: 0.9rem;
            font-size: 2.1rem;
            font-weight: 600;
            color: #0b1b2b;
          }

          .certificate-rule {
            margin-top: 0.8rem;
            width: 62%;
            height: 2px;
            background: #243746;
          }

          .certificate-for {
            margin-top: 1rem;
            font-size: 0.9rem;
            color: #334155;
          }

          .certificate-event {
            margin-top: 0.3rem;
            font-family: Georgia, 'Times New Roman', serif;
            font-size: 1.5rem;
            font-weight: 700;
            color: #0b1b2b;
          }

          .certificate-footer {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1.5rem;
            align-items: end;
            padding-top: 1rem;
          }

          .certificate-cell {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.35rem;
            min-width: 0;
          }

          .certificate-value {
            font-size: 0.95rem;
            font-weight: 700;
            color: #0b1b2b;
          }

          .certificate-sign {
            font-family: cursive;
            font-size: 1.4rem;
            font-weight: 600;
            color: #1d4ed8;
          }

          .certificate-line {
            width: 100%;
            border-top: 1.5px solid #243746;
          }

          .certificate-caption {
            font-size: 0.66rem;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #64748b;
          }

          .certificate-qr {
            display: flex;
          }

          .certificate-qr svg {
            width: 100%;
            max-width: 7.25rem;
            height: auto;
          }

          .certificate-meta {
            margin-top: 1.25rem;
            text-align: center;
            font-size: 0.8rem;
            color: #64748b;
          }

          .certificate-id {
            text-align: center;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 0.72rem;
            word-break: break-all;
            color: #1d4ed8;
          }

          @media (max-width: 640px) {
            .certificate-sheet {
              min-height: 520px;
            }

            .certificate-curve {
              flex-basis: 22%;
            }

            .certificate-body {
              padding: 1.1rem 1rem 0.85rem;
            }

            .certificate-brand {
              font-size: 0.95rem;
            }

            .certificate-kicker {
              font-size: 0.58rem;
              letter-spacing: 0.14em;
            }

            .certificate-lead {
              margin-top: 0.55rem;
              font-size: 0.7rem;
            }

            .certificate-name {
              margin-top: 0.55rem;
              font-size: 1.3rem;
            }

            .certificate-rule {
              margin-top: 0.5rem;
              width: 70%;
            }

            .certificate-for {
              margin-top: 0.6rem;
              font-size: 0.7rem;
            }

            .certificate-event {
              font-size: 1rem;
            }

            .certificate-footer {
              gap: 0.6rem;
              padding-top: 0.5rem;
            }

            .certificate-value {
              font-size: 0.75rem;
            }

            .certificate-sign {
              font-size: 1rem;
            }

            .certificate-caption {
              font-size: 0.5rem;
              letter-spacing: 0.08em;
            }

            .certificate-qr svg {
              max-width: 5rem;
            }

            .certificate-meta {
              margin-top: 0.75rem;
              font-size: 0.6rem;
            }

            .certificate-id {
              font-size: 0.58rem;
            }
          }
        `}
      </style>

    </div>
  );
};

export default Certificates;