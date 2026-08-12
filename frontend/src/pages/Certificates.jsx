import React, { useState } from "react";
import { ArrowLeft, Award, Download, Eye, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import LoadingScreen from "../components/LoadingScreen";

const Certificates = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Certificates will come from your backend/API later
  const certificates = [];

  const filteredCertificates = certificates.filter((certificate) =>
    `${certificate.title} ${certificate.event}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <LoadingScreen message="Loading certificates..." />;
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-slate-50 pt-32 pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Back Button */}
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-3.5 py-2 mb-6 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 text-sm font-medium shadow-sm"
          >
            <ArrowLeft size={17} />
            Back
          </button>

          {/* Page Header */}
          <div className="mb-8">

            <div className="flex items-center gap-4">

              {/* Certificate Icon */}
              <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shadow-sm">
                <Award
                  size={25}
                  strokeWidth={1.8}
                  className="text-white"
                />
              </div>

              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  My Certificates
                </h1>

                <p className="mt-1 text-sm sm:text-base text-slate-500">
                  View and manage the certificates you have earned.
                </p>
              </div>

            </div>

          </div>

          {/* Search */}
          <div className="mb-6">

            <div className="relative max-w-md">

              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                placeholder="Search certificates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition"
              />

            </div>

          </div>

          {/* Certificates */}
          {filteredCertificates.length > 0 ? (

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {filteredCertificates.map((certificate) => (

                <div
                  key={certificate.id}
                  className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200"
                >

                  <div className="flex items-start justify-between gap-4">

                    <div className="flex items-center gap-3">

                      <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center">
                        <Award
                          size={22}
                          className="text-slate-700"
                        />
                      </div>

                      <div>
                        <h2 className="font-bold text-slate-900">
                          {certificate.title}
                        </h2>

                        <p className="text-sm text-slate-500 mt-1">
                          {certificate.event}
                        </p>
                      </div>

                    </div>

                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100">

                    <p className="text-xs text-slate-400">
                      Issued on
                    </p>

                    <p className="text-sm font-semibold text-slate-700 mt-1">
                      {certificate.date}
                    </p>

                  </div>

                  <div className="flex gap-2 mt-5">

                    <button
                      type="button"
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition"
                    >
                      <Eye size={16} />
                      View
                    </button>

                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
                    >
                      <Download size={16} />
                      Download
                    </button>

                  </div>

                </div>

              ))}

            </div>

          ) : (

            /* Empty State */
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">

              <div className="flex flex-col items-center justify-center text-center px-6 py-16 sm:py-20">

                {/* Graduation Cap */}
                <div className="w-20 h-20 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg">

                  <Award
                    size={40}
                    strokeWidth={1.5}
                    className="text-white"
                  />

                </div>

                <h2 className="mt-6 text-2xl font-bold text-slate-900">
                  No Certificates Yet
                </h2>

                <p className="mt-3 max-w-md text-sm sm:text-base leading-relaxed text-slate-500">
                  Participate in events and successfully complete them to earn
                  participation certificates.
                </p>

                <button
                  type="button"
                  onClick={() => navigate("/events")}
                  className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all shadow-sm"
                >
                  Explore Events
                </button>

              </div>

            </div>

          )}

        </div>
      </main>
    </>
  );
};

export default Certificates;