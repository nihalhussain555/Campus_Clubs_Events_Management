import React, { useEffect, useState } from 'react';
import {
  Award,
  Calendar,
  MapPin,
  QrCode,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LoadingScreen from '../components/LoadingScreen';
import Toast from '../components/Toast';

import { certificateAPI } from '../services/api';
import { QRCodeSVG } from 'qrcode.react';

const Certificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const response =
        await certificateAPI.getMyCertificates();

      setCertificates(
        response.data.certificates || []
      );
    } catch (error) {
      console.error(error);

      setToast({
        message: 'Unable to load certificates',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';

    return new Date(date).toLocaleDateString(
      'en-US',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }
    );
  };

  if (loading) {
    return (
      <LoadingScreen message="Loading certificates..." />
    );
  }

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

      <main>
        <section className="page-section pt-8">

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
                View and verify certificates earned
                through event participation.
              </p>

            </div>


            {certificates.length === 0 ? (

              <div className="app-card text-center py-12">

                <Award
                  size={48}
                  className="mx-auto mb-4 text-slate-300"
                />

                <h2 className="text-xl font-bold">
                  No certificates yet
                </h2>

                <p className="mt-2 text-slate-500">
                  Attend registered events to earn
                  certificates.
                </p>

              </div>

            ) : (

              <div className="grid gap-6 lg:grid-cols-2">

                {certificates.map((certificate) => {

                  const event = certificate.event || {};

                  return (

                    <article
                      key={certificate._id}
                      className="app-card app-card-hover"
                    >

                      <div className="flex items-start justify-between gap-4">

                        <div className="flex items-center gap-3">

                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eef8fc] text-[#145f82]">

                            <Award size={25} />

                          </div>

                          <div>

                            <h2 className="text-xl font-black text-black">
                              {event.title || 'Event Certificate'}
                            </h2>

                            <div className="mt-1 flex items-center gap-2 text-sm text-green-600 font-semibold">

                              <ShieldCheck size={16} />

                              Verified Certificate

                            </div>

                          </div>

                        </div>

                      </div>


                      <div className="mt-6 space-y-3">

                        <div className="flex items-center gap-3 text-sm text-slate-600">

                          <Calendar
                            size={17}
                            className="text-[#145f82]"
                          />

                          {formatDate(event.date)}

                        </div>


                        <div className="flex items-center gap-3 text-sm text-slate-600">

                          <MapPin
                            size={17}
                            className="text-[#145f82]"
                          />

                          {event.location || 'TBA'}

                        </div>


                        <div className="rounded-lg bg-slate-50 p-4">

                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            Certificate ID
                          </p>

                          <p className="mt-1 font-mono font-bold text-[#145f82] break-all">
                            {certificate.certificateId}
                          </p>

                        </div>

                      </div>


                      <div className="mt-6 flex flex-wrap gap-3">

                        <a
                          href={certificate.verificationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary flex items-center gap-2"
                        >

  <div className="flex justify-center my-5">
    <QRCodeSVG
      value={certificate.verificationUrl}
      size={140}
    />
  </div>

                          <QrCode size={17} />

                          Verify Certificate

                        </a>


                        <a
                          href={certificate.verificationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary flex items-center gap-2"
                        >

                          <ExternalLink size={17} />

                          Open

                        </a>

                      </div>


                      <p className="mt-4 text-xs text-slate-500">

                        Issued on{' '}

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

        </section>
      </main>

      <Footer />

    </div>
  );
};

export default Certificates;