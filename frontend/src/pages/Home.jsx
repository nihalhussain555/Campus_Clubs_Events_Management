import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Users, Calendar, Award, ArrowRight } from 'lucide-react';
import { clubAPI, eventAPI } from '../services/api';

const Home = () => {
  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFeaturedClubs();
    fetchUpcomingEvents();
  }, []);

  const fetchFeaturedClubs = async () => {
    try {
      const response = await clubAPI.getAllClubs();
      setClubs(response.data.slice(0, 3)); // Show 3 featured clubs
      setLoadingClubs(false);
    } catch (error) {
      console.error('Error fetching clubs:', error);
      setLoadingClubs(false);
    }
  };

  const fetchUpcomingEvents = async () => {
    try {
      const response = await eventAPI.getAllEvents();
      setEvents(response.data.slice(0, 3)); // Show 3 upcoming events
      setLoadingEvents(false);
    } catch (error) {
      console.error('Error fetching events:', error);
      setLoadingEvents(false);
    }
  };

  const token = localStorage.getItem('token');

  return (
    <div className="bg-gray-50 min-h-screen main-content">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4">Welcome to Campus Clubs</h1>
          <p className="text-xl mb-8 text-blue-100">
            Discover clubs, manage events, and connect with students on campus
          </p>
          {!token ? (
            <div className="space-x-4">
              <button
                onClick={() => navigate('/login')}
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/login')}
                className="bg-blue-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition border-2 border-white"
              >
                Sign Up
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
            >
              Go to Dashboard
            </button>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">Why Join Campus Clubs?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-lg shadow-md hover:shadow-lg transition">
              <Users className="mx-auto mb-4 text-blue-600" size={40} />
              <h3 className="text-xl font-semibold mb-2">Connect with Peers</h3>
              <p className="text-gray-600">Find and join clubs that match your interests and passions</p>
            </div>
            <div className="text-center p-6 rounded-lg shadow-md hover:shadow-lg transition">
              <Calendar className="mx-auto mb-4 text-blue-600" size={40} />
              <h3 className="text-xl font-semibold mb-2">Manage Events</h3>
              <p className="text-gray-600">Register for events and stay updated with club activities</p>
            </div>
            <div className="text-center p-6 rounded-lg shadow-md hover:shadow-lg transition">
              <Award className="mx-auto mb-4 text-blue-600" size={40} />
              <h3 className="text-xl font-semibold mb-2">Build Skills</h3>
              <p className="text-gray-600">Develop leadership and professional skills through club activities</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Clubs */}
      {loadingClubs ? (
        <div className="text-center py-12">Loading clubs...</div>
      ) : clubs.length > 0 ? (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl font-bold mb-12 text-gray-800">Featured Clubs</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {clubs.map((club) => (
                <div key={club._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                  <div className="bg-blue-600 h-32 flex items-center justify-center">
                    <span className="text-5xl">{club.name.charAt(0)}</span>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-2">{club.name}</h3>
                    <p className="text-gray-600 mb-4 line-clamp-2">{club.description}</p>
                    <p className="text-sm text-gray-500 mb-4">👥 {club.members?.length || 0} members</p>
                    <button
                      onClick={() => navigate('/clubs')}
                      className="text-blue-600 font-semibold flex items-center gap-2 hover:text-blue-800"
                    >
                      Learn More <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Upcoming Events */}
      {loadingEvents ? (
        <div className="text-center py-12">Loading events...</div>
      ) : events.length > 0 ? (
        <section className="py-16 bg-gray-100">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl font-bold mb-12 text-gray-800">Upcoming Events</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {events.map((event) => (
                <div key={event._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                  <div className="bg-gradient-to-r from-green-500 to-blue-600 h-32 flex items-center justify-center text-white">
                    <Calendar size={40} />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-2">{event.name}</h3>
                    <p className="text-gray-600 mb-4 line-clamp-2">{event.description}</p>
                    <p className="text-sm text-gray-500 mb-2">
                      📅 {new Date(event.date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      👥 {event.registrations?.length || 0} registered
                    </p>
                    <button
                      onClick={() => navigate('/events')}
                      className="text-blue-600 font-semibold flex items-center gap-2 hover:text-blue-800"
                    >
                      View Details <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Call to Action */}
      <section className="bg-blue-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="mb-8 text-blue-100">
            Join thousands of students exploring clubs and attending events
          </p>
          {!token ? (
            <button
              onClick={() => navigate('/login')}
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
            >
              Join Now
            </button>
          ) : null}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="mb-4">&copy; 2026 Campus Clubs. All rights reserved.</p>
          <div className="flex justify-center gap-6">
            <button onClick={() => navigate('/')} className="hover:text-blue-400">Home</button>
            <button onClick={() => navigate('/about')} className="hover:text-blue-400">About</button>
            <button onClick={() => navigate('/contact')} className="hover:text-blue-400">Contact</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
