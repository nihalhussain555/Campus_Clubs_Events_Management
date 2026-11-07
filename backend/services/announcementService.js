import Notification from '../models/Notification.js';

// A campus announcement is one shared document (user: null) whose read state
// lives in readBy, so telling every student costs a single insert no matter how
// large the campus is, and it appears in everyone's bell without fan-out.
//
// Failures are swallowed on purpose: this runs after the create/update that
// triggered it, so a broken announcement must not turn a successful write into
// a 500 the organiser then repeats.
export const announce = async ({ title, message, type = 'info', event = null }) => {
  try {
    return await Notification.create({
      user: null,
      title,
      message,
      type,
      event
    });
  } catch (error) {
    console.error('Campus announcement failed:', error.message);
    return null;
  }
};
