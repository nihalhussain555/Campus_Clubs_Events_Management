import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Bell,
  Compass,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  User,
  X,
  Settings,
  FileText,
  GraduationCap
} from 'lucide-react';
import api, { authAPI, notificationAPI } from '../services/api';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem('user') || '{}')
  );

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);

    onScroll();

    window.addEventListener('scroll', onScroll);

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!user?.name) return;

    const loadNotifications = async () => {
      try {
        const response = await notificationAPI.getAllNotifications();

        setNotifications(
          response.data?.notifications ||
          response.data ||
          []
        );
      } catch (error) {
        console.error('Failed to load notifications:', error);
        setNotifications([]);
      }
    };

    loadNotifications();
  }, [user?.name]);

    useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      setUser({});
      return;
    }

    const syncUser = async () => {
      try {
        const response = await authAPI.getProfile();

        const currentUser = response.data?.user;

        if (currentUser) {
          setUser(currentUser);

          localStorage.setItem(
            'user',
            JSON.stringify(currentUser)
          );
        }
      } catch (error) {
        console.error(
          'Failed to sync user:',
          error
        );
      }
    };

    syncUser();
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
          <span className="text-lg font-black tracking-normal text-[#073c57]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-sm">
                <GraduationCap
                  size={22}
                  strokeWidth={1.8}
                  className="text-white"
                />
              </div>

              <span className="text-lg font-extrabold tracking-tight text-slate-900">
                Campus Clubs
              </span>
            </div>
          </span>
        </button>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={navLinkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        {/* Notification Bell */}
{user?.name && (
  <div className="relative">
    <button
      type="button"
      onClick={() => {
        setNotificationOpen((open) => !open);
        setProfileOpen(false);
      }}
      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:text-black"
      aria-label="Notifications"
      aria-expanded={notificationOpen}
    >
      <Bell size={19} strokeWidth={2} />

      {notifications.length > 0 && (
        <span className="absolute right-1 top-1 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60"></span>
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white"></span>
        </span>
      )}
    </button>

    {/* Notification Popup */}
    {notificationOpen && (
      <div className="absolute right-0 top-12 z-50 w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">
              Notifications
            </h3>

            {notifications.length > 0 && (
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                {notifications.length} notification
                {notifications.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setNotificationOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close notifications"
          >
            <X size={18} />
          </button>
        </div>

        {/* Notification List */}
        <div className="max-h-[360px] overflow-y-auto">

          {notifications.length > 0 ? (
            notifications.map((notification, index) => (
              <div
                key={notification._id || notification.id || index}
                className="flex gap-3 border-b border-slate-100 px-5 py-4 transition-colors hover:bg-slate-50"
              >

                {/* Icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
                  <Bell
                    size={18}
                    className="text-slate-700"
                  />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold leading-5 text-slate-900">
                    {notification.title || notification.message || 'New notification'}
                  </p>

                  {notification.description &&
                    notification.description !== notification.message && (
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {notification.description}
                      </p>
                    )}

                  <p className="mt-1 text-xs font-medium text-slate-400">
                    {notification.createdAt
                      ? new Date(notification.createdAt).toLocaleDateString()
                      : 'Recently'}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <Bell size={22} className="text-slate-400" />
              </div>

              <p className="text-sm font-bold text-slate-700">
                No notifications
              </p>

              <p className="mt-1 text-xs text-slate-400">
                You're all caught up.
              </p>
            </div>
          )}

        </div>
      </div>
    )}
  </div>
)}
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
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      navigate('/account-settings');
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-[#e8f5fb] hover:text-[#145f82]"
                  >
                    <Settings size={16} />
                    Account & Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      navigate('/certificates');
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-[#e8f5fb] hover:text-[#145f82]"
                  >
                    <FileText size={16} />
                    My Certificates
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
                <button type="button" onClick={() => { closeMenu(); navigate('/account-settings'); }} className="btn-secondary w-full">
                  <Settings size={16} />
                  Account & Settings
                </button>
                <button type="button" onClick={() => { closeMenu(); navigate('/certificates'); }} className="btn-secondary w-full">
                  <FileText size={16} />
                  My Certificates
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
