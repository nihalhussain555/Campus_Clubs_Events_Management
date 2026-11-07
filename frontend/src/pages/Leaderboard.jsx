import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  CalendarRange,
  ChevronDown,
  RefreshCw,
  Search,
  Trophy,
  Users,
  X
} from 'lucide-react';

import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import SkeletonGrid from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';

import { gamificationAPI } from '../services/api';

// The board is a read of an aggregation, not a live feed: refreshing every
// thirty seconds keeps it feeling current without a socket server.
const REFRESH_MS = 30000;

const PERIOD_LABELS = {
  overall: 'All time',
  weekly: 'This week',
  monthly: 'This month',
  semester: 'Semester'
};

const MEDALS = {
  1: { color: '#d4a017', name: 'Gold' },
  2: { color: '#8f9cad', name: 'Silver' },
  3: { color: '#c2785c', name: 'Bronze' }
};

const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?';

const Avatar = ({ src, name, size = 44 }) =>
  src ? (
    <img
      src={src}
      alt=""
      loading="lazy"
      className="shrink-0 rounded-full border border-slate-200 object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full bg-[#e8f5fb] text-sm font-black text-[#145f82]"
      style={{ width: size, height: size }}
    >
      {initials(name)}
    </div>
  );

const RankBadge = ({ rank, size = 40 }) => {
  const medal = MEDALS[rank];

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
      style={{
        width: size,
        height: size,
        background: medal ? medal.color : 'var(--track)',
        color: medal ? '#ffffff' : 'var(--muted)'
      }}
      title={medal ? `${medal.name} place` : undefined}
    >
      {rank}
    </div>
  );
};

const Stat = ({ label, value }) => (
  <div className="text-left">
    <div className="text-base font-black text-[#073c57]">{value}</div>
    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
      {label}
    </div>
  </div>
);

const Leaderboard = () => {
  const user = useMemo(
    () => JSON.parse(localStorage.getItem('user') || '{}'),
    []
  );

  const [scope, setScope] = useState('students');
  const [period, setPeriod] = useState('overall');
  const [semester, setSemester] = useState('');
  const [department, setDepartment] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [rules, setRules] = useState(null);
  const [board, setBoard] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedClub, setSelectedClub] = useState(null);
  const [toast, setToast] = useState(null);

  // The search box debounce keeps a typed name from firing a query per
  // keystroke against an aggregation endpoint.
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [scope, period, semester, department]);

  useEffect(() => {
    if (semester && rules?.semesters?.length) {
      const known = rules.semesters.some((s) => s.key === semester);

      if (!known) setSemester('');
    }
  }, [rules, semester]);

  const params = useMemo(
    () => ({
      period,
      semester: period === 'semester' ? semester || undefined : undefined,
      department: department || undefined,
      search: search || undefined,
      page,
      limit: 20
    }),
    [period, semester, department, search, page]
  );

  const loadBoard = useCallback(
    async ({ silent } = {}) => {
      if (!silent) setLoading(true);
      setRefreshing(true);

      try {
        const response =
          scope === 'clubs'
            ? await gamificationAPI.getClubLeaderboard(params)
            : await gamificationAPI.getStudentLeaderboard(params);

        setBoard(response.data);
        setError(null);
      } catch (loadError) {
        if (!silent) {
          setError(
            loadError.response?.data?.message ||
              'The leaderboard could not be loaded.'
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [params, scope]
  );

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    let cancelled = false;

    const loadRules = async () => {
      try {
        const response = await gamificationAPI.getRules();

        if (!cancelled) setRules(response.data);
      } catch {
        // Rules only label the board, so a failure there is not fatal; the
        // rankings still come through.
      }
    };

    const loadSummary = async () => {
      try {
        const response = await gamificationAPI.getMySummary();

        if (!cancelled) setSummary(response.data);
      } catch {
        if (!cancelled) setSummary(null);
      }
    };

    loadRules();
    loadSummary();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const tick = () => {
      if (!document.hidden) loadBoard({ silent: true });
    };

    const id = setInterval(tick, REFRESH_MS);

    return () => clearInterval(id);
  }, [loadBoard]);

  const openClubStanding = async (clubId) => {
    if (selectedClub?.club?.id === clubId) {
      setSelectedClub(null);
      return;
    }

    try {
      const response = await gamificationAPI.getClubStanding(clubId, { period });
      setSelectedClub(response.data);
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Could not load that club.',
        type: 'error'
      });
    }
  };

  const entries = board?.entries || [];
  const podium = page === 1 && !search ? entries.slice(0, 3) : [];
  const myUserId = user?._id || user?.id;

  const updatedOn = board?.generatedAt
    ? new Date(board.generatedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    : null;

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

      <main className="page-section pt-8">
        <div className="page-container">
          {/* ---------------------------------------------- header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="eyebrow">Campus rankings</span>
              <h1 className="display-title text-4xl sm:text-5xl">
                {scope === 'clubs' ? 'Club leaderboard' : 'Student leaderboard'}
              </h1>
              <p className="section-copy mt-4">
                Scores are calculated from verified attendance, judged
                competition results and credited volunteering - never from
                self-reported claims.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {updatedOn && (
                <span className="text-xs font-bold text-slate-500">
                  Updated {updatedOn}
                </span>
              )}
              <button
                type="button"
                onClick={() => loadBoard()}
                className="btn-secondary px-3"
                disabled={refreshing}
                aria-label="Refresh the leaderboard"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* ---------------------------------------------- my rank */}
          {scope === 'students' && summary && (
            <section className="metric-card mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar
                  src={user?.profilePic}
                  name={user?.name}
                  size={56}
                />
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Your position
                  </p>
                  <h2 className="text-2xl font-black text-[#073c57]">
                    {summary.ranks?.overall?.rank
                      ? `#${summary.ranks.overall.rank}`
                      : 'Unranked'}
                    <span className="ml-2 text-base font-bold text-slate-500">
                      of {summary.ranks?.overall?.rankedStudents ?? 0} students
                    </span>
                  </h2>
                  <p className="text-sm font-bold text-slate-600">
                    {summary.xp?.total ?? 0} XP · Level{' '}
                    {summary.xp?.level?.level ?? 1}{' '}
                    {summary.xp?.level?.title ?? ''}
                  </p>
                </div>
              </div>

              <div className="w-full sm:max-w-xs">
                <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Next level</span>
                  <span>
                    {summary.xp?.level?.maxLevel
                      ? 'Max level'
                      : `${summary.xp?.level?.xpIntoLevel ?? 0} / ${summary.xp?.level?.xpForNextLevel ?? 0} XP`}
                  </span>
                </div>
                <div className="xp-track">
                  <div
                    className="xp-fill"
                    style={{
                      width: `${summary.xp?.level?.progressPercent ?? 0}%`
                    }}
                  />
                </div>
                {summary.nextAchievement && (
                  <p className="mt-3 text-xs font-bold text-slate-600">
                    Closest badge: {summary.nextAchievement.title} -{' '}
                    {summary.nextAchievement.value}/{summary.nextAchievement.threshold}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* ---------------------------------------------- controls */}
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'students', label: 'Students', icon: Users },
                { id: 'clubs', label: 'Clubs', icon: Award }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setScope(tab.id)}
                  className={`filter-pill flex items-center gap-2 ${
                    scope === tab.id ? 'filter-pill-active' : ''
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}

              <span className="mx-2 hidden h-6 w-px bg-slate-200 sm:block" />

              {(rules?.periods || Object.keys(PERIOD_LABELS)).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPeriod(value)}
                  className={`filter-pill ${
                    period === value ? 'filter-pill-active' : ''
                  }`}
                >
                  {PERIOD_LABELS[value] || value}
                </button>
              ))}

              {period === 'semester' && rules?.semesters?.length ? (
                <div className="relative">
                  <select
                    value={semester}
                    onChange={(event) => setSemester(event.target.value)}
                    className="field appearance-none pr-10"
                    aria-label="Choose a semester"
                  >
                    <option value="">Current semester</option>
                    {rules.semesters.map((term) => (
                      <option key={term.key} value={term.key}>
                        {term.label}
                      </option>
                    ))}
                  </select>
                  <CalendarRange
                    size={16}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#145f82]"
                  />
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  className="field pl-12"
                  placeholder={
                    scope === 'clubs'
                      ? 'Search clubs'
                      : 'Search a name or student id'
                  }
                  aria-label="Search the leaderboard"
                />
              </div>

              {scope === 'students' && board?.departments?.length > 0 && (
                <div className="relative sm:w-64">
                  <select
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    className="field appearance-none pr-10"
                    aria-label="Filter by department"
                  >
                    <option value="">All departments</option>
                    {board.departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* ---------------------------------------------- board */}
          {loading ? (
            <SkeletonGrid count={8} />
          ) : error ? (
            <EmptyState
              icon={Trophy}
              title="The board is unavailable"
              message={error}
              actionLabel="Try again"
              onAction={() => loadBoard()}
            />
          ) : entries.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="No rankings yet"
              message={
                search || department || period !== 'overall'
                  ? 'Nothing matches those filters in this window. Try a wider period or clear the search.'
                  : 'As soon as students check in to events with a verified QR, the first points will land here.'
              }
            />
          ) : (
            <>
              {podium.length === 3 && (
                <section
                  className="mb-8 grid gap-4 sm:grid-cols-3"
                  aria-label="Top three"
                >
                  {podium.map((row) => {
                    const medal = MEDALS[row.rank];
                    const name =
                      scope === 'clubs' ? row.club?.name : row.name;
                    const sub =
                      scope === 'clubs'
                        ? `${row.club?.department || 'General'} · ${row.club?.members || 0} members`
                        : `${row.department || 'Unassigned'} · ${row.studentId || ''}`;

                    return (
                      <article
                        key={row.userId || row.clubId}
                        className="app-card app-card-hover flex flex-col items-center gap-3 py-8 text-center"
                        style={{ borderColor: medal?.color }}
                      >
                        <RankBadge rank={row.rank} size={44} />
                        <Avatar
                          src={scope === 'clubs' ? row.club?.logo : row.profilePic}
                          name={name}
                          size={64}
                        />
                        <h3 className="text-lg font-black text-[#073c57]">
                          {name}
                        </h3>
                        <p className="text-xs font-bold text-slate-500">{sub}</p>
                        <p className="text-3xl font-black text-[#145f82]">
                          {row.totalXp}
                          <span className="ml-1 text-sm font-bold text-slate-500">
                            XP
                          </span>
                        </p>
                        <div className="mt-2 flex gap-5">
                          {scope === 'clubs' ? (
                            <>
                              <Stat label="Events" value={row.eventsOrganized} />
                              <Stat label="Participants" value={row.participation} />
                            </>
                          ) : (
                            <>
                              <Stat label="Events" value={row.eventsAttended} />
                              <Stat label="Wins" value={row.competitionsWon} />
                            </>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </section>
              )}

              <section className="table-shell">
                <table className="w-full">
                  <thead className="table-head">
                    <tr>
                      <th className="px-5 py-4">Rank</th>
                      <th className="px-5 py-4">
                        {scope === 'clubs' ? 'Club' : 'Student'}
                      </th>
                      <th className="px-5 py-4">Department</th>
                      <th className="px-5 py-4">Events</th>
                      <th className="px-5 py-4">
                        {scope === 'clubs' ? 'Participants' : 'Wins'}
                      </th>
                      <th className="px-5 py-4 text-right">XP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entries.map((row) => {
                      const id = row.userId || row.clubId;
                      const name = scope === 'clubs' ? row.club?.name : row.name;
                      const isMe =
                        scope === 'students' && String(id) === String(myUserId);

                      return (
                        <tr
                          key={id}
                          onClick={
                            scope === 'clubs'
                              ? () => openClubStanding(id)
                              : undefined
                          }
                          className={
                            scope === 'clubs'
                              ? 'cursor-pointer transition hover:bg-slate-50'
                              : 'transition'
                          }
                        >
                          <td className="table-cell">
                            <div className="flex items-center gap-2">
                              <RankBadge rank={row.rank} size={34} />
                              {MEDALS[row.rank] && (
                                <span className="hidden text-xs font-black uppercase tracking-wider sm:inline">
                                  {MEDALS[row.rank].name}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="table-cell">
                            <div className="flex items-center gap-3">
                              <Avatar
                                src={
                                  scope === 'clubs'
                                    ? row.club?.logo
                                    : row.profilePic
                                }
                                name={name}
                                size={38}
                              />
                              <div>
                                <p className="font-black text-black">
                                  {name}
                                  {isMe && (
                                    <span className="ml-2 chip bg-[#e8f5fb] text-[#145f82]">
                                      You
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {scope === 'clubs'
                                    ? row.club?.leader || 'No leader listed'
                                    : row.studentId || 'Student'}
                                  {scope === 'students' && row.levelTitle
                                    ? ` · ${row.levelTitle}`
                                    : ''}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="table-cell">
                            {scope === 'clubs'
                              ? row.club?.department || 'General'
                              : row.department || 'Unassigned'}
                          </td>
                          <td className="table-cell">
                            {scope === 'clubs'
                              ? row.eventsOrganized
                              : row.eventsAttended}
                          </td>
                          <td className="table-cell">
                            {scope === 'clubs'
                              ? row.participation
                              : row.competitionsWon}
                          </td>
                          <td className="table-cell text-right text-lg font-black text-[#145f82]">
                            {row.totalXp}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>

              {board?.ranksExact === false && (
                <p className="mt-3 text-xs font-bold text-slate-500">
                  This far down the board, places are counted one per row, so
                  students on the same score may show different numbers.
                </p>
              )}

              <Pagination
                page={board?.page || 1}
                totalPages={board?.totalPages || 1}
                onChange={setPage}
              />
            </>
          )}

          {/* ---------------------------------------------- club detail */}
          {scope === 'clubs' && selectedClub && (
            <section className="app-card mt-8">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={selectedClub.club?.logo}
                    name={selectedClub.club?.name}
                    size={48}
                  />
                  <div>
                    <h2 className="section-title text-2xl sm:text-2xl">
                      {selectedClub.club?.name}
                    </h2>
                    <p className="text-sm text-slate-600">
                      {selectedClub.club?.department} ·{' '}
                      {selectedClub.club?.members || 0} members ·{' '}
                      {selectedClub.eventsOrganized} events
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedClub(null)}
                  className="btn-secondary px-3"
                  aria-label="Close club comparison"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Rank" value={`#${selectedClub.rank ?? '-'}`} />
                <Stat label="Total XP" value={selectedClub.totalXp} />
                <Stat
                  label="Distinct participants"
                  value={selectedClub.participation}
                />
                <Stat
                  label="Attendance sessions"
                  value={selectedClub.attendanceSessions}
                />
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <div className="soft-panel">
                  <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-500">
                    Moving up
                  </h3>
                  <p className="text-sm text-slate-600">
                    {selectedClub.ahead
                      ? `Ahead of you: ${selectedClub.ahead.club.name} on ${selectedClub.ahead.totalXp} XP.`
                      : 'Nobody is ahead in this window - you lead the campus.'}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {selectedClub.behind
                      ? `Behind you: ${selectedClub.behind.club.name} on ${selectedClub.behind.totalXp} XP.`
                      : 'No club is closing in behind you.'}
                  </p>
                </div>

                <div className="soft-panel">
                  <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-500">
                    Top contributors
                  </h3>
                  {selectedClub.topContributors?.length ? (
                    <ul className="space-y-2">
                      {selectedClub.topContributors.slice(0, 5).map((person) => (
                        <li
                          key={String(person._id)}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="font-bold text-black">
                            {person.name}
                          </span>
                          <span className="font-black text-[#145f82]">
                            {person.totalXp} XP
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-600">
                      No scored activity in this window yet.
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default Leaderboard;
