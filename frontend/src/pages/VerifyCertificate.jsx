import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  Award,
  Building2,
  CalendarDays,
  CheckCircle,
  Hash,
  HelpCircle,
  ShieldCheck,
  Tag,
  User,
  XCircle
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LoadingScreen from "../components/LoadingScreen";

import { certificateAPI } from "../services/api";

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

const VerifyCertificate = () => {
  const { qrToken } = useParams();

  const [certificate, setCertificate] = useState(null);
  const [reason, setReason] = useState(
    "This certificate could not be verified."
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyCertificate = async () => {
      if (!qrToken) {
        setReason("This link is missing its verification code.");
        setLoading(false);

        return;
      }

      try {
        const response =
          await certificateAPI.verifyCertificate(qrToken);

        if (
          response.data?.verified === true &&
          response.data?.certificate
        ) {
          setCertificate(response.data.certificate);
        } else {
          setReason(
            response.data?.message ||
              "This certificate could not be verified."
          );
        }
      } catch (error) {
        // The API answers 400/404 for a bad or unknown token, so the
        // reader's reason lives on the error response.
        setReason(
          error.response?.data?.message ||
            "Verification failed. Please check the link and try again."
        );
      } finally {
        setLoading(false);
      }
    };

    verifyCertificate();
  }, [qrToken]);

  if (loading) {
    return <LoadingScreen message="Verifying certificate..." />;
  }

  const rows = certificate
    ? [
        {
          icon: <User size={15} />,
          label: "Recipient",
          value: certificate.studentName || "Student",
        },
        {
          icon: <Award size={15} />,
          label: "Event",
          value: certificate.eventName,
        },
        {
          icon: <Building2 size={15} />,
          label: "Issued by",
          value: certificate.clubName || "Campus Club",
        },
        {
          icon: <Tag size={15} />,
          label: "Category",
          value: certificate.category || "General",
        },
        {
          icon: <CalendarDays size={15} />,
          label: "Event date",
          value: formatDate(certificate.eventDate),
        },
        {
          icon: <ShieldCheck size={15} />,
          label: "Issued on",
          value: formatDate(certificate.issuedAt),
        },
      ]
    : [];

  return (
    <div className="app-page">
      <Navbar />

      <main className="page-section pt-8">
        <div className="page-container max-w-3xl">
          <div className="app-card">
            {certificate ? (
              <>
                <div className="flex flex-col items-center text-center">
                  <CheckCircle
                    size={68}
                    strokeWidth={1.6}
                    className="text-green-600"
                  />

                  <h1 className="mt-4 text-3xl font-black text-black">
                    Certificate Verified
                  </h1>

                  <p className="mt-2 font-semibold text-green-700">
                    This certificate is authentic and valid.
                  </p>
                </div>

                <div className="mt-7 flex items-center gap-3 rounded-2xl border border-slate-200 bg-green-100 px-5 py-4">
                  <ShieldCheck
                    size={24}
                    className="shrink-0 text-green-700"
                  />

                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-green-700">
                      Verification status
                    </p>

                    <p className="font-black text-black">
                      Confirmed by Campus Clubs
                    </p>
                  </div>
                </div>

                <div className="mt-7 grid gap-x-6 gap-y-5 sm:grid-cols-2">
                  {rows.map(({ icon, label, value }) => (
                    <div key={label} className="min-w-0">
                      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                        {icon}
                        {label}
                      </p>

                      <p className="mt-1.5 text-base font-bold text-black">
                        {value || "—"}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-7 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                  <Hash
                    size={18}
                    className="shrink-0 text-slate-400"
                  />

                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Certificate ID
                    </p>

                    <p className="mt-1 break-all font-mono font-bold text-black">
                      {certificate.certificateId}
                    </p>
                  </div>
                </div>

                <p className="mt-6 text-center text-xs text-slate-500">
                  This page shows only what is printed on the certificate.
                  It never reveals contact details or any other record.
                </p>
              </>
            ) : (
              <div className="py-6 text-center">
                <XCircle
                  size={68}
                  strokeWidth={1.6}
                  className="mx-auto text-red-600"
                />

                <h1 className="mt-4 text-3xl font-black text-black">
                  Not Verified
                </h1>

                <p className="mx-auto mt-3 max-w-xl text-slate-500">
                  {reason}
                </p>

                <div className="mx-auto mt-7 flex max-w-md items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-left">
                  <HelpCircle
                    size={18}
                    className="mt-0.5 shrink-0 text-slate-400"
                  />

                  <p className="text-sm text-slate-600">
                    Certificates are issued by the club that ran the event.
                    If you believe this one is genuine, ask the organiser to
                    re-issue it or check that the whole link was copied.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default VerifyCertificate;
