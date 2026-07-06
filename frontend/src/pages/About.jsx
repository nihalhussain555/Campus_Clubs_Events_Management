import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { CheckCircle, Users, Zap, Globe } from 'lucide-react';

const About = () => {
  const navigate = useNavigate();

  return (
<div className="page-about">
  <Navbar />

  {/* Header */}
  <section className="page-about-header">
    <div className="page-container">
      <h1 className="page-title">About Campus Clubs</h1>
      <p className="page-subtitle">
        Connecting students through shared interests and experiences
      </p>
    </div>
  </section>

  {/* Mission Section */}
  <section className="section-white">
    <div className="page-container">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="section-heading">Our Mission</h2>
          <p className="section-text">
            Campus Clubs is a comprehensive platform designed to bring students together and foster a vibrant campus community. We believe that extracurricular activities are crucial for personal development and creating lasting connections.
          </p>
              <h2 className="text-3xl font-bold mb-6 text-gray-800">Our Mission</h2>
              <p className="text-gray-600 mb-4 text-lg">
                Campus Clubs is a comprehensive platform designed to bring students together and foster a vibrant campus community. We believe that extracurricular activities are crucial for personal development and creating lasting connections.
              </p>
              <p className="text-gray-600 text-lg">
                Our platform makes it easy for students to discover clubs, register for events, and engage with like-minded peers across the campus.
              </p>
            </div>
            <div className="bg-blue-100 rounded-lg p-8">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <Users className="text-blue-600 flex-shrink-0" size={24} />
                  <div>
                    <h3 className="font-semibold text-gray-800">Community Building</h3>
                    <p className="text-gray-600 text-sm">Connect with students who share your interests</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Zap className="text-blue-600 flex-shrink-0" size={24} />
                  <div>
                    <h3 className="font-semibold text-gray-800">Skill Development</h3>
                    <p className="text-gray-600 text-sm">Develop leadership and professional skills</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Globe className="text-blue-600 flex-shrink-0" size={24} />
                  <div>
                    <h3 className="font-semibold text-gray-800">Networking</h3>
                    <p className="text-gray-600 text-sm">Build meaningful connections with peers</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-16 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">Platform Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="flex items-start gap-4">
                <CheckCircle className="text-green-500 flex-shrink-0" size={32} />
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-800">Club Discovery</h3>
                  <p className="text-gray-600">
                    Browse and search through hundreds of active clubs on campus. Find communities that match your interests and passions.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="flex items-start gap-4">
                <CheckCircle className="text-green-500 flex-shrink-0" size={32} />
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-800">Event Management</h3>
                  <p className="text-gray-600">
                    View upcoming events, register for activities, and get notifications about club happenings.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="flex items-start gap-4">
                <CheckCircle className="text-green-500 flex-shrink-0" size={32} />
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-800">Member Profiles</h3>
                  <p className="text-gray-600">
                    Create your profile, track your club memberships, and manage your event registrations all in one place.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="flex items-start gap-4">
                <CheckCircle className="text-green-500 flex-shrink-0" size={32} />
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-800">Admin Tools</h3>
                  <p className="text-gray-600">
                    Club leaders can create and manage clubs, post events, track registrations, and engage with members.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">By The Numbers</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">500+</div>
              <p className="text-gray-600">Active Clubs</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">10K+</div>
              <p className="text-gray-600">Student Members</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">2K+</div>
              <p className="text-gray-600">Events Hosted</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">50K+</div>
              <p className="text-gray-600">Event Registrations</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-blue-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Join the Community Today</h2>
          <p className="mb-8 text-blue-100 max-w-2xl mx-auto">
            Start exploring clubs, attending events, and connecting with students who share your interests
          </p>
          <button
            onClick={() => navigate('/login')}
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
          >
            Get Started
          </button>
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

export default About;
