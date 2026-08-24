import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  CheckCircle,
  XCircle,
  Award,
  Calendar,
  ShieldCheck,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LoadingScreen from "../components/LoadingScreen";

import { certificateAPI } from "../services/api";

const VerifyCertificate = () => {
  const { qrToken } = useParams();

  const [certificate, setCertificate] = useState(null);
  const [valid, setValid] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyCertificate = async () => {
      if (!qrToken) {
        setValid(false);
        setLoading(false);
        return;
      }

      try {
        console.log("QR Token:", qrToken);

        const response = await certificateAPI.verifyCertificate(qrToken);

        console.log("Verification response:", response.data);

        if (
          response.data?.verified === true &&
          response.data?.certificate
        ) {
          setCertificate(response.data.certificate);
          setValid(true);
        } else {
          setCertificate(null);
          setValid(false);
        }
      } catch (error) {
        console.error(
          "Certificate verification failed:",
          error.response?.data || error.message
        );

        setCertificate(null);
        setValid(false);
      } finally {
        setLoading(false);
      }
    };

    verifyCertificate();
  }, [qrToken]);

  if (loading) {
    return (
      <LoadingScreen message="Verifying certificate..." />
    );
  }

  return (
    <div className="app-page">
      <Navbar />

      <main className="page-section pt-8">
        <div className="page-container max-w-3xl">
          <div className="app-card">

            {valid && certificate ? (
              <>
                <div className="text-center">

                  <CheckCircle
                    size={72}
                    strokeWidth={1.8}
                    className="mx-auto text-green-600"
                  />

                  <h1 className="mt-5 text-3xl font-black text-black">
                    Certificate Verified
                  </h1>

                  <p className="mt-2 font-semibold text-green-600">
                    This certificate is authentic and valid.
                  </p>

                </div>

                <div className="mt-8 space-y-5">

                  <div className="rounded-2xl border border-green-200 bg-green-50 p-5">

                    <div className="flex items-center gap-3">

                      <ShieldCheck
                        size={25}
                        className="text-green-600"
                      />

                      <div>

                        <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                          Verification Status
                        </p>

                        <p className="font-black text-green-800">
                          Verified by Campus Clubs
                        </p>

                      </div>

                    </div>

                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Certificate ID
                    </p>

                    <p className="mt-1 break-all font-mono font-bold text-black">
                      {certificate.certificateId}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Recipient
                    </p>

                    <p className="mt-1 text-lg font-black text-black">
                      {certificate.studentName || "Student"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Certificate Type
                    </p>

                    <p className="mt-1 font-bold text-black">
                      Participation Certificate
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Event
                    </p>

                    <p className="mt-1 text-xl font-black text-black">
                      {certificate.eventName}
                    </p>
                  </div>

                  {certificate.eventDate && (
                    <div className="flex items-center gap-3">

                      <Calendar
                        size={19}
                        className="text-[#145f82]"
                      />

                      <div>

                        <p className="text-xs font-bold uppercase text-slate-500">
                          Event Date
                        </p>

                        <p className="font-semibold">
                          {new Date(
                            certificate.eventDate
                          ).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>

                      </div>

                    </div>
                  )}

                  <div className="flex items-center gap-3">

                    <Award
                      size={19}
                      className="text-[#145f82]"
                    />

                    <div>

                      <p className="text-xs font-bold uppercase text-slate-500">
                        Issued On
                      </p>

                      <p className="font-semibold">
                        {certificate.issuedAt
                          ? new Date(
                              certificate.issuedAt
                            ).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })
                          : "N/A"}
                      </p>

                    </div>

                  </div>

                </div>
              </>
            ) : (
              <div className="py-8 text-center">

                <XCircle
                  size={72}
                  strokeWidth={1.8}
                  className="mx-auto text-red-600"
                />

                <h1 className="mt-5 text-3xl font-black text-black">
                  Invalid Certificate
                </h1>

                <p className="mx-auto mt-3 max-w-xl text-slate-500">
                  This certificate does not exist,
                  has an invalid verification token,
                  or cannot be verified.
                </p>

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