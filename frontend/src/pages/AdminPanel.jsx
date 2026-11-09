import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Ban,
  Bell,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Download,
  KeyRound,
  MapPin,
  Medal,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  Trophy,
  Undo2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

import Navbar from '../components/Navbar';
import {
  authAPI,
  clubAPI,
  eventAPI,
  gamificationAPI,
  notificationAPI,
} from '../services/api';
import LoadingScreen from '../components/LoadingScreen';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import AnalyticsCharts from '../components/AnalyticsCharts';
import { getEventStatus } from '../utils/eventStatus';
import { withInstantTimes } from '../utils/eventTime';
import { ACTIVITY_OPTIONS } from '../utils/activityTypes';

// Password setup status for the users table. mustChangePassword is the
// server-side flag: it is true from the moment an account is created until the
// holder finishes the mandatory Set New Password page.
const credentialStatus = (user) => {
  if (!user.mustChangePassword) {
    return {
      label: 'Active',
      detail: 'Own password set',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      Icon: CheckCircle2,
    };
  }

  const expiresAt = user.temporaryPasswordExpiresAt
    ? new Date(user.temporaryPasswordExpiresAt)
    : null;

  if (!expiresAt) {
    return {
      label: 'Awaiting first login',
      detail: 'Temporary password issued',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
      Icon: Clock,
    };
  }

  if (expiresAt.getTime() <= Date.now()) {
    return {
      label: 'Link expired',
      detail: `Expired ${expiresAt.toLocaleString()}`,
      className: 'bg-red-50 text-red-700 border-red-200',
      Icon: AlertTriangle,
    };
  }

  return {
    label: 'Awaiting first login',
    detail: `Temporary password valid until ${expiresAt.toLocaleString()}`,
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    Icon: Clock,
  };
};

const XP_TYPE_LABELS = {
  event_attendance: 'Event attendance',
  competition_participation: 'Competition entry',
  competition_win: 'Competition win',
  volunteering: 'Volunteering',
  event_organizing: 'Event organizing',
  workshop_completion: 'Workshop completion',
  achievement_bonus: 'Badge bonus',
  manual_adjustment: 'Manual adjustment',
};

const METRIC_LABELS = {
  eventsAttended: 'Events attended',
  activeWeeks: 'Active weeks',
  competitionEntries: 'Competition entries',
  competitionWins: 'Competition wins',
  volunteerCredits: 'Volunteer credits',
  eventsOrganized: 'Events organized',
  clubsLed: 'Clubs led',
  totalXp: 'Total XP',
  badgesEarned: 'Badges earned',
};

const AWARD_TYPE_ORDER = [
  'manual_adjustment',
  'competition_win',
  'volunteering',
  'event_organizing',
  'workshop_completion',
  'event_attendance',
  'competition_participation',
];

const ADMIN_ROLES = ['student', 'club_member'];

// A blob request that fails still carries the JSON error body, and the reason
// for the failure is the only thing the admin can act on.
const blobErrorMessage = async (error, fallback) => {
  const data = error.response?.data;

  if (data instanceof Blob) {
    try {
      return JSON.parse(await data.text()).message || fallback;
    } catch {
      return fallback;
    }
  }

  return data?.message || fallback;
};

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const [users, setUsers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  const [search, setSearch] = useState('');

  const [showClubForm, setShowClubForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);

  // Destructive action waiting for confirmation
  const [pendingAction, setPendingAction] = useState(null);

  // Account creation and temporary credentials
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [accountBusy, setAccountBusy] = useState(false);
  const [resetBusyId, setResetBusyId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [issuedCredential, setIssuedCredential] = useState(null);
  const [newAccount, setNewAccount] = useState({
    name: '',
    email: '',
    role: 'student',
    studentId: '',
    department: '',
  });

  // Used only to hide the reset button for the signed-in administrator:
  // regenerating your own temporary password would lock you out mid-session.
  const [currentAdminId] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}')?.id || null;
    } catch {
      return null;
    }
  });

  const [newClub, setNewClub] = useState({
    clubName: '',
    description: '',
  });

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    endDate: '',
    location: '',
    club: '',
    capacity: 100,
    category: 'General',
    activityType: 'event',
  });

  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'info',
  });

  // --------------------------------------------------
  // GAMIFICATION
  // --------------------------------------------------

  const [game, setGame] = useState(null);
  const [gameLoading, setGameLoading] = useState(false);

  const [awardForm, setAwardForm] = useState({
    userId: '',
    type: 'manual_adjustment',
    amount: '',
    reason: '',
  });

  const [awardBusy, setAwardBusy] = useState(false);
  const [awardResult, setAwardResult] = useState(null);
  const [studentQuery, setStudentQuery] = useState('');

  const [ledger, setLedger] = useState(null);
  const [ledgerBusy, setLedgerBusy] = useState(false);

  const [badgeForm, setBadgeForm] = useState({
    slug: '',
    title: '',
    description: '',
    icon: 'Award',
    metric: 'eventsAttended',
    threshold: '',
    xpBonus: '',
  });

  const [showBadgeForm, setShowBadgeForm] = useState(false);
  const [badgeEdits, setBadgeEdits] = useState({});

  const [reportForm, setReportForm] = useState({
    scope: 'students',
    period: 'overall',
    semester: '',
  });

  const [reportBusy, setReportBusy] = useState(false);
  const [recomputeBusy, setRecomputeBusy] = useState(false);
  const [lastRecompute, setLastRecompute] = useState(null);

  // --------------------------------------------------
  // FETCH DATA
  // --------------------------------------------------

  const fetchAdminData = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const [
        usersRes,
        clubsRes,
        eventsRes,
        notificationsRes,
      ] = await Promise.all([
        authAPI.getAllUsers(),
        clubAPI.getAllClubs(),
        eventAPI.getAllEvents(),
        notificationAPI.getAllNotifications(),
      ]);

      setUsers(usersRes.data.users || []);
      setClubs(clubsRes.data.clubs || []);
      setEvents(eventsRes.data.events || []);
      setNotifications(notificationsRes.data.notifications || []);
    } catch (error) {
      console.error('Admin data error:', error);

      setToast({
        message:
          error.response?.data?.message ||
          'Unable to load admin data',
        type: 'error',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminData(true);
  }, []);

  // --------------------------------------------------
  // ACCOUNTS AND TEMPORARY CREDENTIALS
  // --------------------------------------------------

  const ACCOUNT_ROLES = [
    { value: 'student', label: 'Student' },
    { value: 'club_leader', label: 'Club leader' },
    { value: 'admin', label: 'Administrator' },
  ];

  const updateNewAccount = (field) => (event) =>
    setNewAccount((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));

  const handleCreateAccount = async (event) => {
    event.preventDefault();

    const name = newAccount.name.trim();
    const email = newAccount.email.trim().toLowerCase();

    if (!name || !email) {
      setToast({
        message: 'A name and college email are required',
        type: 'error',
      });

      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setToast({ message: 'Enter a valid email address', type: 'error' });
      return;
    }

    const payload = { name, email, role: newAccount.role };

    if (newAccount.studentId.trim()) {
      payload.studentId = newAccount.studentId.trim();
    }

    if (newAccount.department.trim()) {
      payload.department = newAccount.department.trim();
    }

    try {
      setAccountBusy(true);

      const { data } = await authAPI.createUser(payload);

      setIssuedCredential({
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        temporaryPassword: data.temporaryPassword,
        expiresAt: data.temporaryPasswordExpiresAt,
      });

      setCopied(false);
      setShowAccountForm(false);

      setNewAccount({
        name: '',
        email: '',
        role: 'student',
        studentId: '',
        department: '',
      });

      setToast({
        message: `${data.user.name} can now sign in with the temporary password`,
        type: 'success',
      });

      await fetchAdminData(false);
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message ||
          'Unable to create that account',
        type: 'error',
      });
    } finally {
      setAccountBusy(false);
    }
  };

  // Confirmation first: this replaces the password the person may already
  // hold and ends any session they have open.
  const requestTemporaryReset = (user) => {
    setPendingAction({
      title: 'Issue a new temporary password?',
      message:
        `${user.name} (${user.email}) will not be able to sign in with the ` +
        'password they have now, and any session they are using will be ' +
        'ended. The new password is shown once, here only.',
      confirmLabel: 'Generate password',
      run: async () => {
        try {
          setResetBusyId(user._id);

          const { data } = await authAPI.regenerateTemporaryPassword(user._id);

          setIssuedCredential({
            name: data.user.name,
            email: data.user.email,
            role: data.user.role,
            temporaryPassword: data.temporaryPassword,
            expiresAt: data.temporaryPasswordExpiresAt,
          });

          setCopied(false);

          setToast({
            message: `New temporary password issued for ${data.user.name}`,
            type: 'success',
          });

          await fetchAdminData(false);
        } catch (error) {
          setToast({
            message:
              error.response?.data?.message ||
              'Unable to issue a new password',
            type: 'error',
          });
        } finally {
          setResetBusyId(null);
        }
      },
    });
  };

  const copyTemporaryPassword = async () => {
    const value = issuedCredential?.temporaryPassword || '';

    try {
      await navigator.clipboard.writeText(value);

      setCopied(true);

      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setToast({
        message: 'Your browser blocked copying. Select the text and copy it ' +
          'manually instead.',
        type: 'error',
      });
    }
  };

  // --------------------------------------------------
  // GAMIFICATION DATA
  // --------------------------------------------------

  useEffect(() => {
    if (activeTab === 'gamification' && !game && !gameLoading) {
      fetchGamification();
    }
    // The tab loads on first view; refreshes are explicit.
  }, [activeTab]);

  const fetchGamification = async () => {
    try {
      setGameLoading(true);

      const [
        rulesRes,
        badgesRes,
        analyticsRes,
        suspiciousRes,
        totalsRes,
        clubsRes,
      ] = await Promise.all([
        gamificationAPI.getRules(),
        gamificationAPI.getAchievements(),
        gamificationAPI.getAnalytics(),
        gamificationAPI.getSuspicious(),
        gamificationAPI.getXpTotals({ limit: 50 }),
        gamificationAPI.getClubLeaderboard({
          period: 'overall',
          limit: 20,
        }),
      ]);

      setGame({
        rules: rulesRes.data,
        badges: badgesRes.data.achievements || [],
        analytics: analyticsRes.data,
        findings: suspiciousRes.data.findings || [],
        totals: totalsRes.data.entries || [],
        clubs: clubsRes.data.entries || [],
      });
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message ||
          'Unable to load gamification data',
        type: 'error',
      });
    } finally {
      setGameLoading(false);
    }
  };

  const loadLedger = async (userId) => {
    if (!userId) {
      setLedger(null);
      return;
    }

    try {
      setLedgerBusy(true);

      const response = await gamificationAPI.getXpHistory({
        userId,
        limit: 15,
      });

      setLedger(response.data);
    } catch (error) {
      setLedger(null);

      setToast({
        message:
          error.response?.data?.message ||
          'Unable to load that student ledger',
        type: 'error',
      });
    } finally {
      setLedgerBusy(false);
    }
  };

  // --------------------------------------------------
  // AWARD AND DEDUCT
  // --------------------------------------------------

  const handleAward = async (e) => {
    e.preventDefault();

    if (!awardForm.userId) {
      setToast({
        message: 'Choose a student first',
        type: 'error',
      });

      return;
    }

    const reason = awardForm.reason.trim();

    if (!reason) {
      setToast({
        message: 'Every manual award needs a reason',
        type: 'error',
      });

      return;
    }

    const amount =
      awardForm.amount === '' ? null : Number(awardForm.amount);

    if (amount !== null && !Number.isFinite(amount)) {
      setToast({ message: 'Amount must be a number', type: 'error' });

      return;
    }

    if (
      awardForm.type === 'manual_adjustment' &&
      (!amount || amount === 0)
    ) {
      setToast({
        message:
          'A manual adjustment needs a non-zero amount — negative to deduct',
        type: 'error',
      });

      return;
    }

    const payload = {
      userId: awardForm.userId,
      type: awardForm.type,
      reason,
    };

    if (amount !== null) payload.amount = amount;

    try {
      setAwardBusy(true);

      const response = await gamificationAPI.award(payload);

      setAwardResult(response.data);
      setAwardForm((prev) => ({
        ...prev,
        amount: '',
        reason: '',
      }));

      setToast({
        message: response.data.message,
        type: 'success',
      });

      await Promise.all([
        loadLedger(awardForm.userId),
        fetchGamification(),
      ]);
    } catch (error) {
      const data = error.response?.data;

      // A 409 means the award already exists, which the admin needs to see
      // rather than read as a plain failure.
      if (data?.skipped) setAwardResult(data);

      setToast({
        message: data?.message || 'Unable to award points',
        type: 'error',
      });
    } finally {
      setAwardBusy(false);
    }
  };

  const handleReverse = async (entry) => {
    try {
      const response = await gamificationAPI.reverseAward(
        entry._id,
        'Reversed from the admin panel'
      );

      setToast({
        message: response.data.message,
        type: 'success',
      });

      await Promise.all([
        loadLedger(awardForm.userId),
        fetchGamification(),
      ]);
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message ||
          'Unable to reverse that entry',
        type: 'error',
      });
    }
  };

  const requestReverse = (entry) => {
    setPendingAction({
      title: 'Reverse this XP entry?',
      message:
        'A reversing entry is written against the same student, so their total ' +
        'and rank are recalculated immediately. The original entry stays in the ' +
        'ledger as the audit trail.',
      confirmLabel: 'Reverse entry',
      run: () => handleReverse(entry),
    });
  };

  // --------------------------------------------------
  // BADGE MANAGEMENT
  // --------------------------------------------------

  const handleBadgeCreate = async (e) => {
    e.preventDefault();

    try {
      await gamificationAPI.createAchievement({
        ...badgeForm,
        threshold: Number(badgeForm.threshold),
        xpBonus: Number(badgeForm.xpBonus || 0),
      });

      setToast({
        message: 'Badge created',
        type: 'success',
      });

      setShowBadgeForm(false);
      setBadgeEdits({});
      await fetchGamification();
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message || 'Unable to create the badge',
        type: 'error',
      });
    }
  };

  const handleBadgeSave = async (badge) => {
    const edits = badgeEdits[badge.id];

    if (!edits) return;

    try {
      await gamificationAPI.updateAchievement(badge.id, edits);

      setToast({
        message: `${badge.title} updated`,
        type: 'success',
      });

      setBadgeEdits((prev) => {
        const next = { ...prev };
        delete next[badge.id];

        return next;
      });

      await fetchGamification();
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message ||
          'Unable to update that badge',
        type: 'error',
      });
    }
  };

  const editBadge = (id, patch) => {
    setBadgeEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), ...patch },
    }));
  };

  // --------------------------------------------------
  // MAINTENANCE AND REPORTS
  // --------------------------------------------------

  const handleRecompute = async () => {
    try {
      setRecomputeBusy(true);

      const response = await gamificationAPI.recompute({});

      setLastRecompute(response.data);

      setToast({
        message: response.data.message,
        type: 'success',
      });

      await fetchGamification();
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message || 'Recompute failed',
        type: 'error',
      });
    } finally {
      setRecomputeBusy(false);
    }
  };

  const handleExport = async () => {
    try {
      setReportBusy(true);

      const response = await gamificationAPI.exportCsv({
        scope: reportForm.scope,
        period: reportForm.period,
        ...(reportForm.semester
          ? { semester: reportForm.semester }
          : {}),
      });

      const url = URL.createObjectURL(
        new Blob([response.data], { type: 'text/csv' })
      );

      const link = document.createElement('a');

      link.href = url;
      link.download = `${reportForm.scope}-leaderboard-${reportForm.period}.csv`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      setToast({
        message: 'Report downloaded',
        type: 'success',
      });
    } catch (error) {
      setToast({
        message: await blobErrorMessage(
          error,
          'Unable to export the report'
        ),
        type: 'error',
      });
    } finally {
      setReportBusy(false);
    }
  };

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  const formatDate = (date) => {
    if (!date) return 'Not available';

    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusClasses = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';

      case 'ongoing':
        return 'bg-amber-50 text-amber-700 border-amber-200';

      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';

      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  // --------------------------------------------------
  // STATISTICS
  // --------------------------------------------------

  const totalUsers = users.length;
  const totalClubs = clubs.length;
  const totalEvents = events.length;
  const totalAdmins = users.filter(
    (user) => user.role === 'admin'
  ).length;

  const upcomingEvents = events.filter(
    (event) => getEventStatus(event) === 'upcoming'
  );

  const completedEvents = events.filter(
    (event) => getEventStatus(event) === 'completed'
  );

  const ongoingEvents = events.filter(
    (event) => getEventStatus(event) === 'ongoing'
  );

  const totalRegistrations = events.reduce(
    (total, event) =>
      total + (event.registeredStudents?.length || 0),
    0
  );

  // --------------------------------------------------
  // SEARCH
  // --------------------------------------------------

  const filteredUsers = useMemo(() => {
    const value = search.toLowerCase().trim();

    if (!value) return users;

    return users.filter(
      (user) =>
        user.name?.toLowerCase().includes(value) ||
        user.email?.toLowerCase().includes(value) ||
        user.role?.toLowerCase().includes(value)
    );
  }, [users, search]);

  const filteredClubs = useMemo(() => {
    const value = search.toLowerCase().trim();

    if (!value) return clubs;

    return clubs.filter(
      (club) =>
        club.clubName?.toLowerCase().includes(value) ||
        club.description?.toLowerCase().includes(value) ||
        club.category?.toLowerCase().includes(value)
    );
  }, [clubs, search]);

  const filteredEvents = useMemo(() => {
    const value = search.toLowerCase().trim();

    if (!value) return events;

    return events.filter(
      (event) =>
        event.title?.toLowerCase().includes(value) ||
        event.description?.toLowerCase().includes(value) ||
        event.location?.toLowerCase().includes(value) ||
        event.club?.clubName?.toLowerCase().includes(value)
    );
  }, [events, search]);

  // --------------------------------------------------
  // GAMIFICATION DERIVED
  // --------------------------------------------------

  const studentOptions = useMemo(
    () =>
      users
        .filter((user) => ADMIN_ROLES.includes(user.role))
        .sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [users]
  );

  const nameFor = useMemo(() => {
    const byId = new Map(
      users.map((user) => [String(user._id), user.name])
    );

    return (id) => byId.get(String(id)) || '—';
  }, [users]);

  const studentMatches = useMemo(() => {
    const value = studentQuery.toLowerCase().trim();

    if (!value) return [];

    return studentOptions
      .filter(
        (student) =>
          student.name?.toLowerCase().includes(value) ||
          student.studentId?.toLowerCase().includes(value) ||
          student.department?.toLowerCase().includes(value)
      )
      .slice(0, 6);
  }, [studentQuery, studentOptions]);

  const pickedStudent =
    studentOptions.find(
      (student) => student._id === awardForm.userId
    ) || null;

  const xpRates = useMemo(
    () =>
      Object.fromEntries(
        (game?.rules?.xpRules || []).map((rule) => [
          rule.type,
          rule.points,
        ])
      ),
    [game]
  );

  // Each integrity finding reports a different shape, so the columns are
  // declared per finding instead of dumping raw ids into the panel.
  const findingColumns = useMemo(
    () => ({
      xp_rate_mismatch: [
        {
          header: 'Activity',
          value: (row) => XP_TYPE_LABELS[row.type] || row.type,
        },
        { header: 'Entries', value: (row) => row.rows },
        { header: 'Average XP', value: (row) => row.averageXp },
        { header: 'Published XP', value: (row) => row.expectedXp },
      ],
      unsettled_attendance: [
        {
          header: 'Student',
          value: (row) => row.studentName || nameFor(row.userId),
        },
        { header: 'Method', value: (row) => row.method },
        { header: 'Checked in', value: (row) => formatDate(row.checkedInAt) },
      ],
      duplicate_awards: [
        { header: 'Student', value: (row) => nameFor(row.userId) },
        {
          header: 'Activity',
          value: (row) => XP_TYPE_LABELS[row.type] || row.type,
        },
        { header: 'Awards', value: (row) => row.awards },
        { header: 'XP paid', value: (row) => row.xp },
      ],
      off_window_checkin: [
        { header: 'Event', value: (row) => row.eventTitle },
        {
          header: 'Issue',
          value: (row) =>
            row.issue === 'before_start' ? 'Before start' : 'After end',
        },
        { header: 'Hours off', value: (row) => row.hoursOff },
        { header: 'Method', value: (row) => row.method },
      ],
      manual_award_burst: [
        { header: 'Admin', value: (row) => row.name || nameFor(row.adminId) },
        { header: 'Adjustments', value: (row) => row.awards },
        { header: 'Net XP', value: (row) => row.netXp },
        {
          header: 'Students touched',
          value: (row) => row.studentsTouched,
        },
      ],
      negative_total_xp: [
        { header: 'Student', value: (row) => nameFor(row._id) },
        { header: 'Lifetime XP', value: (row) => row.totalXp },
      ],
    }),
    [nameFor]
  );

  // --------------------------------------------------
  // DELETE CLUB
  // --------------------------------------------------

  const handleDeleteClub = async (clubId) => {
    try {
      await clubAPI.deleteClub(clubId);

      setToast({
        message: 'Club deleted successfully',
        type: 'success',
      });

      await fetchAdminData(false);
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message ||
          'Error deleting club',
        type: 'error',
      });
    }
  };

  const requestDeleteClub = (club) => {
    setPendingAction({
      title: `Delete ${club.clubName}?`,
      message:
        'This removes the club and its membership list. Clubs with events must have those events deleted first.',
      confirmLabel: 'Delete club',
      run: () => handleDeleteClub(club._id)
    });
  };

  // --------------------------------------------------
  // DELETE EVENT
  // --------------------------------------------------

  const handleDeleteEvent = async (eventId) => {
    try {
      await eventAPI.deleteEvent(eventId);

      setToast({
        message: 'Event deleted successfully',
        type: 'success',
      });

      await fetchAdminData(false);
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message ||
          'Error deleting event',
        type: 'error',
      });
    }
  };

  // --------------------------------------------------
  // CANCEL OR REOPEN AN EVENT
  // The backend turns the transition into a campus-wide notification, so the
  // admin does not have to message anyone separately.
  // --------------------------------------------------

  const requestCancelEvent = (event) => {
    const cancelling = getEventStatus(event) !== 'cancelled';

    setPendingAction({
      title: cancelling
        ? `Cancel ${event.title}?`
        : `Reopen ${event.title}?`,
      message: cancelling
        ? 'Every student is told the event is off. Registrations are kept, so it can be reopened if plans change.'
        : 'The event goes back on the schedule using its own dates, and students are told it is running again.',
      confirmLabel: cancelling ? 'Cancel event' : 'Reopen event',
      run: async () => {
        try {
          await eventAPI.updateEvent(event._id, {
            status: cancelling ? 'cancelled' : 'upcoming'
          });

          setToast({
            message: cancelling
              ? 'Event cancelled and announced'
              : 'Event reopened',
            type: 'success',
          });

          await fetchAdminData(false);
        } catch (error) {
          setToast({
            message:
              error.response?.data?.message || 'Unable to update the event',
            type: 'error',
          });
        }
      }
    });
  };

  const requestDeleteEvent = (event) => {
    setPendingAction({
      title: `Delete ${event.title}?`,
      message:
        'This removes the event, its registrations and the certificates issued for it. This cannot be undone.',
      confirmLabel: 'Delete event',
      run: () => handleDeleteEvent(event._id)
    });
  };

  // --------------------------------------------------
  // CREATE CLUB
  // --------------------------------------------------

  const handleCreateClub = async (e) => {
    e.preventDefault();

    if (!newClub.clubName.trim() || !newClub.description.trim()) {
      setToast({
        message: 'Please enter the club name and description',
        type: 'error',
      });
      return;
    }

    try {
      await clubAPI.createClub(newClub);

      setToast({
        message: 'Club created successfully',
        type: 'success',
      });

      setNewClub({
        clubName: '',
        description: '',
      });

      setShowClubForm(false);

      await fetchAdminData(false);
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message ||
          'Error creating club',
        type: 'error',
      });
    }
  };

  // --------------------------------------------------
  // CREATE EVENT
  // --------------------------------------------------

  const handleCreateEvent = async (e) => {
    e.preventDefault();

    if (
      !newEvent.title.trim() ||
      !newEvent.description.trim() ||
      !newEvent.date ||
      !newEvent.endDate ||
      !newEvent.club
    ) {
      setToast({
        message:
          'Please fill in all required event fields',
        type: 'error',
      });
      return;
    }

    if (new Date(newEvent.endDate) <= new Date(newEvent.date)) {
      setToast({
        message: 'The end time must be after the start time',
        type: 'error',
      });
      return;
    }

    try {
      await eventAPI.createEvent(withInstantTimes(newEvent));

      setToast({
        message: 'Event created successfully',
        type: 'success',
      });

      setNewEvent({
        title: '',
        description: '',
        date: '',
        endDate: '',
        location: '',
        club: '',
        capacity: 100,
        category: 'General',
      });

      setShowEventForm(false);

      await fetchAdminData(false);
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message ||
          'Error creating event',
        type: 'error',
      });
    }
  };

  // --------------------------------------------------
  // CREATE NOTIFICATION
  // --------------------------------------------------

  const handleCreateNotification = async (e) => {
    e.preventDefault();

    if (
      !newNotification.title.trim() ||
      !newNotification.message.trim()
    ) {
      setToast({
        message:
          'Please enter notification title and message',
        type: 'error',
      });
      return;
    }

    try {
      await notificationAPI.createNotification(
        newNotification
      );

      setToast({
        message: 'Notification sent successfully',
        type: 'success',
      });

      setNewNotification({
        title: '',
        message: '',
        type: 'info',
      });

      await fetchAdminData(false);
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message ||
          'Error creating notification',
        type: 'error',
      });
    }
  };

  // --------------------------------------------------
  // DASHBOARD DATA
  // --------------------------------------------------

  const recentUsers = [...users]
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0) -
        new Date(a.createdAt || 0)
    )
    .slice(0, 5);

  const recentEvents = [...events]
    .sort(
      (a, b) =>
        new Date(b.date || 0) -
        new Date(a.date || 0)
    )
    .slice(0, 5);

  const tabs = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Activity,
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users,
    },
    {
      id: 'clubs',
      label: 'Clubs',
      icon: Briefcase,
    },
    {
      id: 'events',
      label: 'Events',
      icon: Calendar,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
    },
    {
      id: 'gamification',
      label: 'Gamification',
      icon: Trophy,
    },
  ];

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <LoadingScreen message="Loading admin dashboard..." />
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="app-page min-h-screen">
      <Navbar />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <main className="page-section pt-8 pb-16">
        <div className="page-container">

          {/* ==================================================
              HEADER
          ================================================== */}

          <section className="mb-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white">
                    <Shield size={18} />
                  </span>

                  <span className="eyebrow">
                    Administration
                  </span>
                </div>

                <h1 className="display-title text-4xl sm:text-5xl">
                  Admin Dashboard
                </h1>

                <p className="section-copy mt-3 max-w-2xl">
                  Manage your campus clubs, events, users,
                  registrations, and notifications from one
                  central dashboard.
                </p>
              </div>

              <button
                type="button"
                onClick={() => fetchAdminData(false)}
                disabled={refreshing}
                className="btn-secondary self-start lg:self-auto"
              >
                <RefreshCw
                  size={17}
                  className={
                    refreshing ? 'animate-spin' : ''
                  }
                />
                Refresh
              </button>

            </div>
          </section>

          {/* ==================================================
              NAVIGATION
          ================================================== */}

          <div className="mb-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="flex min-w-max gap-1">

              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSearch('');
                    }}
                    className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition ${
                      active
                        ? 'bg-black text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-black'
                    }`}
                  >
                    <Icon size={17} />
                    {tab.label}
                  </button>
                );
              })}

            </div>
          </div>

          {/* ==================================================
              DASHBOARD
          ================================================== */}

          {activeTab === 'dashboard' && (
            <div className="space-y-8">

              {/* Statistics */}

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                <article className="metric-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Total Users
                      </p>

                      <p className="mt-3 text-4xl font-black text-black">
                        {totalUsers}
                      </p>

                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        Registered accounts
                      </p>
                    </div>

                    <span className="icon-tile">
                      <Users size={21} />
                    </span>
                  </div>
                </article>

                <article className="metric-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Total Clubs
                      </p>

                      <p className="mt-3 text-4xl font-black text-black">
                        {totalClubs}
                      </p>

                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        Active campus clubs
                      </p>
                    </div>

                    <span className="icon-tile">
                      <Briefcase size={21} />
                    </span>
                  </div>
                </article>

                <article className="metric-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Total Events
                      </p>

                      <p className="mt-3 text-4xl font-black text-black">
                        {totalEvents}
                      </p>

                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        {upcomingEvents.length} upcoming
                      </p>
                    </div>

                    <span className="icon-tile">
                      <Calendar size={21} />
                    </span>
                  </div>
                </article>

                <article className="metric-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Registrations
                      </p>

                      <p className="mt-3 text-4xl font-black text-black">
                        {totalRegistrations}
                      </p>

                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        Across all events
                      </p>
                    </div>

                    <span className="icon-tile">
                      <CheckCircle2 size={21} />
                    </span>
                  </div>
                </article>

              </div>

              {/* Event Summary */}

              <div className="grid gap-5 sm:grid-cols-3">

                <div className="app-card">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Clock size={19} />
                    </span>

                    <div>
                      <p className="text-sm font-bold text-slate-500">
                        Upcoming
                      </p>

                      <p className="text-2xl font-black text-black">
                        {upcomingEvents.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="app-card">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                      <Activity size={19} />
                    </span>

                    <div>
                      <p className="text-sm font-bold text-slate-500">
                        Ongoing
                      </p>

                      <p className="text-2xl font-black text-black">
                        {ongoingEvents.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="app-card">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <CheckCircle2 size={19} />
                    </span>

                    <div>
                      <p className="text-sm font-bold text-slate-500">
                        Completed
                      </p>

                      <p className="text-2xl font-black text-black">
                        {completedEvents.length}
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              <AnalyticsCharts
                users={users}
                clubs={clubs}
                events={events}
              />

              {/* Recent Users + Recent Events */}

              <div className="grid gap-6 lg:grid-cols-2">

                {/* Recent Users */}

                <section className="app-card">

                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black text-black">
                        Recent Users
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Recently registered accounts
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('users')}
                      className="btn-secondary px-3"
                    >
                      View all
                      <ChevronRight size={15} />
                    </button>
                  </div>

                  <div className="space-y-3">

                    {recentUsers.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                        No users available.
                      </div>
                    ) : (
                      recentUsers.map((user) => (
                        <div
                          key={user._id}
                          className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-3 transition hover:bg-slate-50"
                        >
                          <div className="flex min-w-0 items-center gap-3">

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white">
                              {user.name
                                ?.charAt(0)
                                ?.toUpperCase() || 'U'}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-black">
                                {user.name}
                              </p>

                              <p className="truncate text-xs text-slate-500">
                                {user.email}
                              </p>
                            </div>
                          </div>

                          <span className="chip capitalize">
                            {user.role}
                          </span>
                        </div>
                      ))
                    )}

                  </div>
                </section>

                {/* Recent Events */}

                <section className="app-card">

                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black text-black">
                        Recent Events
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Latest campus activities
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('events')}
                      className="btn-secondary px-3"
                    >
                      View all
                      <ChevronRight size={15} />
                    </button>
                  </div>

                  <div className="space-y-3">

                    {recentEvents.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                        No events available.
                      </div>
                    ) : (
                      recentEvents.map((event) => {
                        const status = getEventStatus(event);

                        return (
                          <div
                            key={event._id}
                            className="rounded-xl border border-slate-100 p-4 transition hover:bg-slate-50"
                          >
                            <div className="flex items-start justify-between gap-3">

                              <div className="min-w-0">
                                <p className="truncate font-black text-black">
                                  {event.title}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {formatDate(event.date)}
                                </p>
                              </div>

                              <span
                                className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold capitalize ${getStatusClasses(
                                  status
                                )}`}
                              >
                                {status}
                              </span>

                            </div>
                          </div>
                        );
                      })
                    )}

                  </div>
                </section>

              </div>

            </div>
          )}

          {/* ==================================================
              USERS
          ================================================== */}

          {activeTab === 'users' && (
            <section className="space-y-5">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <h2 className="text-2xl font-black text-black">
                    Users
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    View all registered campus users and issue temporary
                    passwords.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">

                  <div className="relative w-full sm:w-72">
                    <Search
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="text"
                      value={search}
                      onChange={(e) =>
                        setSearch(e.target.value)
                      }
                      placeholder="Search users..."
                      className="field w-full pl-10"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setShowAccountForm((prev) => !prev)
                    }
                    className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <UserPlus size={17} />

                    {showAccountForm
                      ? 'Close form'
                      : 'Create account'}
                  </button>

                </div>

              </div>

              {/* --------------------------------------------------
                  ONE-TIME CREDENTIAL
                  The password exists in this browser only until the card is
                  dismissed: the server keeps just the bcrypt hash.
              -------------------------------------------------- */}

              {issuedCredential && (
                <div className="app-card border-[#bcddeb]">

                  <div className="flex items-start justify-between gap-4">

                    <div className="min-w-0">
                      <p className="eyebrow mb-2">
                        Temporary password
                      </p>

                      <h3 className="truncate text-xl font-black text-black">
                        {issuedCredential.name}
                      </h3>

                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="text-sm text-slate-600">
                          {issuedCredential.email}
                        </p>

                        <span className="chip capitalize">
                          {issuedCredential.role?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIssuedCredential(null)}
                      aria-label="Dismiss temporary password"
                      className="shrink-0 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-black"
                    >
                      <X size={18} />
                    </button>

                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-stretch">

                    <input
                      readOnly
                      value={issuedCredential.temporaryPassword}
                      onFocus={(e) => e.target.select()}
                      aria-label="Temporary password"
                      className="field flex-1 font-mono text-base font-bold tracking-wider"
                    />

                    <button
                      type="button"
                      onClick={copyTemporaryPassword}
                      className="btn-secondary flex items-center justify-center gap-2 whitespace-nowrap sm:px-6"
                    >
                      {copied ? <Check size={17} /> : <Copy size={17} />}

                      {copied ? 'Copied' : 'Copy password'}
                    </button>

                  </div>

                  <div className="mt-4 space-y-2.5 text-xs leading-5 text-slate-600">
                    <p className="flex items-start gap-2.5">
                      <KeyRound size={15} className="mt-0.5 shrink-0" />

                      <span className="flex-1 font-semibold text-[#145f82]">
                        This is the only time it is shown. Only an encrypted
                        copy is stored, and it stops working once the student
                        sets their own password.
                      </span>
                    </p>

                    <p className="flex items-start gap-2.5">
                      <Clock size={15} className="mt-0.5 shrink-0" />

                      <span className="flex-1">
                        {issuedCredential.expiresAt
                          ? `Expires ${new Date(
                              issuedCredential.expiresAt
                            ).toLocaleString()}.`
                          : 'No expiry recorded for this password.'}
                      </span>
                    </p>

                    <p className="flex items-start gap-2.5">
                      <AlertTriangle size={15} className="mt-0.5 shrink-0" />

                      <span className="flex-1">
                        Share it over a channel you trust with that person -
                        not in a public group. They must change it at first
                        login before any dashboard opens.
                      </span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIssuedCredential(null)}
                    className="btn-primary mt-5 w-full sm:w-auto"
                  >
                    I have shared it
                  </button>

                </div>
              )}

              {/* --------------------------------------------------
                  CREATE ACCOUNT
              -------------------------------------------------- */}

              {showAccountForm && (
                <form
                  onSubmit={handleCreateAccount}
                  className="app-card"
                >

                  <div className="mb-5">
                    <h3 className="text-xl font-black text-black">
                      New account
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      A temporary password is generated for the person to sign
                      in with. They choose their own before seeing anything
                      else.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">

                    <div>
                      <label className="field-label">
                        Full name *
                      </label>

                      <input
                        type="text"
                        value={newAccount.name}
                        onChange={updateNewAccount('name')}
                        className="field"
                        placeholder="As it appears on the register"
                        autoComplete="off"
                      />
                    </div>

                    <div>
                      <label className="field-label">
                        College email *
                      </label>

                      <input
                        type="email"
                        value={newAccount.email}
                        onChange={updateNewAccount('email')}
                        className="field"
                        placeholder="name@college.edu"
                        autoComplete="off"
                      />
                    </div>

                    <div>
                      <label className="field-label">
                        Role *
                      </label>

                      <select
                        value={newAccount.role}
                        onChange={updateNewAccount('role')}
                        className="field"
                      >
                        {ACCOUNT_ROLES.map((option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>

                      <p className="mt-2 text-xs text-slate-500">
                        Creating an administrator is recorded in the audit log.
                      </p>
                    </div>

                    <div>
                      <label className="field-label">
                        Student or staff id
                      </label>

                      <input
                        type="text"
                        value={newAccount.studentId}
                        onChange={updateNewAccount('studentId')}
                        className="field"
                        placeholder="Optional"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="field-label">
                        Department
                      </label>

                      <input
                        type="text"
                        value={newAccount.department}
                        onChange={updateNewAccount('department')}
                        className="field"
                        placeholder="Optional - used by the leaderboard filters"
                      />
                    </div>

                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    <p className="text-xs text-slate-500">
                      You will not choose their password here - the system
                      generates one and shows it once.
                    </p>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowAccountForm(false)}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={accountBusy}
                        className="btn-primary flex items-center gap-2"
                      >
                        {accountBusy && (
                          <RefreshCw
                            size={16}
                            className="animate-spin"
                          />
                        )}

                        {accountBusy
                          ? 'Creating...'
                          : 'Create and show password'}
                      </button>
                    </div>

                  </div>

                </form>
              )}

              <div className="table-shell overflow-x-auto">

                <table className="w-full min-w-[1000px]">

                  <thead className="table-head">
                    <tr>
                      <th className="table-cell text-left">
                        User
                      </th>

                      <th className="table-cell text-left">
                        Role
                      </th>

                      <th className="table-cell text-left">
                        Clubs
                      </th>

                      <th className="table-cell text-left">
                        Events
                      </th>

                      <th className="table-cell text-left">
                        Joined
                      </th>

                      <th className="table-cell text-left">
                        Password setup
                      </th>

                      <th className="table-cell text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td
                          colSpan="7"
                          className="p-12 text-center text-sm text-slate-500"
                        >
                          No users found.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => {
                        const status = credentialStatus(user);

                        const isSelf =
                          currentAdminId &&
                          String(user._id) === String(currentAdminId);

                        return (
                        <tr
                          key={user._id}
                          className="transition hover:bg-slate-50"
                        >

                          <td className="table-cell">
                            <div className="flex items-center gap-3">

                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white">
                                {user.name
                                  ?.charAt(0)
                                  ?.toUpperCase() || 'U'}
                              </div>

                              <div>
                                <p className="font-bold text-black">
                                  {user.name}
                                </p>

                                <p className="text-xs text-slate-500">
                                  {user.email}
                                </p>
                              </div>

                            </div>
                          </td>

                          <td className="table-cell">
                            <span className="chip capitalize">
                              {user.role}
                            </span>
                          </td>

                          <td className="table-cell font-bold">
                            {user.joinedClubs?.length || 0}
                          </td>

                          <td className="table-cell font-bold">
                            {user.registeredEvents?.length || 0}
                          </td>

                          <td className="table-cell text-sm">
                            {user.createdAt
                              ? new Date(
                                  user.createdAt
                                ).toLocaleDateString()
                              : '—'}
                          </td>

                          <td className="table-cell">
                            <span
                              className={`chip inline-flex items-center gap-1.5 border ${status.className}`}
                            >
                              <status.Icon size={13} />

                              {status.label}
                            </span>

                            <p className="mt-1.5 text-xs text-slate-500">
                              {status.detail}
                            </p>
                          </td>

                          <td className="table-cell text-right">
                            {isSelf ? (
                              <span className="text-xs text-slate-500">
                                This is you
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  requestTemporaryReset(user)
                                }
                                disabled={
                                  resetBusyId === user._id
                                }
                                title="Replace this account's password with a new temporary one"
                                className="btn-secondary inline-flex items-center gap-2 px-3 py-2 text-xs disabled:opacity-60"
                              >
                                {resetBusyId === user._id ? (
                                  <RefreshCw
                                    size={14}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <KeyRound size={14} />
                                )}

                                {resetBusyId === user._id
                                  ? 'Issuing...'
                                  : 'New temp password'}
                              </button>
                            )}
                          </td>

                        </tr>
                        );
                      })
                    )}

                  </tbody>
                </table>

              </div>
            </section>
          )}

          {/* ==================================================
              CLUBS
          ================================================== */}

          {activeTab === 'clubs' && (
            <section className="space-y-6">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <h2 className="text-2xl font-black text-black">
                    Club Management
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Create, review, and manage campus clubs.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">

                  <div className="relative">
                    <Search
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="text"
                      value={search}
                      onChange={(e) =>
                        setSearch(e.target.value)
                      }
                      placeholder="Search clubs..."
                      className="field w-full pl-10 sm:w-64"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setShowClubForm((value) => !value)
                    }
                    className="btn-primary"
                  >
                    {showClubForm ? (
                      <X size={17} />
                    ) : (
                      <Plus size={17} />
                    )}

                    {showClubForm
                      ? 'Close'
                      : 'Create club'}
                  </button>

                </div>
              </div>

              {/* Create Club */}

              {showClubForm && (
                <form
                  onSubmit={handleCreateClub}
                  className="app-card border border-slate-200"
                >
                  <div className="mb-5">
                    <h3 className="text-xl font-black text-black">
                      Create New Club
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Add a new club to the campus system.
                    </p>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">

                    <div>
                      <label className="field-label">
                        Club name *
                      </label>

                      <input
                        type="text"
                        required
                        value={newClub.clubName}
                        onChange={(e) =>
                          setNewClub({
                            ...newClub,
                            clubName: e.target.value,
                          })
                        }
                        className="field"
                        placeholder="Coding Club"
                      />
                    </div>

                    <div>
                      <label className="field-label">
                        Description *
                      </label>

                      <input
                        type="text"
                        required
                        value={newClub.description}
                        onChange={(e) =>
                          setNewClub({
                            ...newClub,
                            description: e.target.value,
                          })
                        }
                        className="field"
                        placeholder="A club for programming enthusiasts"
                      />
                    </div>

                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      className="btn-primary"
                    >
                      <Plus size={17} />
                      Create club
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setShowClubForm(false)
                      }
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Clubs */}

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

                {filteredClubs.length === 0 ? (
                  <div className="app-card col-span-full py-16 text-center">
                    <Briefcase
                      size={34}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-4 font-bold text-slate-500">
                      No clubs found.
                    </p>
                  </div>
                ) : (
                  filteredClubs.map((club) => (
                    <article
                      key={club._id}
                      className="app-card app-card-hover"
                    >

                      <div className="flex items-start justify-between gap-4">

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                          <Briefcase size={20} />
                        </div>

                        <span className="chip">
                          {club.members?.length || 0} members
                        </span>

                      </div>

                      <h3 className="mt-5 text-xl font-black text-black">
                        {club.clubName}
                      </h3>

                      <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-600">
                        {club.description ||
                          'No description available.'}
                      </p>

                      <div className="mt-5 space-y-2 text-sm">

                        <div className="flex items-center gap-2 text-slate-500">
                          <Users size={15} />
                          <span>
                            {club.members?.length || 0}{' '}
                            members
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-500">
                          <Shield size={15} />
                          <span>
                            Admin:{' '}
                            {club.admin?.name ||
                              'Not assigned'}
                          </span>
                        </div>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          requestDeleteClub(club)
                        }
                        className="btn-danger mt-6 w-full"
                      >
                        <Trash2 size={17} />
                        Delete club
                      </button>

                    </article>
                  ))
                )}

              </div>
            </section>
          )}

          {/* ==================================================
              EVENTS
          ================================================== */}

          {activeTab === 'events' && (
            <section className="space-y-6">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <h2 className="text-2xl font-black text-black">
                    Event Management
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Create and manage all campus events.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">

                  <div className="relative">
                    <Search
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="text"
                      value={search}
                      onChange={(e) =>
                        setSearch(e.target.value)
                      }
                      placeholder="Search events..."
                      className="field w-full pl-10 sm:w-64"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setShowEventForm((value) => !value)
                    }
                    className="btn-primary"
                  >
                    {showEventForm ? (
                      <X size={17} />
                    ) : (
                      <Plus size={17} />
                    )}

                    {showEventForm
                      ? 'Close'
                      : 'Create event'}
                  </button>

                </div>
              </div>

              {/* Create Event */}

              {showEventForm && (
                <form
                  onSubmit={handleCreateEvent}
                  className="app-card border border-slate-200"
                >
                  <div className="mb-5">
                    <h3 className="text-xl font-black text-black">
                      Create New Event
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Add an event to the campus calendar.
                    </p>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">

                    <div>
                      <label className="field-label">
                        Event title *
                      </label>

                      <input
                        type="text"
                        required
                        value={newEvent.title}
                        onChange={(e) =>
                          setNewEvent({
                            ...newEvent,
                            title: e.target.value,
                          })
                        }
                        className="field"
                        placeholder="Tech Workshop"
                      />
                    </div>

                    <div>
                      <label className="field-label">
                        Club *
                      </label>

                      <select
                        required
                        value={newEvent.club}
                        onChange={(e) =>
                          setNewEvent({
                            ...newEvent,
                            club: e.target.value,
                          })
                        }
                        className="field"
                      >
                        <option value="">
                          Select a club
                        </option>

                        {clubs.map((club) => (
                          <option
                            key={club._id}
                            value={club._id}
                          >
                            {club.clubName}
                          </option>
                        ))}
                      </select>
                    </div>

                  </div>

                  <div className="mt-5">
                    <label className="field-label">
                      Description *
                    </label>

                    <textarea
                      required
                      value={newEvent.description}
                      onChange={(e) =>
                        setNewEvent({
                          ...newEvent,
                          description: e.target.value,
                        })
                      }
                      className="field min-h-28"
                      placeholder="Describe the event..."
                    />
                  </div>

                  <div className="mt-5 grid gap-5 md:grid-cols-3">

                    <div>
                      <label className="field-label">
                        Start date &amp; time *
                      </label>

                      <input
                        type="datetime-local"
                        required
                        value={newEvent.date}
                        onChange={(e) =>
                          setNewEvent({
                            ...newEvent,
                            date: e.target.value,
                          })
                        }
                        className="field"
                      />
                    </div>

                    <div>
                      <label className="field-label">
                        End date &amp; time *
                      </label>

                      <input
                        type="datetime-local"
                        required
                        value={newEvent.endDate}
                        min={newEvent.date}
                        onChange={(e) =>
                          setNewEvent({
                            ...newEvent,
                            endDate: e.target.value,
                          })
                        }
                        className="field"
                      />
                    </div>

                    <div>
                      <label className="field-label">
                        Location
                      </label>

                      <input
                        type="text"
                        value={newEvent.location}
                        onChange={(e) =>
                          setNewEvent({
                            ...newEvent,
                            location: e.target.value,
                          })
                        }
                        className="field"
                        placeholder="Main Auditorium"
                      />
                    </div>

                    <div>
                      <label className="field-label">
                        Capacity
                      </label>

                      <input
                        type="number"
                        min="1"
                        value={newEvent.capacity}
                        onChange={(e) =>
                          setNewEvent({
                            ...newEvent,
                            capacity: Number(
                              e.target.value
                            ),
                          })
                        }
                        className="field"
                      />
                    </div>

                    <div>
                      <label className="field-label">
                        Category
                      </label>

                      <input
                        type="text"
                        value={newEvent.category}
                        onChange={(e) =>
                          setNewEvent({
                            ...newEvent,
                            category: e.target.value,
                          })
                        }
                        className="field"
                        placeholder="Technical"
                      />
                    </div>

                    <div>
                      <label className="field-label">
                        Activity type
                      </label>

                      <select
                        value={newEvent.activityType}
                        onChange={(e) =>
                          setNewEvent({
                            ...newEvent,
                            activityType: e.target.value,
                          })
                        }
                        className="field"
                      >
                        {ACTIVITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {`${option.label} — ${option.xp} XP per verified attendee`}
                          </option>
                        ))}
                      </select>

                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Decides which XP a verified check-in pays.
                      </p>
                    </div>

                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      className="btn-primary"
                    >
                      <Plus size={17} />
                      Create event
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setShowEventForm(false)
                      }
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Events */}

              <div className="table-shell overflow-x-auto">

                <table className="w-full min-w-[1000px]">

                  <thead className="table-head">
                    <tr>
                      <th className="table-cell text-left">
                        Event
                      </th>

                      <th className="table-cell text-left">
                        Date
                      </th>

                      <th className="table-cell text-left">
                        Location
                      </th>

                      <th className="table-cell text-left">
                        Registrations
                      </th>

                      <th className="table-cell text-left">
                        Status
                      </th>

                      <th className="table-cell text-right">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {filteredEvents.length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="p-12 text-center text-sm text-slate-500"
                        >
                          No events found.
                        </td>
                      </tr>
                    ) : (
                      filteredEvents.map((event) => {
                        const status =
                          getEventStatus(event);

                        const registrations =
                          event.registeredStudents
                            ?.length || 0;

                        return (
                          <tr
                            key={event._id}
                            className="transition hover:bg-slate-50"
                          >

                            <td className="table-cell">
                              <div>
                                <p className="font-black text-black">
                                  {event.title}
                                </p>

                                <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                                  {event.description}
                                </p>
                              </div>
                            </td>

                            <td className="table-cell">
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar
                                  size={15}
                                  className="text-slate-400"
                                />
                                {formatDate(event.date)}
                              </div>
                            </td>

                            <td className="table-cell">
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin
                                  size={15}
                                  className="text-slate-400"
                                />
                                {event.location ||
                                  'TBD'}
                              </div>
                            </td>

                            <td className="table-cell font-bold">
                              {registrations} /{' '}
                              {event.capacity}
                            </td>

                            <td className="table-cell">
                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${getStatusClasses(
                                  status
                                )}`}
                              >
                                {status}
                              </span>
                            </td>

                            <td className="table-cell">
                              <div className="flex justify-end gap-2">

                                <button
                                  type="button"
                                  onClick={() =>
                                    requestCancelEvent(event)
                                  }
                                  className="btn-soft px-3"
                                  aria-label={
                                    status === 'cancelled'
                                      ? `Reopen ${event.title}`
                                      : `Cancel ${event.title}`
                                  }
                                >
                                  <Ban size={16} />
                                  {status === 'cancelled'
                                    ? 'Reopen'
                                    : 'Cancel'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    requestDeleteEvent(
                                      event
                                    )
                                  }
                                  className="btn-danger px-3"
                                  aria-label={`Delete ${event.title}`}
                                >
                                  <Trash2 size={16} />
                                </button>

                              </div>
                            </td>

                          </tr>
                        );
                      })
                    )}

                  </tbody>
                </table>

              </div>
            </section>
          )}

          {/* ==================================================
              NOTIFICATIONS
          ================================================== */}

          {activeTab === 'notifications' && (
            <section className="space-y-6">

              <div>
                <h2 className="text-2xl font-black text-black">
                  Notifications
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Send announcements and updates to users.
                </p>
              </div>

              <div className="grid gap-6 lg:grid-cols-[420px_1fr]">

                {/* Create notification */}

                <div className="app-card h-fit">

                  <div className="mb-6 flex items-center gap-3">

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <Bell size={20} />
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-black">
                        New Notification
                      </h3>

                      <p className="text-xs text-slate-500">
                        Broadcast an announcement
                      </p>
                    </div>

                  </div>

                  <form
                    onSubmit={handleCreateNotification}
                    className="space-y-5"
                  >

                    <div>
                      <label className="field-label">
                        Title
                      </label>

                      <input
                        type="text"
                        required
                        value={newNotification.title}
                        onChange={(e) =>
                          setNewNotification({
                            ...newNotification,
                            title: e.target.value,
                          })
                        }
                        className="field"
                        placeholder="Important announcement"
                      />
                    </div>

                    <div>
                      <label className="field-label">
                        Type
                      </label>

                      <select
                        value={newNotification.type}
                        onChange={(e) =>
                          setNewNotification({
                            ...newNotification,
                            type: e.target.value,
                          })
                        }
                        className="field"
                      >
                        <option value="info">
                          Information
                        </option>

                        <option value="alert">
                          Alert
                        </option>

                        <option value="event">
                          Event
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="field-label">
                        Message
                      </label>

                      <textarea
                        required
                        value={newNotification.message}
                        onChange={(e) =>
                          setNewNotification({
                            ...newNotification,
                            message: e.target.value,
                          })
                        }
                        className="field min-h-32 resize-y"
                        placeholder="Write your notification..."
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn-primary w-full"
                    >
                      <Bell size={17} />
                      Send Notification
                    </button>

                  </form>
                </div>

                {/* Notification history */}

                <div>

                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-black text-black">
                        Notification History
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Previously sent notifications
                      </p>
                    </div>

                    <span className="chip">
                      {notifications.length} total
                    </span>
                  </div>

                  <div className="space-y-3">

                    {notifications.length === 0 ? (
                      <div className="app-card py-16 text-center">
                        <Bell
                          size={32}
                          className="mx-auto text-slate-300"
                        />

                        <p className="mt-4 font-bold text-slate-500">
                          No notifications yet.
                        </p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <article
                          key={notification._id}
                          className="app-card transition hover:shadow-md"
                        >

                          <div className="flex gap-4">

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                              <Bell size={18} />
                            </div>

                            <div className="min-w-0 flex-1">

                              <div className="flex flex-wrap items-start justify-between gap-3">

                                <h4 className="font-black text-black">
                                  {notification.title}
                                </h4>

                                <span className="chip capitalize text-xs">
                                  {notification.type ||
                                    'info'}
                                </span>

                              </div>

                              <p className="mt-2 text-sm leading-6 text-slate-600">
                                {notification.message}
                              </p>

                              <p className="mt-3 text-xs font-semibold text-slate-400">
                                {notification.createdAt
                                  ? formatDate(
                                      notification.createdAt
                                    )
                                  : 'Recently'}
                              </p>

                            </div>

                          </div>

                        </article>
                      ))
                    )}

                  </div>
                </div>

              </div>
            </section>
          )}

          {/* ==================================================
              GAMIFICATION
          ================================================== */}

          {activeTab === 'gamification' && (
            <section className="space-y-8">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-black">
                    Gamification
                  </h2>

                  <p className="mt-1 max-w-2xl text-sm text-slate-500">
                    Award or deduct XP with a reason, manage the badge
                    catalog, check the ledger for anomalies, and export
                    leaderboard reports.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchGamification}
                  disabled={gameLoading}
                  className="btn-secondary self-start lg:self-auto"
                >
                  <RefreshCw
                    size={17}
                    className={gameLoading ? 'animate-spin' : ''}
                  />
                  Refresh
                </button>
              </div>

              {!game && (
                <div className="app-card py-16 text-center">
                  <Trophy size={32} className="mx-auto text-slate-300" />

                  <p className="mt-4 font-bold text-slate-500">
                    {gameLoading
                      ? 'Loading gamification data...'
                      : 'Gamification data is not loaded yet.'}
                  </p>

                  {!gameLoading && (
                    <button
                      type="button"
                      onClick={fetchGamification}
                      className="btn-primary mt-5"
                    >
                      Load now
                    </button>
                  )}
                </div>
              )}

              {game && (
                <>

                  {/* ANALYTICS */}

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                    <article className="metric-card">
                      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                        XP issued
                      </p>

                      <p className="mt-2 text-3xl font-black text-black">
                        {(game.analytics?.totalXp || 0).toLocaleString()}
                      </p>
                    </article>

                    <article className="metric-card">
                      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Ledger entries
                      </p>

                      <p className="mt-2 text-3xl font-black text-black">
                        {(
                          game.analytics?.totalTransactions || 0
                        ).toLocaleString()}
                      </p>
                    </article>

                    <article className="metric-card">
                      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Scored students
                      </p>

                      <p className="mt-2 text-3xl font-black text-black">
                        {(
                          game.analytics?.scoredStudents || 0
                        ).toLocaleString()}
                      </p>
                    </article>

                    <article className="metric-card">
                      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Manual adjustments
                      </p>

                      <p className="mt-2 text-3xl font-black text-black">
                        {(game.analytics?.manualAwards || 0).toLocaleString()}
                      </p>
                    </article>

                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">

                    {/* XP BY ACTIVITY */}

                    <div>
                      <h3 className="text-xl font-black text-black">
                        XP by activity
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Lifetime totals per transaction type.
                      </p>

                      <div className="table-shell mt-4 overflow-x-auto">
                        <table className="w-full min-w-[420px]">
                          <thead className="table-head">
                            <tr>
                              <th className="table-cell text-left">
                                Activity
                              </th>
                              <th className="table-cell text-left">
                                Entries
                              </th>
                              <th className="table-cell text-left">
                                XP
                              </th>
                              <th className="table-cell text-left">
                                Published rate
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100">
                            {(game.analytics?.byType || []).map((row) => (
                              <tr key={row.type}>
                                <td className="table-cell font-bold text-black">
                                  {XP_TYPE_LABELS[row.type] || row.type}
                                </td>

                                <td className="table-cell">
                                  {row.count}
                                </td>

                                <td className="table-cell font-bold">
                                  {row.xp.toLocaleString()}
                                </td>

                                <td className="table-cell text-slate-500">
                                  {xpRates[row.type] === undefined
                                    ? '—'
                                    : `${xpRates[row.type]} XP`}
                                </td>
                              </tr>
                            ))}

                            {!(game.analytics?.byType || []).length && (
                              <tr>
                                <td
                                  colSpan="4"
                                  className="p-12 text-center text-sm text-slate-500"
                                >
                                  No XP has been awarded yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* DEPARTMENTS */}

                    <div>
                      <h3 className="text-xl font-black text-black">
                        Most active departments
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Students with a positive lifetime score, grouped by
                        department.
                      </p>

                      <div className="table-shell mt-4 overflow-x-auto">
                        <table className="w-full min-w-[420px]">
                          <thead className="table-head">
                            <tr>
                              <th className="table-cell text-left">
                                Department
                              </th>
                              <th className="table-cell text-left">
                                Students
                              </th>
                              <th className="table-cell text-left">
                                Total XP
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100">
                            {(game.analytics?.byDepartment || []).map(
                              (row) => (
                                <tr key={row.department}>
                                  <td className="table-cell font-bold text-black">
                                    {row.department}
                                  </td>

                                  <td className="table-cell">
                                    {row.students}
                                  </td>

                                  <td className="table-cell font-bold">
                                    {row.xp.toLocaleString()}
                                  </td>
                                </tr>
                              )
                            )}

                            {!(game.analytics?.byDepartment || []).length && (
                              <tr>
                                <td
                                  colSpan="3"
                                  className="p-12 text-center text-sm text-slate-500"
                                >
                                  Nothing to compare yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>

                  {/* AWARD / DEDUCT + LEDGER */}

                  <div className="grid gap-6 lg:grid-cols-[420px_1fr]">

                    <form onSubmit={handleAward} className="app-card h-fit space-y-5">

                      <div className="flex items-center gap-3">

                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                          <Trophy size={20} />
                        </div>

                        <div>
                          <h3 className="text-xl font-black text-black">
                            Award or deduct
                          </h3>

                          <p className="text-xs text-slate-500">
                            Every manual entry needs a reason
                          </p>
                        </div>

                      </div>

                      <div>
                        <label className="field-label">Student</label>

                        {pickedStudent ? (
                          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">

                            <div className="min-w-0">
                              <p className="truncate font-bold text-black">
                                {pickedStudent.name}
                              </p>

                              <p className="text-xs text-slate-500">
                                {
                                  [
                                    pickedStudent.studentId,
                                    pickedStudent.department,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ') || 'Student'
                                }
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setAwardForm((prev) => ({
                                  ...prev,
                                  userId: '',
                                }));
                                setStudentQuery('');
                                setLedger(null);
                              }}
                              className="btn-soft px-3 py-1.5 text-xs"
                            >
                              <X size={14} />
                              Change
                            </button>

                          </div>
                        ) : (
                          <>
                            <input
                              type="text"
                              value={studentQuery}
                              onChange={(e) =>
                                setStudentQuery(e.target.value)
                              }
                              className="field"
                              placeholder="Search name, student ID or department"
                            />

                            <div className="mt-2 space-y-1">
                              {studentMatches.length ? (
                                studentMatches.map((student) => (
                                  <button
                                    key={student._id}
                                    type="button"
                                    onClick={() => {
                                      setAwardForm((prev) => ({
                                        ...prev,
                                        userId: student._id,
                                      }));
                                      setStudentQuery('');
                                      loadLedger(student._id);
                                    }}
                                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:bg-slate-50"
                                  >
                                    <span className="truncate text-sm font-bold text-slate-700">
                                      {student.name}
                                    </span>

                                    <span className="shrink-0 text-xs font-semibold text-slate-400">
                                      {student.department || '—'}
                                    </span>
                                  </button>
                                ))
                              ) : (
                                <p className="text-xs text-slate-500">
                                  {studentQuery.trim()
                                    ? 'No matching student.'
                                    : 'Type a name to choose a student.'}
                                </p>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      <div>
                        <label className="field-label">
                          Activity
                        </label>

                        <select
                          value={awardForm.type}
                          onChange={(e) =>
                            setAwardForm((prev) => ({
                              ...prev,
                              type: e.target.value,
                            }))
                          }
                          className="field"
                        >
                          {(
                            game.rules?.awardTypes || AWARD_TYPE_ORDER
                          ).map((type) => (
                            <option key={type} value={type}>
                              {
                                `${XP_TYPE_LABELS[type] || type}` +
                                  (xpRates[type] === undefined
                                    ? ''
                                    : ` — ${xpRates[type]} XP`)
                              }
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="field-label">
                          Amount
                        </label>

                        <input
                          type="number"
                          value={awardForm.amount}
                          onChange={(e) =>
                            setAwardForm((prev) => ({
                              ...prev,
                              amount: e.target.value,
                            }))
                          }
                          className="field"
                          placeholder={
                            xpRates[awardForm.type]
                              ? `Defaults to ${xpRates[awardForm.type]}`
                              : 'Required, e.g. -40'
                          }
                        />

                        <p className="mt-2 text-xs text-slate-500">
                          Leave empty to pay the published rate. Use a
                          negative number to deduct XP.
                        </p>
                      </div>

                      <div>
                        <label className="field-label">
                          Reason
                        </label>

                        <textarea
                          required
                          value={awardForm.reason}
                          onChange={(e) =>
                            setAwardForm((prev) => ({
                              ...prev,
                              reason: e.target.value,
                            }))
                          }
                          className="field min-h-28 resize-y"
                          placeholder="Judge decision at the winter hackathon"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={awardBusy}
                        className="btn-primary w-full"
                      >
                        <Trophy size={17} />
                        {awardBusy ? 'Saving...' : 'Write to ledger'}
                      </button>

                      {awardResult && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">

                          <p className="font-black text-slate-900">
                            {awardResult.message}
                          </p>

                          {(awardResult.awarded || []).map((row) => (
                            <p
                              key={row.userId}
                              className="mt-1 text-xs text-green-600"
                            >
                              {`+${row.amount} XP — ${row.name}`}
                            </p>
                          ))}

                          {(awardResult.skipped || []).map((row) => (
                            <p
                              key={row.userId}
                              className="mt-1 text-xs text-slate-500"
                            >
                              {`${row.name}: ${row.reason}`}
                            </p>
                          ))}

                        </div>
                      )}

                    </form>

                    {/* LEDGER */}

                    <div>
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-black text-black">
                            Student ledger
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            {pickedStudent
                              ? `${pickedStudent.name} — newest entries first`
                              : 'Choose a student to read their XP history.'}
                          </p>
                        </div>

                        {ledger && (
                          <span className="chip">
                            {ledger.total} entries
                          </span>
                        )}
                      </div>

                      {!pickedStudent ? (
                        <div className="app-card py-16 text-center">
                          <Search
                            size={32}
                            className="mx-auto text-slate-300"
                          />

                          <p className="mt-4 font-bold text-slate-500">
                            No student selected.
                          </p>
                        </div>
                      ) : ledgerBusy ? (
                        <div className="app-card py-16 text-center">
                          <RefreshCw
                            size={28}
                            className="mx-auto animate-spin text-slate-300"
                          />

                          <p className="mt-4 font-bold text-slate-500">
                            Loading ledger...
                          </p>
                        </div>
                      ) : !ledger || !ledger.entries.length ? (
                        <div className="app-card py-16 text-center">
                          <CheckCircle2
                            size={32}
                            className="mx-auto text-slate-300"
                          />

                          <p className="mt-4 font-bold text-slate-500">
                            {pickedStudent.name} has no XP entries yet.
                          </p>
                        </div>
                      ) : (
                        <div className="table-shell overflow-x-auto">
                          <table className="w-full min-w-[760px]">

                            <thead className="table-head">
                              <tr>
                                <th className="table-cell text-left">
                                  Date
                                </th>
                                <th className="table-cell text-left">
                                  Activity
                                </th>
                                <th className="table-cell text-left">
                                  Reason
                                </th>
                                <th className="table-cell text-left">
                                  XP
                                </th>
                                <th className="table-cell text-left">
                                  Source
                                </th>
                                <th className="table-cell text-right">
                                  Action
                                </th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                              {ledger.entries.map((entry) => (
                                <tr key={entry._id}>
                                  <td className="table-cell text-sm whitespace-nowrap">
                                    {formatDate(entry.createdAt)}
                                  </td>

                                  <td className="table-cell text-sm font-bold text-black">
                                    {XP_TYPE_LABELS[entry.type] || entry.type}
                                  </td>

                                  <td className="table-cell text-sm text-slate-600">
                                    {entry.reason || '—'}

                                    {entry.awardedBy?.name && (
                                      <span className="mt-1 block text-xs text-slate-400">
                                        {`by ${entry.awardedBy.name}`}
                                      </span>
                                    )}
                                  </td>

                                  <td
                                    className={`table-cell font-black ${
                                      entry.amount >= 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                    }`}
                                  >
                                    {`${entry.amount >= 0 ? '+' : ''}${entry.amount}`}
                                  </td>

                                  <td className="table-cell">
                                    <span className="chip capitalize text-xs">
                                      {entry.source || 'system'}
                                    </span>
                                  </td>

                                  <td className="table-cell text-right">
                                    {entry.reversedBy ? (
                                      <span className="text-xs font-bold text-slate-400">
                                        Reversed
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => requestReverse(entry)}
                                        className="btn-secondary px-3 py-1.5 text-xs"
                                      >
                                        <Undo2 size={14} />
                                        Reverse
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* RANKINGS */}

                  <div className="grid gap-6 xl:grid-cols-2">

                    <div>
                      <div className="mb-4 flex items-end justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-black text-black">
                            Student rankings
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            Top 50 lifetime scores, read from the projection.
                          </p>
                        </div>

                        <Link to="/leaderboard" className="btn-soft text-xs">
                          Public board
                          <ChevronRight size={14} />
                        </Link>
                      </div>

                      <div className="table-shell overflow-x-auto">
                        <table className="w-full min-w-[520px]">
                          <thead className="table-head">
                            <tr>
                              <th className="table-cell text-left">#</th>
                              <th className="table-cell text-left">
                                Student
                              </th>
                              <th className="table-cell text-left">
                                Department
                              </th>
                              <th className="table-cell text-left">
                                XP
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100">
                            {game.totals.map((row, index) => (
                              <tr key={row.userId}>
                                <td className="table-cell font-black text-slate-400">
                                  {index + 1}
                                </td>

                                <td className="table-cell">
                                  <p className="font-bold text-black">
                                    {row.name}
                                  </p>

                                  <p className="text-xs text-slate-500">
                                    {row.studentId || '—'}
                                  </p>
                                </td>

                                <td className="table-cell text-sm text-slate-600">
                                  {row.department || '—'}
                                </td>

                                <td className="table-cell font-black">
                                  {row.totalXp.toLocaleString()}
                                </td>
                              </tr>
                            ))}

                            {!game.totals.length && (
                              <tr>
                                <td
                                  colSpan="4"
                                  className="p-12 text-center text-sm text-slate-500"
                                >
                                  Nobody has scored yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-4 text-xl font-black text-black">
                        Club rankings
                      </h3>

                      <div className="table-shell overflow-x-auto">
                        <table className="w-full min-w-[520px]">
                          <thead className="table-head">
                            <tr>
                              <th className="table-cell text-left">#</th>
                              <th className="table-cell text-left">Club</th>
                              <th className="table-cell text-left">
                                Events
                              </th>
                              <th className="table-cell text-left">
                                Members
                              </th>
                              <th className="table-cell text-left">
                                Score
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100">
                            {game.clubs.map((row, index) => (
                              <tr key={row.clubId}>
                                <td className="table-cell font-black text-slate-400">
                                  {row.rank ?? index + 1}
                                </td>

                                <td className="table-cell">
                                  <p className="font-bold text-black">
                                    {row.club.name}
                                  </p>

                                  <p className="text-xs text-slate-500">
                                    {row.club.department || '—'}
                                  </p>
                                </td>

                                <td className="table-cell">
                                  {row.eventsOrganized}
                                </td>

                                <td className="table-cell">
                                  {row.club.members}
                                </td>

                                <td className="table-cell font-black">
                                  {row.totalXp.toLocaleString()}
                                </td>
                              </tr>
                            ))}

                            {!game.clubs.length && (
                              <tr>
                                <td
                                  colSpan="5"
                                  className="p-12 text-center text-sm text-slate-500"
                                >
                                  No club activity yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>

                  {/* BADGES */}

                  <div className="space-y-4">

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h3 className="text-xl font-black text-black">
                          Badge catalog
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          Thresholds apply to the next award evaluation; use
                          recompute to apply them to everyone now.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowBadgeForm((open) => !open)}
                        className="btn-secondary self-start"
                      >
                        <Plus size={17} />
                        {showBadgeForm ? 'Cancel' : 'New badge'}
                      </button>
                    </div>

                    {showBadgeForm && (
                      <form
                        onSubmit={handleBadgeCreate}
                        className="app-card space-y-5"
                      >

                        <div className="grid gap-5 lg:grid-cols-2">

                          <div>
                            <label className="field-label">Slug</label>

                            <input
                              type="text"
                              required
                              value={badgeForm.slug}
                              onChange={(e) =>
                                setBadgeForm((prev) => ({
                                  ...prev,
                                  slug: e.target.value,
                                }))
                              }
                              className="field"
                              placeholder="debate_star"
                            />
                          </div>

                          <div>
                            <label className="field-label">Title</label>

                            <input
                              type="text"
                              required
                              value={badgeForm.title}
                              onChange={(e) =>
                                setBadgeForm((prev) => ({
                                  ...prev,
                                  title: e.target.value,
                                }))
                              }
                              className="field"
                              placeholder="Debate Star"
                            />
                          </div>

                        </div>

                        <div>
                          <label className="field-label">Description</label>

                          <textarea
                            required
                            value={badgeForm.description}
                            onChange={(e) =>
                              setBadgeForm((prev) => ({
                                ...prev,
                                description: e.target.value,
                              }))
                            }
                            className="field min-h-24 resize-y"
                            placeholder="What a student has to do to earn it"
                          />
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

                          <div>
                            <label className="field-label">Metric</label>

                            <select
                              value={badgeForm.metric}
                              onChange={(e) =>
                                setBadgeForm((prev) => ({
                                  ...prev,
                                  metric: e.target.value,
                                }))
                              }
                              className="field"
                            >
                              {(
                                game.rules?.metrics ||
                                Object.keys(METRIC_LABELS)
                              ).map((metric) => (
                                <option key={metric} value={metric}>
                                  {METRIC_LABELS[metric] || metric}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="field-label">Icon</label>

                            <input
                              type="text"
                              value={badgeForm.icon}
                              onChange={(e) =>
                                setBadgeForm((prev) => ({
                                  ...prev,
                                  icon: e.target.value,
                                }))
                              }
                              className="field"
                              placeholder="Trophy"
                            />
                          </div>

                          <div>
                            <label className="field-label">Threshold</label>

                            <input
                              type="number"
                              min="1"
                              required
                              value={badgeForm.threshold}
                              onChange={(e) =>
                                setBadgeForm((prev) => ({
                                  ...prev,
                                  threshold: e.target.value,
                                }))
                              }
                              className="field"
                              placeholder="3"
                            />
                          </div>

                          <div>
                            <label className="field-label">XP bonus</label>

                            <input
                              type="number"
                              min="0"
                              value={badgeForm.xpBonus}
                              onChange={(e) =>
                                setBadgeForm((prev) => ({
                                  ...prev,
                                  xpBonus: e.target.value,
                                }))
                              }
                              className="field"
                              placeholder="50"
                            />
                          </div>

                        </div>

                        <button
                          type="submit"
                          className="btn-primary"
                        >
                          <Plus size={17} />
                          Create badge
                        </button>

                      </form>
                    )}

                    <div className="table-shell overflow-x-auto">
                      <table className="w-full min-w-[900px]">

                        <thead className="table-head">
                          <tr>
                            <th className="table-cell text-left">Badge</th>
                            <th className="table-cell text-left">Metric</th>
                            <th className="table-cell text-left">Threshold</th>
                            <th className="table-cell text-left">XP bonus</th>
                            <th className="table-cell text-left">Active</th>
                            <th className="table-cell text-right">
                              Save
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {game.badges.map((badge) => {
                            const edits = badgeEdits[badge.id] || {};

                            const dirty =
                              Object.keys(edits).length > 0;

                            return (
                              <tr key={badge.id}>
                                <td className="table-cell">
                                  <p className="font-bold text-black">
                                    {badge.title}
                                  </p>

                                  <p className="max-w-md text-xs text-slate-500">
                                    {badge.description}
                                  </p>
                                </td>

                                <td className="table-cell text-sm text-slate-600">
                                  {METRIC_LABELS[badge.metric] || badge.metric}
                                </td>

                                <td className="table-cell">
                                  <input
                                    type="number"
                                    min="1"
                                    value={edits.threshold ?? badge.threshold}
                                    onChange={(e) =>
                                      editBadge(badge.id, {
                                        threshold: Number(e.target.value),
                                      })
                                    }
                                    className="field w-28 py-1.5 text-sm"
                                  />
                                </td>

                                <td className="table-cell">
                                  <input
                                    type="number"
                                    min="0"
                                    value={edits.xpBonus ?? badge.xpBonus}
                                    onChange={(e) =>
                                      editBadge(badge.id, {
                                        xpBonus: Number(e.target.value),
                                      })
                                    }
                                    className="field w-28 py-1.5 text-sm"
                                  />
                                </td>

                                <td className="table-cell">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      editBadge(badge.id, {
                                        active: !(edits.active ?? badge.active),
                                      })
                                    }
                                    className={
                                      (edits.active ?? badge.active)
                                        ? 'btn-soft px-3 py-1.5 text-xs'
                                        : 'btn-secondary px-3 py-1.5 text-xs'
                                    }
                                  >
                                    {(edits.active ?? badge.active)
                                      ? 'Visible'
                                      : 'Hidden'}
                                  </button>
                                </td>

                                <td className="table-cell text-right">
                                  <button
                                    type="button"
                                    disabled={!dirty}
                                    onClick={() => handleBadgeSave(badge)}
                                    className="btn-primary px-3 py-1.5 text-xs"
                                  >
                                    Save
                                  </button>
                                </td>
                              </tr>
                            );
                          })}

                          {!game.badges.length && (
                            <tr>
                              <td
                                colSpan="6"
                                className="p-12 text-center text-sm text-slate-500"
                              >
                                The badge catalog is empty.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                  </div>

                  {/* INTEGRITY + REPORTS */}

                  <div className="grid gap-6 xl:grid-cols-2">

                    <div className="space-y-4">

                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-black text-black">
                            Integrity checks
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            {game.findings.length
                              ? `${game.findings.length} check(s) flagged something.`
                              : 'Every invariant check passed.'}
                          </p>
                        </div>

                        <span className="chip">
                          {`Drift: ${game.analytics?.driftingCount || 0}`}
                        </span>
                      </div>

                      {game.findings.map((finding) => {
                        const columns =
                          findingColumns[finding.key] || [];

                        const rows =
                          finding.types || finding.examples || [];

                        return (
                          <article
                            key={finding.key}
                            className="app-card space-y-3"
                          >

                            <div className="flex flex-wrap items-center gap-3">

                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold capitalize ${
                                  finding.severity === 'high'
                                    ? 'border-red-200 bg-red-50 text-red-600'
                                    : finding.severity === 'medium'
                                      ? 'border-slate-200 bg-slate-100 text-amber-600'
                                      : 'border-slate-200 bg-white text-slate-600'
                                }`}
                              >
                                <AlertTriangle size={13} />
                                {finding.severity}
                              </span>

                              <h4 className="font-black text-black">
                                {finding.title}
                              </h4>

                            </div>

                            <p className="text-sm leading-6 text-slate-600">
                              {finding.detail}
                            </p>

                            {columns.length > 0 && rows.length > 0 && (
                              <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full min-w-[420px]">
                                  <thead className="table-head">
                                    <tr>
                                      {columns.map((column) => (
                                        <th
                                          key={column.header}
                                          className="table-cell text-left text-xs"
                                        >
                                          {column.header}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>

                                  <tbody className="divide-y divide-slate-100">
                                    {rows.slice(0, 5).map((row, index) => (
                                      <tr key={index}>
                                        {columns.map((column) => (
                                          <td
                                            key={column.header}
                                            className="table-cell text-sm text-slate-700"
                                          >
                                            {column.value(row)}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                          </article>
                        );
                      })}

                      {(game.analytics?.driftingProfiles || []).length > 0 && (
                        <article className="app-card space-y-3">
                          <h4 className="font-black text-black">
                            Cached totals that disagree with the ledger
                          </h4>

                          <div className="space-y-2">
                            {game.analytics.driftingProfiles.map((row) => (
                              <div
                                key={String(row.userId)}
                                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                              >
                                <span className="truncate text-sm font-bold text-slate-700">
                                  {nameFor(row.userId)}
                                </span>

                                <span className="shrink-0 text-xs font-semibold text-slate-500">
                                  {`cached ${row.cached ?? '—'} · ledger ${row.ledger}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </article>
                      )}

                      <div className="app-card space-y-4">

                        <div className="flex items-center gap-3">

                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                            <RotateCcw size={20} />
                          </div>

                          <div>
                            <h4 className="text-lg font-black text-black">
                              Recompute everything
                            </h4>

                            <p className="text-xs text-slate-500">
                              Settles unpaid attendance, rebuilds every cached
                              total and re-awards badges. Safe to run twice.
                            </p>
                          </div>

                        </div>

                        <button
                          type="button"
                          disabled={recomputeBusy}
                          onClick={() =>
                            setPendingAction({
                              title: 'Recompute gamification?',
                              message:
                                'This scans attendance history, writes any ' +
                                'missing XP awards, rebuilds every cached total ' +
                                'and re-evaluates badges. It cannot remove ' +
                                'awards that were already paid.',
                              confirmLabel: 'Run recompute',
                              run: handleRecompute,
                            })
                          }
                          className="btn-primary"
                        >
                          <RotateCcw
                            size={17}
                            className={recomputeBusy ? 'animate-spin' : ''}
                          />
                          {recomputeBusy ? 'Running...' : 'Run recompute'}
                        </button>

                        {lastRecompute && (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">

                            <p className="font-black text-slate-900">
                              {lastRecompute.message}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {
                                `${
                                  lastRecompute.backfill?.eventsScanned || 0
                                } events scanned, ` +
                                  `${
                                    lastRecompute.backfill?.settled || 0
                                  } awards settled, ` +
                                  `${lastRecompute.studentsRebuilt || 0} of ` +
                                  `${
                                    lastRecompute.studentsWithLedger || 0
                                  } students rebuilt` +
                                  `${
                                    lastRecompute.remaining
                                      ? `, ${lastRecompute.remaining} still queued`
                                      : ''
                                  }`
                              }
                            </p>

                          </div>
                        )}

                      </div>

                    </div>

                    {/* REPORTS */}

                    <div className="app-card h-fit space-y-5">

                      <div className="flex items-center gap-3">

                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                          <Download size={20} />
                        </div>

                        <div>
                          <h3 className="text-xl font-black text-black">
                            Leaderboard reports
                          </h3>

                          <p className="text-xs text-slate-500">
                            CSV export, one row per rank
                          </p>
                        </div>

                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">

                        <div>
                          <label className="field-label">Board</label>

                          <select
                            value={reportForm.scope}
                            onChange={(e) =>
                              setReportForm((prev) => ({
                                ...prev,
                                scope: e.target.value,
                              }))
                            }
                            className="field"
                          >
                            <option value="students">
                              Student leaderboard
                            </option>

                            <option value="clubs">
                              Club leaderboard
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="field-label">Period</label>

                          <select
                            value={reportForm.period}
                            onChange={(e) =>
                              setReportForm((prev) => ({
                                ...prev,
                                period: e.target.value,
                                semester:
                                  e.target.value === 'semester'
                                    ? prev.semester
                                    : '',
                              }))
                            }
                            className="field"
                          >
                            {(game.rules?.periods || [
                              'overall',
                              'weekly',
                              'monthly',
                              'semester',
                            ]).map((period) => (
                              <option key={period} value={period}>
                                {period.charAt(0).toUpperCase() +
                                  period.slice(1)}
                              </option>
                            ))}
                          </select>
                        </div>

                      </div>

                      {reportForm.period === 'semester' && (
                        <div>
                          <label className="field-label">Semester</label>

                          <select
                            value={reportForm.semester}
                            onChange={(e) =>
                              setReportForm((prev) => ({
                                ...prev,
                                semester: e.target.value,
                              }))
                            }
                            className="field"
                          >
                            <option value="">Current term</option>

                            {(game.rules?.semesters || []).map((term) => (
                              <option key={term.key} value={term.key}>
                                {term.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleExport}
                        disabled={reportBusy}
                        className="btn-primary w-full"
                      >
                        <Download size={17} />
                        {reportBusy ? 'Preparing...' : 'Download CSV'}
                      </button>

                      <p className="text-xs leading-5 text-slate-500">
                        Reports contain rank, name, student ID, department,
                        score and activity counts. Contact details are never
                        included.
                      </p>

                      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <Medal size={16} className="text-amber-600" />

                        <p className="text-xs font-semibold text-slate-600">
                          {`${
                            game.badges.length
                          } badges in the catalog`}
                        </p>
                      </div>

                    </div>

                  </div>

                </>
              )}

            </section>
          )}

        </div>
      </main>

      <ConfirmDialog
        isOpen={Boolean(pendingAction)}
        title={pendingAction?.title}
        message={pendingAction?.message}
        confirmLabel={pendingAction?.confirmLabel}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          const action = pendingAction;
          setPendingAction(null);
          action?.run();
        }}
      />
    </div>
  );
};

export default AdminPanel;