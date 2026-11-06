import React, { useMemo, useState } from 'react';
import {
  Activity,
  CalendarDays,
  PieChart,
  TrendingUp,
  Users
} from 'lucide-react';

const SLICE_COLORS = [
  '#145f82',
  '#2d7a9b',
  '#5aa9c9',
  '#93c9de',
  '#073c57',
  '#c2703d'
];

const STATUS_LABELS = {
  upcoming: 'Upcoming',
  ongoing: 'Ongoing',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

const ROLE_LABELS = {
  student: 'Students',
  club_leader: 'Club leaders',
  club_member: 'Club members',
  admin: 'Admins'
};

const idOf = (value) => String(value?._id || value || '');

const BarRow = ({ label, value, max, color, suffix }) => {
  const [active, setActive] = useState(false);
  const width = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div
      className="group"
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
    >
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">
          {label}
        </span>
        <span
          className={`text-sm font-black tabular-nums ${
            active ? 'text-[#073c57] dark:text-white' : 'text-slate-400'
          }`}
        >
          {value}
          {suffix}
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

const ColumnChart = ({ rows, unit }) => {
  const [active, setActive] = useState(null);
  const max = Math.max(1, ...rows.map((row) => row.value));

  return (
    <div className="flex items-end gap-3">
      {rows.map((row, index) => {
        const height = Math.max(4, Math.round((row.value / max) * 132));

        return (
          <button
            key={row.label}
            type="button"
            onMouseEnter={() => setActive(index)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(index)}
            onBlur={() => setActive(null)}
            className="flex flex-1 flex-col items-center gap-2"
            title={`${row.label}: ${row.value}${unit}`}
          >
            <span
              className={`text-sm font-black tabular-nums ${
                active === index
                  ? 'text-[#073c57] dark:text-white'
                  : 'text-transparent'
              }`}
            >
              {row.value}
            </span>

            <span
              className="w-full max-w-12 rounded-t-xl transition-all duration-500"
              style={{
                height,
                backgroundColor: row.color || '#2d7a9b',
                opacity: active === null || active === index ? 1 : 0.55
              }}
            />

            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {row.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

const Donut = ({ slices, total }) => {
  const [active, setActive] = useState(null);
  const radius = 52;
  const ring = 2 * Math.PI * radius;
  let cursor = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative shrink-0">
        <svg viewBox="0 0 140 140" className="h-36 w-36">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            strokeWidth="16"
            className="stroke-slate-200 dark:stroke-slate-700"
          />

          {slices.map((slice, index) => {
            const fraction = total > 0 ? slice.value / total : 0;
            const dash = fraction * ring;
            const offset = -cursor * ring;
            cursor += fraction;

            return (
              <circle
                key={slice.label}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={active === index ? 22 : 16}
                strokeDasharray={`${dash} ${ring - dash}`}
                strokeDashoffset={offset}
                transform="rotate(-90 70 70)"
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
                style={{ transition: 'stroke-width 150ms ease' }}
              />
            );
          })}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-black text-[#073c57] dark:text-white">
            {active === null ? total : slices[active].value}
          </p>
          <p className="max-w-24 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {active === null ? 'accounts' : slices[active].label}
          </p>
        </div>
      </div>

      <ul className="flex-1 space-y-2">
        {slices.map((slice, index) => (
          <li
            key={slice.label}
            onMouseEnter={() => setActive(index)}
            onMouseLeave={() => setActive(null)}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              {slice.label}
            </span>

            <span className="tabular-nums font-black text-slate-500 dark:text-slate-400">
              {slice.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const ChartCard = ({ icon: Icon, title, note, children }) => (
  <section className="app-card">
    <header className="mb-5 flex items-start gap-3">
      <span className="icon-tile">
        <Icon size={18} />
      </span>

      <div>
        <h3 className="text-lg font-black text-black dark:text-white">
          {title}
        </h3>
        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {note}
        </p>
      </div>
    </header>

    {children}
  </section>
);

const AnalyticsCharts = ({ users, clubs, events }) => {
  const data = useMemo(() => {
    const roleCounts = {};

    users.forEach((user) => {
      const role = user?.role || 'student';
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    });

    const roleSlices = Object.entries(roleCounts)
      .map(([role, value], index) => ({
        label: ROLE_LABELS[role] || role,
        value,
        color: SLICE_COLORS[index % SLICE_COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);

    const now = new Date();
    const months = [];

    for (let back = 5; back >= 0; back -= 1) {
      const edge = new Date(now.getFullYear(), now.getMonth() - back, 1);

      months.push({
        key: `${edge.getFullYear()}-${edge.getMonth()}`,
        label: edge.toLocaleString('en-GB', { month: 'short' }),
        value: 0
      });
    }

    users.forEach((user) => {
      const created = new Date(user?.createdAt);
      if (Number.isNaN(created.getTime())) return;

      const slot = months.find(
        (month) =>
          month.key === `${created.getFullYear()}-${created.getMonth()}`
      );

      if (slot) slot.value += 1;
    });

    const statusBars = Object.entries(STATUS_LABELS).map(([key, label]) => ({
      label,
      value: events.filter((event) => event?.status === key).length
    }));

    const clubRows = [...clubs]
      .sort((a, b) => (b.members?.length || 0) - (a.members?.length || 0))
      .slice(0, 6)
      .map((club) => ({
        label: club?.clubName || 'Untitled club',
        value: club.members?.length || 0
      }));

    const seatRows = events.map((event) => {
      const registered = (event?.registeredStudents || []).length;
      const attended = (event?.participants || []).length;

      return {
        id: idOf(event?._id),
        label: event?.title || 'Untitled event',
        registered,
        attended,
        capacity: Number(event?.capacity) || 0
      };
    });

    const topSeats = [...seatRows]
      .sort((a, b) => b.registered - a.registered)
      .slice(0, 5);

    const totals = seatRows.reduce(
      (acc, row) => ({
        registered: acc.registered + row.registered,
        attended: acc.attended + row.attended,
        capacity: acc.capacity + row.capacity
      }),
      { registered: 0, attended: 0, capacity: 0 }
    );

    return {
      roleSlices,
      months,
      statusBars,
      clubRows,
      topSeats,
      totals,
      fillRate:
        totals.capacity > 0
          ? Math.round((totals.registered / totals.capacity) * 100)
          : 0,
      attendanceRate:
        totals.registered > 0
          ? Math.round((totals.attended / totals.registered) * 100)
          : 0
    };
  }, [users, clubs, events]);

  const maxClubMembers = Math.max(1, ...data.clubRows.map((r) => r.value));
  const maxMonth = Math.max(1, ...data.months.map((m) => m.value));
  const maxStatus = Math.max(1, ...data.statusBars.map((s) => s.value));
  const maxSeats = Math.max(
    1,
    ...data.topSeats.map((row) => Math.max(row.registered, row.capacity))
  );

  const hasData = users.length > 0 || clubs.length > 0 || events.length > 0;

  if (!hasData) return null;

  return (
    <section className="mb-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-[#073c57] dark:text-white">
            Campus analytics
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            Live figures from the accounts, clubs and events on this instance.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="chip">
            Seat fill {data.fillRate}%
          </span>
          <span className="chip">
            Attendance {data.attendanceRate}%
          </span>
          <span className="chip">
            {data.totals.registered} registrations
          </span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard
          icon={Users}
          title="Accounts by role"
          note="Who can sign in and what they are allowed to manage."
        >
          <Donut slices={data.roleSlices} total={users.length} />
        </ChartCard>

        <ChartCard
          icon={TrendingUp}
          title="New students joined"
          note="Registrations over the last six months."
        >
          <ColumnChart
            rows={data.months.map((month) => ({
              label: month.label,
              value: month.value,
              color: month.value === maxMonth ? '#145f82' : '#5aa9c9'
            }))}
            unit=" accounts"
          />

          <p className="mt-5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Peak month: {maxMonth} account{maxMonth === 1 ? '' : 's'}
          </p>
        </ChartCard>

        <ChartCard
          icon={CalendarDays}
          title="Events by status"
          note="Computed from each event start and end time."
        >
          <ColumnChart
            rows={data.statusBars.map((bar) => ({
              ...bar,
              color:
                bar.label === 'Cancelled'
                  ? '#c2703d'
                  : bar.label === 'Ongoing'
                    ? '#073c57'
                    : '#2d7a9b'
            }))}
            unit=" events"
          />

          <p className="mt-5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {maxStatus} event{maxStatus === 1 ? '' : 's'} in the busiest state
          </p>
        </ChartCard>

        <ChartCard
          icon={Activity}
          title="Clubs by membership"
          note="Top clubs ranked by active members."
        >
          {data.clubRows.length === 0 ? (
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              No clubs created yet.
            </p>
          ) : (
            <div className="space-y-4">
              {data.clubRows.map((row, index) => (
                <BarRow
                  key={`${row.label}-${index}`}
                  label={row.label}
                  value={row.value}
                  max={maxClubMembers}
                  color={SLICE_COLORS[index % SLICE_COLORS.length]}
                  suffix=" members"
                />
              ))}
            </div>
          )}
        </ChartCard>

        <section className="app-card lg:col-span-2">
          <header className="mb-5 flex items-start gap-3">
            <span className="icon-tile">
              <PieChart size={18} />
            </span>

            <div>
              <h3 className="text-lg font-black text-black dark:text-white">
                Most subscribed events
              </h3>
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                Registered students measured against the capacity you set.
              </p>
            </div>
          </header>

          {data.topSeats.length === 0 ? (
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              No events to compare yet.
            </p>
          ) : (
            <div className="space-y-5">
              {data.topSeats.map((row, index) => (
                <div key={row.id || index}>
                  <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {row.label}
                    </span>

                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {row.registered} registered
                      {row.capacity > 0 ? ` of ${row.capacity} seats` : ''}
                      {' · '}
                      {row.attended} checked in
                    </span>
                  </div>

                  <div className="relative h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-[#93c9de] transition-all duration-500"
                      style={{
                        width: `${Math.round((row.capacity / maxSeats) * 100)}%`
                      }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-[#145f82] transition-all duration-500"
                      style={{
                        width: `${Math.round((row.registered / maxSeats) * 100)}%`
                      }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-[#073c57] opacity-70 transition-all duration-500"
                      style={{
                        width: `${Math.round((row.attended / maxSeats) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              ))}

              <div className="flex flex-wrap gap-2 pt-1">
                <span className="chip">Capacity</span>
                <span className="chip">Registered</span>
                <span className="chip">Checked in</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  );
};

export default AnalyticsCharts;
