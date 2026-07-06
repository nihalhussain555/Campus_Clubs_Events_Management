import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, User as UserIcon } from 'lucide-react';
import api from '../services/api';
import { useScrollSpy } from '../hooks/useScrollSpy';

const sections = ['home', 'about', 'contact', 'clubs', 'events', 'profile']; // IDs of page sections

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const activeSection = useScrollSpy(sections);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
    navigate('/login');
  };

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  const linkClass = (section) =>
    `hover:bg-blue-700 px-3 py-2 rounded ${activeSection === section ? 'bg-blue-800' : ''}`;

  return (
    <nav className="bg-blue-600 text-white shadow-lg fixed w-full z-10 glass p-2 md:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-16">
        <div className="font-bold text-xl cursor-pointer" onClick={() => navigate('/')}>🎓 Campus Clubs</div>
        {/* Desktop menu */}
        <div className="hidden md:flex items-center space-x-6">
          <NavLink to="/" className={linkClass('home')}>Home</NavLink>
          <NavLink to="/about" className={linkClass('about')}>About</NavLink>
          <NavLink to="/contact" className={linkClass('contact')}>Contact</NavLink>
          {user?.name && (
            <>
              <NavLink to="/clubs" className={linkClass('clubs')}>Clubs</NavLink>
              <NavLink to="/events" className={linkClass('events')}>Events</NavLink>
              {user?.role === 'admin' && (
                <NavLink to="/admin" className={linkClass('admin')}>Admin Panel</NavLink>
              )}
            </>
          )}
          {user?.name ? (
            <div className="relative inline-block text-left">
              <button onClick={toggleDropdown} className="flex items-center gap-2 hover:bg-blue-700 px-3 py-2 rounded">
                <UserIcon size={18} />
                <span>{user.name.split(' ')[0]}</span>
              </button>
              {dropdownOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                  <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                    <button
                      onClick={() => { navigate('/profile'); setDropdownOpen(false); }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                    >
                      {user.name}
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                    >
                      <LogOut size={16} className="mr-2" /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => navigate('/login')} className="hover:bg-blue-700 px-3 py-2 rounded">Login</button>
          )}
        </div>
        {/* Mobile menu button */}
        <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden pb-4 space-y-2">
          <NavLink to="/" className={linkClass('home')} onClick={() => setIsOpen(false)}>Home</NavLink>
          <NavLink to="/about" className={linkClass('about')} onClick={() => setIsOpen(false)}>About</NavLink>
          <NavLink to="/contact" className={linkClass('contact')} onClick={() => setIsOpen(false)}>Contact</NavLink>
          {user?.name && (
            <>
              <NavLink to="/clubs" className={linkClass('clubs')} onClick={() => setIsOpen(false)}>Clubs</NavLink>
              <NavLink to="/events" className={linkClass('events')} onClick={() => setIsOpen(false)}>Events</NavLink>
              {user?.role === 'admin' && (
                <NavLink to="/admin" className={linkClass('admin')} onClick={() => setIsOpen(false)}>Admin Panel</NavLink>
              )}
              <button onClick={handleLogout} className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                <LogOut size={16} className="mr-2" /> Logout
              </button>
            </>
          )}
          {!user?.name && (
            <button onClick={() => { navigate('/login'); setIsOpen(false); }} className="hover:bg-blue-700 px-3 py-2 rounded">Login</button>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
