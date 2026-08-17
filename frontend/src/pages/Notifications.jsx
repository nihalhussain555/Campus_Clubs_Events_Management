import React, { useEffect, useState } from 'react';

import {
  Bell,
  Calendar,
  CheckCircle,
  Award,
  AlertTriangle,
  Info,
  Trash2,
  CheckCheck
} from 'lucide-react';

import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LoadingScreen from '../components/LoadingScreen';
import Toast from '../components/Toast';

import { notificationAPI } from '../services/api';


const Notifications = () => {

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // =====================================================
  // LOAD NOTIFICATIONS
  // =====================================================

  const fetchNotifications = async () => {
    try {

      const response =
        await notificationAPI.getAllNotifications();

      const data = response.data || {};

      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);

    } catch (error) {

      console.error(
        'Error loading notifications:',
        error
      );

      setToast({
        message: 'Error loading notifications',
        type: 'error'
      });

    } finally {
      setLoading(false);
    }
  };


  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    fetchNotifications();
  }, []);


  // =====================================================
  // GET ICON
  // =====================================================

  const getNotificationIcon = (type) => {

    switch (type) {

      case 'registration':
        return CheckCircle;

      case 'reminder':
      case 'event':
        return Calendar;

      case 'cancellation':
        return AlertTriangle;

      case 'certificate':
        return Award;

      case 'alert':
        return AlertTriangle;

      default:
        return Info;
    }
  };


  // =====================================================
  // MARK ONE AS READ
  // =====================================================

  const handleMarkAsRead = async (notification) => {

    if (notification.isRead) {
      return;
    }

    try {

      await notificationAPI.markAsRead(
        notification._id
      );

      setNotifications(prev =>
        prev.map(item =>
          item._id === notification._id
            ? { ...item, isRead: true }
            : item
        )
      );

      setUnreadCount(prev =>
        Math.max(0, prev - 1)
      );

    } catch (error) {

      console.error(
        'Error marking notification as read:',
        error
      );

    }
  };


  // =====================================================
  // MARK ALL AS READ
  // =====================================================

  const handleMarkAllAsRead = async () => {

    if (unreadCount === 0) {
      return;
    }

    try {

      await notificationAPI.markAllAsRead();

      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          isRead: true
        }))
      );

      setUnreadCount(0);

      setToast({
        message: 'All notifications marked as read',
        type: 'success'
      });

    } catch (error) {

      setToast({
        message: 'Unable to mark notifications as read',
        type: 'error'
      });

    }
  };


  // =====================================================
  // DELETE
  // =====================================================

  const handleDelete = async (id) => {

    try {

      const notification =
        notifications.find(
          item => item._id === id
        );

      await notificationAPI.deleteNotification(id);

      setNotifications(prev =>
        prev.filter(item => item._id !== id)
      );

      if (notification && !notification.isRead) {
        setUnreadCount(prev =>
          Math.max(0, prev - 1)
        );
      }

    } catch (error) {

      setToast({
        message: 'Unable to delete notification',
        type: 'error'
      });
    }
  };


  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (date) => {

    if (!date) {
      return 'Recently';
    }

    return new Date(date).toLocaleString(
      'en-IN',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  };


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <LoadingScreen
        message="Loading Notifications..."
      />
    );
  }


  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="app-page">

      <Navbar />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <main>

        <section className="page-section pt-8">

          <div className="page-container">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

              <div>

                <span className="eyebrow flex items-center gap-2">
                  <Bell size={16} />
                  Updates
                </span>

                <h1 className="display-title text-4xl sm:text-5xl">
                  Notifications
                </h1>

                <p className="section-copy mt-4">
                  Stay updated with registrations, events,
                  reminders and certificates.
                </p>

              </div>


              {unreadCount > 0 && (

                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="btn-secondary flex items-center gap-2"
                >
                  <CheckCheck size={17} />
                  Mark all as read
                </button>

              )}

            </div>


            {/* =================================================
                UNREAD COUNT
            ================================================= */}

            {notifications.length > 0 && (

              <div className="mb-5 flex items-center gap-3">

                <div className="rounded-full bg-[#eef8fc] px-4 py-2 text-sm font-bold text-[#145f82]">

                  {unreadCount > 0
                    ? `${unreadCount} unread`
                    : 'All notifications read'}

                </div>

              </div>

            )}


            {/* =================================================
                NOTIFICATION LIST
            ================================================= */}

            {notifications.length > 0 ? (

              <div className="grid max-w-4xl gap-4">

                {notifications.map(notification => {

                  const Icon =
                    getNotificationIcon(
                      notification.type
                    );

                  return (

                    <article
                      key={notification._id}
                      onClick={() =>
                        handleMarkAsRead(notification)
                      }
                      className={`app-card flex cursor-pointer gap-4 items-start transition-all ${
                        !notification.isRead
                          ? 'border-l-4 border-[#145f82] bg-[#f8fcfe]'
                          : 'opacity-80'
                      }`}
                    >

                      {/* ICON */}

                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                          !notification.isRead
                            ? 'bg-[#eef8fc] text-[#145f82]'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <Icon size={24} />
                      </div>


                      {/* CONTENT */}

                      <div className="min-w-0 flex-1">

                        <div className="flex items-start justify-between gap-3">

                          <div>

                            <h3
                              className={`text-lg font-black ${
                                !notification.isRead
                                  ? 'text-black'
                                  : 'text-slate-700'
                              }`}
                            >
                              {notification.title}
                            </h3>

                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              {notification.message}
                            </p>

                          </div>


                          {!notification.isRead && (

                            <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#145f82]" />

                          )}

                        </div>


                        {/* DATE */}

                        <div className="mt-3 flex items-center justify-between">

                          <span className="text-xs font-bold text-slate-500">
                            {formatDate(
                              notification.createdAt
                            )}
                          </span>


                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(
                                notification._id
                              );
                            }}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                            title="Delete notification"
                          >
                            <Trash2 size={16} />
                          </button>

                        </div>

                      </div>

                    </article>

                  );

                })}

              </div>

            ) : (

              <div className="app-card text-center">

                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">

                  <Bell
                    size={28}
                    className="text-slate-400"
                  />

                </div>

                <p className="text-lg font-bold text-slate-500">
                  No notifications at the moment.
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  You're all caught up.
                </p>

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