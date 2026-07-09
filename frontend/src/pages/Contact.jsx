import React, { useState } from 'react';
import { Mail, MapPin, Phone, Send } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Toast from '../components/Toast';

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      setToast({ message: 'Please fill all fields', type: 'error' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setToast({ message: 'Please enter a valid email address', type: 'error' });
      return;
    }

    setLoading(true);
    window.setTimeout(() => {
      setToast({ message: "Thank you for reaching out. We'll get back to you soon.", type: 'success' });
      setFormData({ name: '', email: '', subject: '', message: '' });
      setLoading(false);
    }, 900);
  };

  const contactCards = [
    [Mail, 'Email', ['support@campusclubs.com', 'hello@campusclubs.com']],
    [Phone, 'Phone', ['+91 987654321', 'Mon - Fri, 9:00 AM - 5:00 PM']],
    [MapPin, 'Location', ['Campus Student Center', 'Room 101, Building A']],
  ];

  const faqs = [
    ['How do I join a club?', 'Log in, open Clubs, and select Join on any club that matches your interests.'],
    ['Can I create my own club?', 'Admins can create clubs from the admin tools. Contact campus staff to request admin access.'],
    ['How do I register for events?', 'Open Events, choose an event, and complete the registration confirmation.'],
    ['How can I update my profile?', 'Use the Profile page to edit your visible account information.'],
  ];

  return (
    <div className="app-page">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <main>
        <section className="page-section pt-8">
          <div className="page-container">
            <div className="hero-shell">
              <span className="eyebrow">Contact us</span>
              <h1 className="display-title">Questions, ideas, or campus support.</h1>
              <p className="section-copy mt-6">
                Send a message to the Campus Clubs team and we will help with clubs, events, accounts, or admin access.
              </p>
            </div>
          </div>
        </section>

        <section className="page-section">
          <div className="page-container grid gap-5 md:grid-cols-3">
            {contactCards.map(([Icon, title, lines]) => (
              <article key={title} className="app-card app-card-hover text-center">
                <span className="icon-tile mx-auto mb-5">
                  <Icon size={22} />
                </span>
                <h3 className="mb-2 text-xl font-black text-black">{title}</h3>
                {lines.map((line) => (
                  <p key={line} className="text-sm font-semibold text-slate-600">
                    {line}
                  </p>
                ))}
              </article>
            ))}
          </div>
        </section>

        <section className="page-section bg-white/70">
          <div className="page-container grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <span className="eyebrow">Message</span>
              <h2 className="section-title">Tell us what you need.</h2>
              <p className="section-copy mt-5">
                Keep it short or detailed. The form validates your details and gives you a clean confirmation state.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="app-card space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="field-label">Full name</label>
                  <input name="name" value={formData.name} onChange={handleChange} className="field" placeholder="Your name" />
                </div>
                <div>
                  <label className="field-label">Email address</label>
                  <input name="email" type="email" value={formData.email} onChange={handleChange} className="field" placeholder="your@email.com" />
                </div>
              </div>
              <div>
                <label className="field-label">Subject</label>
                <input name="subject" value={formData.subject} onChange={handleChange} className="field" placeholder="What is this about?" />
              </div>
              <div>
                <label className="field-label">Message</label>
                <textarea name="message" value={formData.message} onChange={handleChange} className="field min-h-36" placeholder="Write your message" />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                <Send size={18} />
                {loading ? 'Sending...' : 'Send message'}
              </button>
            </form>
          </div>
        </section>

        <section className="page-section">
          <div className="page-container">
            <div className="mb-8 text-center">
              <span className="eyebrow">FAQ</span>
              <h2 className="section-title">Fast answers.</h2>
            </div>
            <div className="mx-auto grid max-w-4xl gap-4">
              {faqs.map(([question, answer]) => (
                <article key={question} className="app-card">
                  <h3 className="font-black text-black">{question}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
