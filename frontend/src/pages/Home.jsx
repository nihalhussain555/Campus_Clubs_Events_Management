import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Award, Calendar, Sparkles, Users } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { clubAPI, eventAPI } from '../services/api';

const normalizeList = (payload, key) => payload?.[key] || (Array.isArray(payload) ? payload : []);

const Home = () => {
  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    const loadHighlights = async () => {
      try {
        const [clubsRes, eventsRes] = await Promise.all([
          clubAPI.getAllClubs(),
          eventAPI.getAllEvents(),
        ]);
        setClubs(normalizeList(clubsRes.data, 'clubs').slice(0, 3));
        setEvents(normalizeList(eventsRes.data, 'events').slice(0, 3));
      } catch (error) {
        setClubs([]);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadHighlights();
  }, []);

  const features = [
    {
      icon: Users,
      title: 'Find your circle',
      copy: 'Explore active student groups built around shared interests, skills, and causes.',
    },
    {
      icon: Calendar,
      title: 'Plan your week',
      copy: 'Browse upcoming workshops, meetups, competitions, and campus activities in one place.',
    },
    {
      icon: Award,
      title: 'Build momentum',
      copy: 'Track memberships and event registrations from a clean personal profile.',
    },
  ];

  return (
    <div className="app-page">
      <Navbar />

      <main>
        <section className="page-section pt-8">
          <div className="page-container">
            <div className="hero-shell">
              <div className="relative z-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                <div>
                  <span className="eyebrow">Campus experience hub</span>
                  <h1 className="display-title">Discover clubs, events, and people that move campus forward.</h1>
                  <p className="section-copy mt-6">
                    A premium student engagement workspace for finding communities, registering for events,
                    and managing the activities that shape college life.
                  </p>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <button onClick={() => navigate(token ? '/clubs' : '/register')} className="btn-primary">
                      {token ? 'Explore Clubs' : 'Get Started'}
                      <ArrowRight size={18} />
                    </button>
                    <button onClick={() => navigate('/events')} className="btn-secondary">
                      View Events
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <div className="rounded-[2rem] bg-black p-2 shadow-[0_30px_90px_rgba(0,0,0,0.22)]">
                    <div className="rounded-[1.5rem] bg-white p-5">
                      <div className="mb-5 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Today</p>
                          <h2 className="text-2xl font-black text-black">Campus Pulse</h2>
                        </div>
                        <span className="icon-tile">
                          <Sparkles size={20} />
                        </span>
                      </div>
                      <div className="grid gap-3">
                        {[
                          ['Active clubs', clubs.length || '25+'],
                          ['Upcoming events', events.length || '12+'],
                          ['Student community', '10K+'],
                        ].map(([label, value]) => (
                          <div key={label} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                            <span className="font-bold text-slate-600">{label}</span>
                            <span className="text-2xl font-black text-black">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="page-section">
          <div className="page-container">
            <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="eyebrow">Why it works</span>
                <h2 className="section-title">Designed for student momentum.</h2>
              </div>
              <p className="section-copy">Everything is organized for quick scanning, decisive actions, and clear next steps.</p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {features.map(({ icon: Icon, title, copy }) => (
                <article key={title} className="app-card app-card-hover">
                  <span className="icon-tile mb-5">
                    <Icon size={22} />
                  </span>
                  <h3 className="mb-2 text-xl font-black text-black">{title}</h3>
                  <p className="text-sm leading-6 text-slate-600">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {!loading && clubs.length > 0 && (
          <section className="page-section bg-white/70">
            <div className="page-container">
              <div className="mb-8 flex items-end justify-between gap-4">
                <div>
                  <span className="eyebrow">Featured clubs</span>
                  <h2 className="section-title">Communities to explore.</h2>
                </div>
                <button onClick={() => navigate('/clubs')} className="btn-secondary hidden sm:inline-flex">
                  See all
                </button>
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                {clubs.map((club) => (
                  <article key={club._id} className="app-card app-card-hover">
                    <div className="mb-5 flex h-32 items-center justify-center rounded-2xl bg-[#e8f5fb] text-5xl font-black text-[#145f82]">
                      {(club.clubName || club.name || 'C').charAt(0)}
                    </div>
                    <h3 className="mb-2 text-xl font-black text-black">{club.clubName || club.name}</h3>
                    <p className="mb-4 line-clamp-3 text-sm leading-6 text-slate-600">{club.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="chip">{club.members?.length || 0} members</span>
                      <button onClick={() => navigate('/clubs')} className="font-bold text-[#145f82] hover:text-black">
                        Learn more
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {!loading && events.length > 0 && (
          <section className="page-section">
            <div className="page-container">
              <div className="mb-8 flex items-end justify-between gap-4">
                <div>
                  <span className="eyebrow">Upcoming events</span>
                  <h2 className="section-title">What is next on campus.</h2>
                </div>
                <button onClick={() => navigate('/events')} className="btn-secondary hidden sm:inline-flex">
                  See all
                </button>
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                {events.map((event) => (
                  <article key={event._id} className="app-card app-card-hover">
                    <span className="icon-tile mb-5">
                      <Calendar size={22} />
                    </span>
                    <h3 className="mb-2 text-xl font-black text-black">{event.title || event.name}</h3>
                    <p className="mb-4 line-clamp-3 text-sm leading-6 text-slate-600">{event.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="chip">{new Date(event.date).toLocaleDateString()}</span>
                      <span className="chip">{event.registeredStudents?.length || 0} registered</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="page-section">
          <div className="page-container">
            <div className="rounded-[2rem] bg-black p-8 text-white sm:p-12">
              <h2 className="max-w-2xl text-3xl font-black leading-tight sm:text-4xl">Ready to build your campus calendar?</h2>
              <p className="mt-4 max-w-2xl text-white/70">
                Join clubs, register for events, and keep your student life organized from one calm dashboard.
              </p>
              {!token && (
                <button onClick={() => navigate('/register')} className="mt-7 btn bg-white text-black hover:bg-[#e8f5fb]">
                  Create account
                </button>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
