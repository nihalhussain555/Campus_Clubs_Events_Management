
import React, { useEffect, useState } from "react";

import {
  CheckCircle,
  XCircle,
  Award,
  Calendar,
  MapPin,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LoadingScreen from "../components/LoadingScreen";

import { certificateAPI } from "../services/api";

const VerifyCertificate = () => {
  const [certificate, setCertificate] = useState(null);
  const [valid, setValid] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verify = async () => {
      try {
        const token =
          window.location.pathname.split("/").pop();

        const response =
          await certificateAPI.verifyCertificate(token);

        setCertificate(response.data.certificate);

        setValid(response.data.verified === true);
      } catch {
        setValid(false);
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, []);

  if (loading)
    return (
      <LoadingScreen message="Verifying certificate..." />
    );

  return (
    <div className="app-page">
      <Navbar />

      <main className="page-section pt-8">
        <div className="page-container max-w-3xl">
          <div className="app-card text-center">
            {valid ? (
              <>
                <CheckCircle
                  size={70}
                  className="mx-auto text-green-600"
                />

                <h1 className="mt-5 text-3xl font-black">
                  Certificate Verified
                </h1>

                <p className="mt-2 text-green-600 font-semibold">
                  This certificate is authentic and valid.
                </p>

                <div className="mt-8 text-left space-y-5">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">
                      Certificate ID
                    </p>

                    <p className="font-mono font-bold">
                      {certificate.certificateId}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">
                      Recipient
                    </p>

                    <p className="font-bold">
                      {certificate.studentName}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">
                      Event
                    </p>

                    <p className="text-xl font-black">
                      {certificate.eventName}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar size={18} />

                    {new Date(
                      certificate.eventDate
                    ).toLocaleDateString("en-IN")}
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin size={18} />

                    {certificate.location}
                  </div>

                  <div className="flex items-center gap-2">
                    <Award size={18} />

                    Issued:{" "}
                    {new Date(
                      certificate.issuedAt
                    ).toLocaleDateString("en-IN")}
                  </div>
                </div>
              </>
            ) : (
              <>
                <XCircle
                  size={70}
                  className="mx-auto text-red-600"
                />

                <h1 className="mt-5 text-3xl font-black">
                  Invalid Certificate
                </h1>

                <p className="mt-2 text-slate-500">
                  This certificate does not exist or cannot be verified.
                </p>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default VerifyCertificate;