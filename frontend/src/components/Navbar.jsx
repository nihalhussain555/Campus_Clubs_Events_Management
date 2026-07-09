import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown, Compass, LayoutDashboard, LogOut, Menu, User, X } from 'lucide-react';
import api from '../services/api';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common.Authorization;
    setIsOpen(false);
    setProfileOpen(false);
    navigate('/login');
  };

  const closeMenu = () => {
    setIsOpen(false);
    setProfileOpen(false);
  };

  const navLinkClass = ({ isActive }) =>
    `rounded-full px-4 py-2 text-sm font-bold transition ${
      isActive
        ? 'bg-black text-white'
        : 'text-slate-700 hover:bg-slate-100 hover:text-black'
    }`;

  const links = [
    { to: '/', label: 'Home' },
    { to: '/about', label: 'About' },
    { to: '/contact', label: 'Contact' },
    ...(user?.name
      ? [
          { to: '/clubs', label: 'Clubs' },
          { to: '/events', label: 'Events' },
          ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : []),
        ]
      : []),
  ];

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-40 border-b transition duration-300 ${
        isScrolled
          ? 'border-slate-200 bg-white/92 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl'
          : 'border-transparent bg-white/78 backdrop-blur-xl'
      }`}
    >
      <div className="page-container flex h-20 items-center justify-between">
        <button
          type="button"
          onClick={() => {
            closeMenu();
            navigate('/');
          }}
          className="flex items-center gap-3 rounded-full pr-3 text-left"
          aria-label="Go to home"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#145f82] text-white">
            <Compass size={20} />
          </span>
          <span className="text-lg font-black tracking-normal text-[#073c57]">Campus Clubs</span>
        </button>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={navLinkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user?.name ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                className="flex items-center gap-2 rounded-full border border-[#bcddeb] bg-white px-3 py-2 text-sm font-bold text-[#145f82] shadow-sm hover:bg-[#e8f5fb]"
                aria-expanded={profileOpen}
              >
                <User size={16} />
                <span className="max-w-28 truncate">{user.name.split(' ')[0]}</span>
                <ChevronDown size={16} className={`transition ${profileOpen ? 'rotate-180' : ''}`} />
              </button>
              {profileOpen && (
                <div className="dropdown-card">
                  <div className="border-b border-slate-100 px-3 py-3">
                    <p className="truncate text-sm font-black text-[#073c57]">{user.name}</p>
                    <p className="truncate text-xs font-semibold text-slate-500">{user.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      navigate('/profile');
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-[#e8f5fb] hover:text-[#145f82]"
                  >
                    <User size={16} />
                    Profile
                  </button>
                  {user?.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => {
                        closeMenu();
                        navigate('/admin');
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-[#e8f5fb] hover:text-[#145f82]"
                    >
                      <LayoutDashboard size={16} />
                      Admin dashboard
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-red-700 hover:bg-red-50"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button type="button" onClick={() => navigate('/login')} className="btn-primary">
              Login / SignUp
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="btn-secondary px-3 md:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={isOpen}
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <nav className="page-container flex flex-col gap-2 py-4">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} onClick={closeMenu} className={navLinkClass}>
                {link.label}
              </NavLink>
            ))}
            {user?.name ? (
              <div className="mt-2 grid gap-2 rounded-2xl border border-[#bcddeb] bg-[#eef8fc] p-3">
                <button type="button" onClick={() => { closeMenu(); navigate('/profile'); }} className="btn-secondary w-full">
                  <User size={16} />
                  {user.name.split(' ')[0]} profile
                </button>
                <button type="button" onClick={handleLogout} className="btn-secondary w-full">
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  navigate('/login');
                }}
                className="btn-primary mt-2 w-full"
              >
                Login
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
