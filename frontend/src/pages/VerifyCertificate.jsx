import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  ShieldX,
  Award,
  Calendar,
  MapPin
} from 'lucide-react';

import { certificateAPI } from '../services/api';

const VerifyCertificate = () => {

  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {

    const verify = async () => {

      try {

        const pathParts =
          window.location.pathname.split('/');

        const certificateId =
          pathParts[pathParts.length - 1];

        if (!certificateId) {
          setError('Certificate ID is missing.');
          return;
        }

        const response =
          await certificateAPI.verifyCertificate(
            certificateId
          );

        setCertificate(
          response.data.certificate
        );

      } catch (err) {

        setError(
          err.response?.data?.message ||
          'Invalid or unavailable certificate.'
        );

      } finally {

        setLoading(false);

      }
    };

    verify();

  }, []);


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
      <div className="min-h-screen flex items-center justify-center">

        <p className="font-bold text-slate-600">
          Verifying certificate...
        </p>

      </div>
    );

  }


  if (error) {

    return (

      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">

        <div className="app-card max-w-lg w-full text-center">

          <ShieldX
            size={64}
            className="mx-auto text-red-500 mb-5"
          />

          <h1 className="text-3xl font-black">
            Invalid Certificate
          </h1>

          <p className="mt-3 text-slate-600">
            {error}
          </p>

        </div>

      </div>

    );

  }


  const student = certificate.student || {};
  const event = certificate.event || {};


  return (

    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">

      <div className="app-card max-w-2xl w-full">

        <div className="text-center">

          <ShieldCheck
            size={64}
            className="mx-auto text-green-600 mb-4"
          />

          <p className="text-sm font-bold uppercase tracking-wider text-green-600">
            Certificate Verified
          </p>

          <h1 className="text-4xl font-black mt-2">
            Valid Certificate
          </h1>

          <p className="mt-3 text-slate-500">
            This certificate has been successfully
            verified against the event management system.
          </p>

        </div>


        <div className="mt-8 border-t pt-6 space-y-5">

          <div className="text-center">

            <Award
              size={36}
              className="mx-auto text-[#145f82]"
            />

            <h2 className="text-2xl font-black mt-2">
              {student.name || 'Student'}
            </h2>

          </div>


          <div className="rounded-xl bg-slate-50 p-5">

            <p className="text-xs font-bold uppercase text-slate-500">
              Event
            </p>

            <p className="mt-1 text-lg font-bold">
              {event.title || 'N/A'}
            </p>

          </div>


          <div className="grid gap-4 sm:grid-cols-2">

            <div className="rounded-xl bg-slate-50 p-4">

              <div className="flex items-center gap-2">

                <Calendar
                  size={18}
                  className="text-[#145f82]"
                />

                <span className="font-bold">
                  Event Date
                </span>

              </div>

              <p className="mt-2 text-sm text-slate-600">
                {formatDate(event.date)}
              </p>

            </div>


            <div className="rounded-xl bg-slate-50 p-4">

              <div className="flex items-center gap-2">

                <MapPin
                  size={18}
                  className="text-[#145f82]"
                />

                <span className="font-bold">
                  Location
                </span>

              </div>

              <p className="mt-2 text-sm text-slate-600">
                {event.location || 'TBA'}
              </p>

            </div>

          </div>


          <div className="rounded-xl bg-[#eef8fc] p-5">

            <p className="text-xs font-bold uppercase text-slate-500">
              Certificate ID
            </p>

            <p className="mt-2 font-mono font-black text-[#145f82] break-all">
              {certificate.certificateId}
            </p>

          </div>


          <div className="text-center text-sm text-slate-500">

            Issued on{' '}

            <strong>
              {formatDate(certificate.issuedAt)}
            </strong>

          </div>

        </div>

      </div>

    </div>

  );
};

export default VerifyCertificate;