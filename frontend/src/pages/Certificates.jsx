import React from "react";
import Navbar from "../components/Navbar";

const Certificates = () => {
  return (
    <div className="app-page">
      <Navbar />

      <main className="page-section">
        <div className="page-container">
          <h1 className="display-title">My Certificates</h1>

          <div className="app-card mt-6 text-center py-16">
            <h2 className="text-2xl font-bold">🏆 No Certificates Yet</h2>

            <p className="mt-4 text-slate-500">
              Participate in events and successfully complete them to earn participation certificates.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Certificates;