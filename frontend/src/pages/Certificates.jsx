import React, { useEffect, useState } from "react";

import {
  Award,
  ExternalLink,
  Download,
  X,
  Calendar,
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

  const getVerifyUrl = (certificate) => {
    return (
      certificate.verificationUrl ||
      `${window.location.origin}/verify-certificate/${certificate.qrToken}`
    );
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
              Certificates earned from campus events.
            </p>

          </div>


          {/* =================================================
              EMPTY STATE
          ================================================= */}

          {certificates.length === 0 ? (

            <div className="app-card text-center">

              <Award
                size={48}
                className="mx-auto mb-4 text-slate-300"
              />

              <h2 className="text-xl font-black">
                No certificates yet
              </h2>

              <p className="mt-2 text-slate-500">
                Attend registered events to receive
                certificates.
              </p>

            </div>

          ) : (

            <div className="grid gap-6 lg:grid-cols-2">

              {certificates.map((certificate) => {

                const verifyUrl =
                  getVerifyUrl(certificate);

                return (

                  <article
                    key={certificate._id}
                    className="app-card"
                  >

                    {/* Certificate heading */}

                    <div className="flex items-center gap-2">

                      <Award
                        className="text-[#145f82]"
                        size={24}
                      />

                      <h2 className="text-xl font-black">
                        Certificate
                      </h2>

                    </div>


                    {/* Event name */}

                    <h3 className="mt-4 text-2xl font-black">
                      {certificate.eventName}
                    </h3>


                    {/* Certificate ID */}

                    <div className="mt-5 rounded-xl border p-4">

                      <p className="text-xs font-bold text-slate-500">
                        Certificate ID
                      </p>

                      <p className="font-mono font-bold break-all">
                        {certificate.certificateId}
                      </p>

                    </div>


                    {/* Buttons */}

                    <div className="grid grid-cols-2 gap-3 mt-6">

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedCertificate(
                            certificate
                          )
                        }
                        className="btn-primary flex justify-center items-center gap-2"
                      >

                        <ExternalLink size={16} />

                        View Certificate

                      </button>


                      <a
                        href={verifyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary flex justify-center items-center gap-2"
                      >

                        <ExternalLink size={16} />

                        Verify

                      </a>

                    </div>


                    {/* Issued date */}

                    <p className="mt-5 text-sm text-slate-500">

                      Issued:{" "}

                      {formatDate(
                        certificate.issuedAt
                      )}

                    </p>

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

            <div
              className="relative mx-auto w-full overflow-hidden border border-slate-300 bg-white shadow-lg"
              style={{
                aspectRatio: "1.414 / 1",
                minHeight: "520px",
              }}
            >

              {/* =================================================
                  LEFT CURVED DESIGN
              ================================================= */}

              <div
                className="absolute left-0 top-0 h-full w-[40%] overflow-hidden"
              >

                {/* Gray background curve */}

                <div
                  className="absolute -left-[45%] -top-[10%] h-[120%] w-[120%] rounded-full"
                  style={{
                    background:
                      "#bfc1c3",
                  }}
                />


                {/* Blue curve */}

                <div
                  className="absolute -left-[58%] -top-[8%] h-[116%] w-[105%] rounded-full border-[18px] border-white"
                  style={{
                    background:
                      "#2587bb",
                  }}
                />


                {/* Gray inner curve */}

                <div
                  className="absolute -left-[45%] top-[5%] h-[92%] w-[95%] rounded-full border-[12px] border-white"
                  style={{
                    background:
                      "#c6c7c9",
                  }}
                />


                {/* White inner curve */}

                <div
                  className="absolute -left-[28%] top-[8%] h-[82%] w-[90%] rounded-full"
                  style={{
                    background:
                      "#ffffff",
                  }}
                />


                {/* Bottom navy shape */}

                <div
                  className="absolute -bottom-[25%] -left-[20%] h-[48%] w-[100%] rotate-[-25deg]"
                  style={{
                    background:
                      "#243746",
                  }}
                />


                {/* Bottom blue curve */}

                <div
                  className="absolute -bottom-[20%] -left-[30%] h-[30%] w-[105%] rotate-[-25deg] border-t-[10px] border-white"
                  style={{
                    background:
                      "#2587bb",
                  }}
                />

              </div>


              {/* =================================================
                  CERTIFICATE CONTENT
              ================================================= */}

              <div className="relative z-10 flex h-full min-h-[520px] flex-col">

                {/* Company */}

                <div className="px-8 pt-7 sm:px-12">

                  <h2 className="text-xl sm:text-2xl font-black text-black">
                    Campus Clubs
                  </h2>

                </div>


                {/* Main content */}

                <div className="flex flex-1 flex-col items-center justify-center px-8 sm:px-16">

                  {/* Presented text */}

                  <p
                    className="text-center text-sm sm:text-lg font-bold tracking-[0.18em] text-black"
                    style={{
                      marginLeft: "15%",
                    }}
                  >
                    PARTICIPATION CERTIFICATE
                  </p>

                  <p
                    className="mt-4 text-center text-base sm:text-2xl font-semibold text-black"
                    style={{
                      marginLeft: "15%",
                    }}
                  >
                    THIS CERTIFICATE IS PROUDLY PRESENTED TO:
                  </p>


                  {/* Student name */}

                  <h1
                    className="mt-5 text-center text-2xl sm:text-4xl font-normal text-black"
                    style={{
                      marginLeft: "15%",
                    }}
                  >
                    {getStudentName(
                      selectedCertificate
                    )}
                  </h1>


                  {/* Divider */}

                  <div
                    className="mt-4 h-[3px] bg-black"
                    style={{
                      width: "70%",
                      marginLeft: "15%",
                    }}
                  />


                  {/* Event */}

                  <h2
                    className="mt-5 text-center text-lg sm:text-2xl font-serif font-bold text-black"
                    style={{
                      marginLeft: "15%",
                    }}
                  >
                    {selectedCertificate.eventName}
                  </h2>


                  {/* QR + right information */}

                  <div
                    className="mt-7 flex w-full items-center justify-center gap-10 sm:gap-20"
                    style={{
                      marginLeft: "15%",
                    }}
                  >

                    {/* QR */}

                    <div className="flex flex-col items-center">

                      <QRCodeSVG
                        value={getVerifyUrl(
                          selectedCertificate
                        )}
                        size={145}
                        level="H"
                        includeMargin={false}
                      />

                    </div>


                    {/* Signature */}

                    <div className="flex flex-col items-center">

                      <div
                        className="text-xl sm:text-3xl font-semibold italic"
                        style={{
                          fontFamily:
                            "cursive",
                        }}
                      >
                        Nihal Hussain
                      </div>

                      <div className="mt-2 w-48 border-t border-black" />

                      <p className="mt-2 text-sm sm:text-base font-semibold">
                        Authorized Signature
                      </p>

                    </div>

                  </div>


                  {/* Bottom details */}

                  <div
                    className="mt-7 flex w-full items-end justify-center gap-10 sm:gap-20"
                    style={{
                      marginLeft: "15%",
                    }}
                  >

                    {/* Date */}

                    <div className="text-center">

                      <div className="w-40 sm:w-52 border-t border-black" />

                      <p className="mt-2 text-sm sm:text-base font-semibold">
                        {formatDate(
                          selectedCertificate.eventDate ||
                          selectedCertificate.issuedAt
                        )}
                      </p>

                    </div>


                    {/* Certificate ID */}

                    <div className="max-w-[240px] text-center">

                      <p className="text-xs sm:text-sm font-mono break-all text-blue-700">
                        {selectedCertificate.certificateId}
                      </p>

                    </div>

                  </div>

                </div>

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

    </div>
  );
};

export default Certificates;