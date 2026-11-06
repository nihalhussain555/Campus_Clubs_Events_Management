import Club from '../models/Club.js';
import Event from '../models/Event.js';
import { ROLES } from './authMiddleware.js';

// Admins act on everything. Club leaders act only on clubs they run, which is
// recorded on Club.admin. Students never manage club resources.
export const canManageClub = async (user, clubId) => {
  if (!user || !clubId) return false;
  if (user.effectiveRole === ROLES.ADMIN) return true;
  if (user.effectiveRole !== ROLES.CLUB_LEADER) return false;

  const club = await Club.findById(clubId).select('admin');

  return Boolean(club?.admin?.toString() === user.id);
};

export const canManageEvent = async (user, eventId) => {
  if (!user || !eventId) return false;
  if (user.effectiveRole === ROLES.ADMIN) return true;
  if (user.effectiveRole !== ROLES.CLUB_LEADER) return false;

  const event = await Event.findById(eventId).select('club');

  if (!event?.club) return false;

  return canManageClub(user, event.club);
};

const deny = (res) =>
  res.status(403).json({
    message: 'Access denied. You do not manage this club.',
  });

export const requireClubManager = (paramName = 'id') => async (
  req,
  res,
  next
) => {
  try {
    if (await canManageClub(req.user, req.params[paramName])) return next();
    return deny(res);
  } catch (error) {
    return next(error);
  }
};

export const requireEventManager = (paramName = 'id') => async (
  req,
  res,
  next
) => {
  try {
    if (await canManageEvent(req.user, req.params[paramName])) return next();
    return deny(res);
  } catch (error) {
    return next(error);
  }
};
