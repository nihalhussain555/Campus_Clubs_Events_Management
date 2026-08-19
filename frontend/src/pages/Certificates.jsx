
import React, { useEffect, useState } from "react";

import {
  Award,
  Calendar,
  MapPin,
  QrCode,
  ExternalLink,
  Download,
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
  const [downloading, setDownloading] = useState(null);

  const fetchCertificates = async () => {
    try {
      const response =
        await certificateAPI.getMyCertificates();

      setCertificates(response.data.certificates || []);
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

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;

      link.download =
        `${certificate.certificateId}.pdf`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);

      setToast({
        message: "Certificate downloaded successfully",
        type: "success",
      });
    } catch (error) {
      setToast({
        message: "Failed to download certificate",
        type: "error",
      });
    } finally {
      setDownloading(null);
    }
  };

  if (loading)
    return (
      <LoadingScreen message="Loading certificates..." />
    );

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
                Attend registered events to receive certificates.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {certificates.map((certificate) => {
                const verifyUrl =
                  certificate.verificationUrl ||
                  `${window.location.origin}/verify-certificate/${certificate.qrToken}`;

                return (
                  <article
                    key={certificate._id}
                    className="app-card"
                  >
                    <div className="flex items-center gap-2">
                      <Award
                        className="text-[#145f82]"
                        size={24}
                      />

                      <h2 className="text-xl font-black">
                        Certificate
                      </h2>
                    </div>

                    <h3 className="mt-4 text-2xl font-black">
                      {certificate.eventName}
                    </h3>

                    <div className="mt-5 space-y-3 text-sm text-slate-600">
                      <div className="flex gap-2">
                        <Calendar size={16} />

                        {new Date(
                          certificate.eventDate
                        ).toLocaleDateString("en-IN")}
                      </div>

                      <div className="flex gap-2">
                        <MapPin size={16} />

                        {certificate.location}
                      </div>
                    </div>

                    <div className="mt-5 rounded-xl border p-4">
                      <p className="text-xs font-bold text-slate-500">
                        Certificate ID
                      </p>

                      <p className="font-mono font-bold break-all">
                        {certificate.certificateId}
                      </p>
                    </div>

                    <div className="mt-6 flex flex-col items-center">
                      <div className="bg-white p-4 rounded-xl border">
                        <QRCodeSVG
                          value={verifyUrl}
                          size={170}
                          level="H"
                        />
                      </div>

                      <p className="mt-2 text-xs text-slate-500 flex gap-1 items-center">
                        <QrCode size={14} />
                        Scan QR to verify
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-6">
                      <a
                        href={verifyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-primary flex justify-center items-center gap-2"
                      >
                        <ExternalLink size={16} />
                        Verify
                      </a>

                      <button
                        onClick={() =>
                          downloadPDF(certificate)
                        }
                        disabled={
                          downloading ===
                          certificate.certificateId
                        }
                        className="btn-secondary flex justify-center items-center gap-2"
                      >
                        <Download size={16} />

                        {downloading ===
                        certificate.certificateId
                          ? "Downloading"
                          : "Download"}
                      </button>
                    </div>

                    <p className="mt-5 text-sm text-slate-500">
                      Issued:{" "}
                      {new Date(
                        certificate.issuedAt
                      ).toLocaleDateString("en-IN")}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Certificates;