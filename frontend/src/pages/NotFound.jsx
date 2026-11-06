import React from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import Navbar from '../components/Navbar';

const NotFound = () => (
  <>
    <Navbar />

    <div className="app-page">
      <main className="page-section">
        <div className="page-container">
          <div className="app-card mx-auto max-w-xl text-center">
            <div className="icon-tile mx-auto mb-4 h-14 w-14">
              <Compass size={24} />
            </div>

            <p className="eyebrow">Error 404</p>

            <h1 className="display-title text-4xl sm:text-5xl">
              Page not found
            </h1>

            <p className="section-copy mx-auto mt-4">
              The page you were looking for has been moved, renamed, or never
              existed.
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link to="/" className="btn-primary">
                Back to home
              </Link>

              <Link to="/events" className="btn-secondary">
                Browse events
              </Link>

              <Link to="/clubs" className="btn-secondary">
                Browse clubs
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  </>
);

export default NotFound;
