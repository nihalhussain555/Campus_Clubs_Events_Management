import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

import { calendarAPI } from '../services/api';

// The saved-events list is needed by more than one surface at once: the
// calendar page draws it, the event detail card shows whether it is already
// saved, and both must agree the moment either one changes it. A module store
// keeps them honest without threading state through React Router.
const EMPTY = {
  owner: null,
  events: [],
  notes: [],
  remindersEnabled: true,
  loading: true,
  loaded: false,
  error: null
};

let state = { ...EMPTY };

const listeners = new Set();

const emit = () => listeners.forEach((notify) => notify());

const set = (patch) => {
  state = { ...state, ...patch };
  emit();
};

// Every response carries the caller's whole calendar, so a write is applied
// straight from it instead of being re-read.
const applyPayload = (data) =>
  set({
    events: data?.events || [],
    notes: data?.notes || [],
    remindersEnabled: data?.remindersEnabled !== false,
    loaded: true,
    loading: false,
    error: null
  });

const messageFrom = (error) =>
  error?.response?.data?.message || 'Your calendar could not be loaded';

// A different token means a different student, and nobody should inherit the
// previous person's saved events from a warm cache.
const currentOwner = () => localStorage.getItem('token');

const load = async () => {
  if (state.owner !== currentOwner()) {
    set({ ...EMPTY, owner: currentOwner() });
  }

  if (state.loading || state.loaded) return;

  set({ loading: true });

  try {
    const { data } = await calendarAPI.getMyCalendar();
    applyPayload(data);
  } catch (error) {
    set({ loading: false, error: messageFrom(error) });
  }
};

const refresh = async () => {
  if (state.owner !== currentOwner()) {
    set({ ...EMPTY, owner: currentOwner() });
  }

  set({ loading: true });

  try {
    const { data } = await calendarAPI.getMyCalendar();
    applyPayload(data);
    return data;
  } catch (error) {
    set({ loading: false, error: messageFrom(error) });
    throw error;
  }
};

export const saveEventToCalendar = async (eventId) => {
  const { data } = await calendarAPI.saveEvent(eventId);
  applyPayload(data);
  return data;
};

export const removeEventFromCalendar = async (eventId) => {
  const { data } = await calendarAPI.removeEvent(eventId);
  applyPayload(data);
  return data;
};

export const addCalendarNote = async (note) => {
  const { data } = await calendarAPI.addNote(note);
  applyPayload(data);
  return data;
};

export const deleteCalendarNote = async (noteId) => {
  const { data } = await calendarAPI.deleteNote(noteId);
  applyPayload(data);
  return data;
};

const subscribe = (notify) => {
  listeners.add(notify);
  return () => listeners.delete(notify);
};

const getSnapshot = () => state;

export const useMyCalendar = () => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    load();
  }, []);

  const savedIds = useMemo(
    () => new Set(snapshot.events.map((event) => String(event._id))),
    [snapshot.events]
  );

  const isSaved = useCallback(
    (eventId) => savedIds.has(String(eventId)),
    [savedIds]
  );

  return {
    ...snapshot,
    savedIds,
    isSaved,
    refresh
  };
};
