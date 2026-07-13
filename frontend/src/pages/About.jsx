import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Globe, Users, Zap } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const About = () => {
  const navigate = useNavigate();
  
  const handleGetStarted = () => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/');
    } else {
      navigate('/register');
    }
  };

  const pillars = [
    ['Community building', 'Connect students with peers who share interests, goals, and creative energy.', Users],
    ['Skill development', 'Turn club participation into practical leadership, communication, and teamwork growth.', Zap],
    ['Campus network', 'Make events, clubs, and student opportunities easier to discover across campus.', Globe],
  ];

  const features = [
    'Club discovery with clear membership actions',
    'Event registration and capacity tracking',
    'Student profile for memberships and events',
    'Admin tools for clubs, events, and users',
  ];

  return (
    <div className="app-page">
      <Navbar />

      <main>
        <section className="page-section pt-8">
          <div className="page-container">
            <div className="hero-shell">
              <span className="eyebrow">About Campus Clubs</span>
              <h1 className="display-title">A cleaner way to run student communities.</h1>
              <p className="section-copy mt-6">
                Campus Clubs brings discovery, registration, and administration into one focused experience
                for students and campus organizers.
              </p>
            </div>
          </div>
        </section>

        <section className="page-section">
          <div className="page-container grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <span className="eyebrow">Our mission</span>
              <h2 className="section-title">Help every student find the right place to belong.</h2>
              <p className="section-copy mt-5">
                Extracurricular life shapes confidence, friendships, and future opportunities. This platform
                makes it simple to find clubs, understand what is happening, and take action without friction.
              </p>
            </div>
            <div className="grid gap-4">
              {pillars.map(([title, copy, Icon]) => (
                <article key={title} className="app-card app-card-hover flex gap-4">
                  <span className="icon-tile">
                    <Icon size={22} />
                  </span>
                  <div>
                    <h3 className="font-black text-black">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{copy}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="page-section bg-white/70">
          <div className="page-container">
            <div className="mb-10 text-center">
              <span className="eyebrow">Platform features</span>
              <h2 className="section-title">Built for the daily flow of campus life.</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {features.map((feature) => (
                <div key={feature} className="app-card flex items-start gap-4">
                  <CheckCircle className="mt-1 shrink-0 text-[#145f82]" size={24} />
                  <p className="font-bold text-slate-800">{feature}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="page-section">
          <div className="page-container">
            <div className="grid gap-4 text-center sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['500+', 'Active clubs'],
                ['10K+', 'Student members'],
                ['2K+', 'Events hosted'],
                ['50K+', 'Registrations'],
              ].map(([value, label]) => (
                <div key={label} className="metric-card">
                  <p className="text-4xl font-black text-[#145f82]">{value}</p>
                  <p className="mt-2 font-bold text-slate-600">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="page-section pt-0">
          <div className="page-container">
            <div className="rounded-[2rem] bg-black p-8 text-center text-white sm:p-12">
              <h2 className="text-3xl font-black sm:text-4xl">Join the community today.</h2>
              <p className="mx-auto mt-4 max-w-2xl text-white/70">
                Start exploring clubs, attending events, and connecting with students who share your interests.
              </p>
              <button onClick={handleGetStarted} className="mt-7 btn bg-white text-black hover:bg-[#e8f5fb]">
                Get started
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;
