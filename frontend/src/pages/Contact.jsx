import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      setToast({ message: 'Please fill all fields', type: 'error' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setToast({ message: 'Please enter a valid email address', type: 'error' });
      return;
    }

    setLoading(true);

    try {
      // Simulate form submission (in production, send to backend)
      setTimeout(() => {
        setToast({ message: 'Thank you for reaching out! We\'ll get back to you soon.', type: 'success' });
        setFormData({ name: '', email: '', subject: '', message: '' });
        setLoading(false);
      }, 1500);
    } catch (error) {
      setToast({ message: 'Error sending message. Please try again.', type: 'error' });
      setLoading(false);
    }
  };

  return (
    <div className="contact-page">
      <Navbar />

      {/* Header */}
      <section className="contact-header">
        <div className="contact-header-container">
          <h1 className="contact-title">Contact Us</h1>
          <p className="contact-subtitle">
            Have questions? We'd love to hear from you
          </p>
        </div>
      </section>

      {/* Contact Information */}
      <section className="contact-info">
        <div className="contact-info-container">
          <div className="contact-info-grid">
            <div className="contact-card">
              <Mail className="contact-icon" size={40} />
              <h3 className="contact-card-title">Email</h3>
              <p className="contact-text">support@campusclubs.com</p>
              <p className="contact-text">hello@campusclubs.com</p>
            </div>
            <div className="contact-card">
              <Phone className="contact-icon" size={40} />
              <h3 className="contact-card-title">Phone</h3>
              <p className="contact-text">+1 (555) 123-4567</p>
              <p className="contact-text">Mon - Fri, 9:00 AM - 5:00 PM</p>
            </div>
            <div className="text-center p-8 bg-gray-50 rounded-lg">
              <MapPin className="mx-auto mb-4 text-blue-600" size={40} />
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Location</h3>
              <p className="text-gray-600">Campus Student Center</p>
              <p className="text-gray-600">Room 101, Building A</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16 bg-gray-100">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-3xl font-bold mb-8 text-gray-800">Send us a Message</h2>
            
            {toast && (
              <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast(null)}
              />
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Subject of your message"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Message</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows="6"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your message..."
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                <Send size={20} />
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">Frequently Asked Questions</h2>
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">How do I join a club?</h3>
              <p className="text-gray-600">
                Simply log into your account, browse the clubs page, and click the "Join" button on any club you're interested in. You'll be added to the club immediately!
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Can I create my own club?</h3>
              <p className="text-gray-600">
                If you have admin privileges, you can create a new club through the admin panel. Please contact us if you'd like to establish a new club.
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">How do I register for events?</h3>
              <p className="text-gray-600">
                Visit the Events page, select an event you're interested in, and click "Register". You'll receive updates and reminders about the event.
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">How can I update my profile?</h3>
              <p className="text-gray-600">
                Go to your profile page in the navigation menu and click "Edit Profile" to update your information.
              </p>
            </div>
          </div>
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

export default Contact;
