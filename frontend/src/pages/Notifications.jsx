import React, { useEffect, useState } from 'react';
import { Bell, Calendar, Users } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import { clubAPI, eventAPI } from '../services/api';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const [eventsResponse, clubsResponse] = await Promise.all([
          eventAPI.getAllEvents(),
          clubAPI.getAllClubs(),
        ]);

        const events = eventsResponse.data.events || [];
        const clubs = clubsResponse.data.clubs || [];

        const now = new Date();
        const upcomingEvents = events
          .filter(e => new Date(e.date) > now)
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .map(e => ({
            id: `event-${e._id}`,
            type: 'event',
            title: `Upcoming Event: ${e.title}`,
            message: `Don't miss ${e.title} on ${new Date(e.date).toLocaleDateString()}. Location: ${e.location || 'TBA'}`,
            date: new Date(e.date),
            icon: Calendar
          }));

        // Sort clubs by creation date if possible, otherwise just take the last 5
        const newClubs = clubs
          .slice(-5)
          .reverse()
          .map(c => ({
            id: `club-${c._id}`,
            type: 'club',
            title: `New Club Launched: ${c.clubName}`,
            message: c.description || 'Check out this new club and join today!',
            date: now, // using current date since clubs might not have a creation date
            icon: Users
          }));

        const allNotifications = [...upcomingEvents, ...newClubs];
        setNotifications(allNotifications);
      } catch (error) {
        setToast({ message: 'Error loading notifications', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  if (loading) return <LoadingSpinner message="Loading notifications..." />;

  return (
    <div className="app-page">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <main>
        <section className="page-section pt-8">
          <div className="page-container">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="eyebrow flex items-center gap-2"><Bell size={16} /> Updates</span>
                <h1 className="display-title text-4xl sm:text-5xl">Notifications</h1>
                <p className="section-copy mt-4">Stay updated on upcoming events and newly launched clubs.</p>
              </div>
            </div>

            {notifications.length > 0 ? (
              <div className="grid gap-4 max-w-4xl">
                {notifications.map(notif => {
                  const Icon = notif.icon;
                  return (
                    <article key={notif.id} className="app-card flex gap-4 items-start">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eef8fc] text-[#145f82]">
                        <Icon size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-black">{notif.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{notif.message}</p>
                        {notif.type === 'event' && (
                          <span className="mt-2 inline-block text-xs font-bold text-slate-500">
                            {notif.date.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="app-card text-center">
                <p className="text-lg font-bold text-slate-500">No notifications at the moment.</p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Notifications;
