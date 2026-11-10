// Content catalog for the Help & Support Center.
//
// This file is data only: no imports, no logic, nothing that reads the
// environment. helpController serves it through /api/help/content and
// helpAssistant renders it into the ClubAssist prompt, both after passing it
// through utils/helpAccess.js. That means every rule written here is a promise
// the site either keeps or breaks in front of a student, so nothing in this
// file may describe a feature that does not exist in this repository.
//
// Shape contract:
//   HELP_CATEGORIES  { id, title, blurb, icon, route }
//   HELP_ARTICLES    { id, categoryId, title, summary, roles, steps[], relatedRoutes[] }
//   HELP_FAQS        { id, categoryId, question, answer, roles }
//
// roles accepts 'all', 'student', 'club_leader' and 'admin'. Anything that
// describes leader or administrator powers must leave 'all' out, otherwise a
// student is handed instructions for buttons they cannot press.

export const HELP_CATEGORIES = [
  {
    id: 'getting-started',
    title: 'Getting started',
    blurb: 'Create your account, sign in safely and understand how passwords work here.',
    icon: 'LogIn',
    route: '/login'
  },
  {
    id: 'dashboard',
    title: 'Your dashboard',
    blurb: 'See your profile numbers, your activity and the two AI helpers on the site.',
    icon: 'LayoutDashboard',
    route: '/profile'
  },
  {
    id: 'clubs',
    title: 'Clubs',
    blurb: 'Browse campus clubs, join one, leave one and run one if you lead it.',
    icon: 'Users',
    route: '/clubs'
  },
  {
    id: 'events',
    title: 'Events',
    blurb: 'Find what is on, save a place and check in with your code when you arrive.',
    icon: 'CalendarDays',
    route: '/events'
  },
  {
    id: 'certificates',
    title: 'Certificates',
    blurb: 'How certificates are issued, how to download one and how anyone can check it.',
    icon: 'Award',
    route: '/certificates'
  },
  {
    id: 'leaderboard',
    title: 'Leaderboard',
    blurb: 'Points, badges and levels, and exactly how the campus ranking is worked out.',
    icon: 'TrendingUp',
    route: '/leaderboard'
  },
  {
    id: 'notifications',
    title: 'Notifications',
    blurb: 'Announcements, reminders and replies that land in the bell at the top.',
    icon: 'Bell',
    route: '/notifications'
  },
  {
    id: 'calendar',
    title: 'Calendar',
    blurb: 'Plan your month, save events and push them into your own calendar app.',
    icon: 'CalendarRange',
    route: '/calendar'
  },
  {
    id: 'account',
    title: 'Account and settings',
    blurb: 'Your password, your details, the look of the site and the data you can export.',
    icon: 'Settings',
    route: '/account-settings'
  },
  {
    id: 'admin',
    title: 'Administrator tools',
    blurb: 'Accounts, clubs, events, announcements, points and the support queue.',
    icon: 'ShieldCheck',
    route: '/admin'
  }
];

export const HELP_ARTICLES = [
  {
    id: 'creating-your-account',
    categoryId: 'getting-started',
    title: 'Creating your account',
    summary: 'Sign up with your email and a good password and you are in as a student.',
    roles: ['all'],
    steps: [
      'On the login page press the Sign up link to open the registration form.',
      'Give your full name, your email address and a password that satisfies the checklist under the box.',
      'Type the same password again to confirm it, then submit.',
      'The form also asks for a role, but a self-registered account is always created as a student. Club leaders and administrators are made by an administrator.',
      'You arrive on your profile page. Your student ID, department and course can be filled in afterwards.'
    ],
    relatedRoutes: [
      { label: 'Sign up', path: '/register' },
      { label: 'Sign in', path: '/login' }
    ]
  },
  {
    id: 'signing-in-and-out',
    categoryId: 'getting-started',
    title: 'Signing in and signing out',
    summary: 'Your email and password are the only things this site asks for.',
    roles: ['all'],
    steps: [
      'Open the login page and type the email address on your account.',
      'Type your password and press Login.',
      'If the account is still using a temporary password you go to the Set New Password page instead of a dashboard.',
      'To leave, open your profile menu in the top bar and press Logout. On a phone, open the menu and use Logout there.',
      'Signing out forgets this browser, so the next visit starts back at the login page.'
    ],
    relatedRoutes: [
      { label: 'Sign in', path: '/login' },
      { label: 'Help and Support', path: '/help' }
    ]
  },
  {
    id: 'first-sign-in-with-a-temporary-password',
    categoryId: 'getting-started',
    title: 'Your first sign-in with a temporary password',
    summary: 'An administrator can start your account for you. You must replace that password before you see anything else.',
    roles: ['all'],
    steps: [
      'Sign in with the email on your account and the temporary password you were handed. Copy it carefully: the letters and digits that are easy to mix up, like 0 and O or 1 and l, are left out of those passwords on purpose.',
      'Instead of a dashboard you land on the Set New Password page. Nothing else on the site opens until you finish it.',
      'Choose your own password that passes the rules on the page and confirm it.',
      'You cannot keep the temporary password or reuse it later.',
      'The site then signs you in properly and takes you to the home page for your role: your profile for a student, the leader dashboard for a club leader, the admin tools for an administrator.',
      'A temporary password also has a lifetime, normally 24 hours. If it has run out the login screen tells you to ask an administrator for a new one.'
    ],
    relatedRoutes: [
      { label: 'Set a new password', path: '/set-new-password' },
      { label: 'Sign in', path: '/login' }
    ]
  },
  {
    id: 'if-you-cannot-sign-in',
    categoryId: 'getting-started',
    title: 'If you cannot sign in',
    summary: 'There is no password reset email on this site. A person has to reset it for you.',
    roles: ['all'],
    steps: [
      'Check the email address and caps lock first. The login page only says the details do not match, so a wrong address looks like a wrong password.',
      'This site never sends reset links, codes by email or texts, and the login page has no Forgot password link, so nothing will arrive in your inbox.',
      'If you are still signed in somewhere, open Help and Support and send a request in the Account category.',
      'Otherwise tell a college administrator in person. They issue a fresh temporary password for your account, which replaces the old one and closes any open sessions.',
      'Sign in with that temporary password and set your own on the Set New Password page.'
    ],
    relatedRoutes: [
      { label: 'Help and Support', path: '/help' },
      { label: 'Sign in', path: '/login' }
    ]
  },
  {
    id: 'your-dashboard-and-profile-stats',
    categoryId: 'dashboard',
    title: 'Your dashboard and profile',
    summary: 'Your profile page is the dashboard, and every number on it comes from real activity.',
    roles: ['all'],
    steps: [
      'Open Profile from the top bar to see your details and your activity on one page.',
      'The cards along the top count your registered events, events completed, clubs joined, clubs led and badges earned.',
      'Below them sit your personal and academic information, the clubs you lead, your upcoming events and your event history.',
      'A recent activity list shows your latest points, and the XP and Badges card summarises your total, which is calculated from your verified campus activity.',
      'Press Edit Profile to change what you can fill in yourself, or Account and Settings for the rest.'
    ],
    relatedRoutes: [
      { label: 'Profile', path: '/profile' },
      { label: 'Account settings', path: '/account-settings' }
    ]
  },
  {
    id: 'keeping-track-of-your-activity',
    categoryId: 'dashboard',
    title: 'Keeping track of what you signed up for',
    summary: 'Four pages tell you where you stand: profile, events, calendar and certificates.',
    roles: ['all'],
    steps: [
      'On your profile, the Upcoming Events section lists the events you are registered for that have not finished, so a session already running stays in the list until it ends.',
      'Event History on the same page keeps the events you completed and the ones that were cancelled.',
      'On the Events page a card you are registered for shows Tap to unregister, and turns into a green Attended label once your attendance is recorded.',
      'The Calendar page lists everything you saved, soonest first, and the planner shows the whole campus month.',
      'Anything you earned lands on the Certificates page and in your notification bell.'
    ],
    relatedRoutes: [
      { label: 'Profile', path: '/profile' },
      { label: 'Events', path: '/events' },
      { label: 'Calendar', path: '/calendar' }
    ]
  },
  {
    id: 'the-two-ai-helpers',
    categoryId: 'dashboard',
    title: 'The two AI helpers',
    summary: 'One answers questions about campus life, the other explains how to use the site.',
    roles: ['all'],
    steps: [
      'Campus Clubs AI is the round button in the bottom corner. It answers questions about clubs, events and your own activity because it reads live data from the site.',
      'Sign in first: it only answers for the account you are using. Type your question and press Enter.',
      'ClubAssist lives on the Help and Support page. It only explains how to use the site, using the same guides you are reading now.',
      'Neither one can do anything for you. They cannot register you for an event, issue a certificate or change points; you still do those on the normal pages.',
      'If ClubAssist is switched off on this server, its button and panel simply do not appear. Everything else on the page, including the search box and the support request form, keeps working.'
    ],
    relatedRoutes: [
      { label: 'Help and Support', path: '/help' },
      { label: 'Events', path: '/events' }
    ]
  },
  {
    id: 'browsing-clubs',
    categoryId: 'clubs',
    title: 'Browsing clubs and reading a club card',
    summary: 'Every club on campus is listed on one page, with who is in it and what it is about.',
    roles: ['all'],
    steps: [
      'Open Clubs from the top bar. You need to be signed in to see the page.',
      'Each club is a card with its name, a short description and how many members it has.',
      'Press Join on a card to open the membership box, which repeats the club description so you know what you are signing up for.',
      'Once you are a member the button changes to a joined state, and pressing it again gives you your place back.',
      'There is no search box on this page yet, so scroll the list. The Events page can be filtered by club once you know the name.'
    ],
    relatedRoutes: [{ label: 'Clubs', path: '/clubs' }]
  },
  {
    id: 'joining-and-leaving-a-club',
    categoryId: 'clubs',
    title: 'Joining and leaving a club',
    summary: 'Membership is instant both ways, with one exception for leaders.',
    roles: ['all'],
    steps: [
      'Tick the agreement box in the pop-up and press Join Club. Nobody has to approve you.',
      'You can be a member of as many clubs as you like.',
      'Leaving works the same way: press the joined button on the club card and confirm.',
      'Joining a club does not sign you up for anything. Events are separate and you register for them on the Events page.',
      'A club leader cannot leave the club they run. Hand it to another member first, then you are free to leave.',
      'If a club is deleted, its membership list goes with it and you simply stop seeing it.'
    ],
    relatedRoutes: [
      { label: 'Clubs', path: '/clubs' },
      { label: 'Events', path: '/events' }
    ]
  },
  {
    id: 'running-a-club-you-lead',
    categoryId: 'clubs',
    title: 'Running a club you lead',
    summary: 'Leaders get a dashboard with their clubs, their standing and the handover control.',
    roles: ['club_leader', 'admin'],
    steps: [
      'Open Dashboard in the top bar, or go straight to the leader dashboard, to see the clubs you manage.',
      'The cards at the top count clubs you lead, events you hosted, how many are upcoming and your total members.',
      'Press Edit details on a club to change its name, category and description.',
      'The club leaderboard standing box shows your club score, verified participants, events hosted and sessions credited, plus your top contributor.',
      'Under Hand the club to another member, pick a member and confirm to make them the new leader. They must have joined the club first.',
      'After a handover you are no longer the leader of that club, so you can leave it or keep helping as a member.'
    ],
    relatedRoutes: [
      { label: 'Leader dashboard', path: '/leader' },
      { label: 'Clubs', path: '/clubs' }
    ]
  },
  {
    id: 'browsing-and-filtering-events',
    categoryId: 'events',
    title: 'Browsing and filtering events',
    summary: 'The Events page holds the whole campus schedule and lets you narrow it down.',
    roles: ['all'],
    steps: [
      'Open Events to see every published event as a card.',
      'Use the Find events card to search by name, or narrow it with the status, category and club selectors.',
      'Change the sort selector to order by date, newest or title, and press Clear filters to start again.',
      'The line under the filters tells you how many events were found.',
      'Each card shows the status, start and end, the place or To be announced, and how many of the places are taken.',
      'The status decides what you can do: Upcoming allows registering and cancelling, Ongoing allows checking in, Completed is history and Cancelled is off.'
    ],
    relatedRoutes: [
      { label: 'Events', path: '/events' },
      { label: 'Calendar', path: '/calendar' }
    ]
  },
  {
    id: 'registering-and-cancelling',
    categoryId: 'events',
    title: 'Saving a place and giving it back',
    summary: 'Registration opens when an event is published and closes the moment it starts.',
    roles: ['all'],
    steps: [
      'Press Register on an upcoming event card and confirm in the box.',
      'You only need to be signed in. Club membership is not required and there is nothing to pay.',
      'When every place is gone the button reads Full and further registrations are refused, so the room is never overbooked.',
      'You cannot take the same event twice on one account.',
      'To give your place back press Tap to unregister and confirm. That works any time before the start and throws away any check-in code you had opened.',
      'Once the event has started the button disappears. If the organiser cancels it, everyone on campus gets an announcement and the registrations are void.'
    ],
    relatedRoutes: [
      { label: 'Events', path: '/events' },
      { label: 'Calendar', path: '/calendar' }
    ]
  },
  {
    id: 'checking-in-with-your-code',
    categoryId: 'events',
    title: 'Event details and your check-in code',
    summary: 'Your code proves you turned up, and that is what unlocks points and a certificate.',
    roles: ['all'],
    steps: [
      'An event card shows its start and end, location, the club running it and how full it is.',
      'The status label reads Upcoming, Ongoing, Completed or Cancelled, worked out from the clock, so you always know whether it is running.',
      'While the event is Ongoing, press Check in on the card to open your ticket.',
      'The ticket shows a QR code and the same code as text, with a copy button in case the screen is hard to scan.',
      'Show it to the organiser. Attendance is recorded once, for that event only.',
      'The code belongs to you and stays valid for 12 hours after it is made, so do not post it in a group chat. Close and reopen the ticket if you need a fresh one.',
      'After the organiser verifies it, the card shows Attended and you cannot be checked in again.'
    ],
    relatedRoutes: [
      { label: 'Events', path: '/events' },
      { label: 'Certificates', path: '/certificates' }
    ]
  },
  {
    id: 'publishing-an-event',
    categoryId: 'events',
    title: 'Creating and publishing an event',
    summary: 'Title, description, both times and a club are the four things the site insists on.',
    roles: ['club_leader', 'admin'],
    steps: [
      'On the leader dashboard press New event, or use the create form on the Events page.',
      'Pick the club. As a leader you can only publish for a club you run; an administrator can publish for any club.',
      'Write the title and description, then set the start and the end. The end time has to be after the start.',
      'Set the capacity, the location and a category. Capacity is how many places the event has; the form prefills a number you can change before you publish.',
      'Choose the activity type, because it fixes what a verified check-in is worth: Event 10, Workshop 15, Competition 20, Volunteering 20.',
      'Leave certificates switched on unless this session should not hand one out.',
      'Publishing sends an announcement to the campus so people can register.',
      'The same form edits the event later. Cancel pulls it and tells everyone; delete removes it for good.'
    ],
    relatedRoutes: [
      { label: 'Leader dashboard', path: '/leader' },
      { label: 'Events', path: '/events' }
    ]
  },
  {
    id: 'running-the-check-in-desk',
    categoryId: 'events',
    title: 'Running the check-in desk',
    summary: 'Verify a student code at the door and attendance lands on the record immediately.',
    roles: ['club_leader', 'admin'],
    steps: [
      'The check-in desk appears under an event in the leader dashboard while that event is ongoing.',
      'Press Scan QR and point the camera at the student ticket. Reading the code yourself only works while the page is open.',
      'If the camera is not available, press the option to verify a code by hand and paste what the student reads out or sends.',
      'A good code records attendance on the spot, which also issues the certificate and the activity points.',
      'A code from a different event is refused, and an expired one tells you to ask for a fresh ticket.',
      'Nobody can be checked in twice for the same event, and only the organiser of that event or an administrator can use the desk.'
    ],
    relatedRoutes: [
      { label: 'Leader dashboard', path: '/leader' },
      { label: 'Events', path: '/events' }
    ]
  },
  {
    id: 'attendance-results-and-organisers',
    categoryId: 'events',
    title: 'Roster, attendance and results',
    summary: 'Everything you fix by hand for one event lives in its roster.',
    roles: ['club_leader', 'admin'],
    steps: [
      'Press Roster on an event card to list every registered student and whether they are marked present.',
      'Use Mark present for someone whose code would not scan. Only students on the registration list can be marked.',
      'Marking present does exactly what a QR check-in does: the certificate and the activity points are issued at the same moment.',
      'Press Undo beside a name to take that attendance back. The certificate is removed and the points are reversed.',
      'For a competition, press Mark winner on the winners and then Record results. Winners get 50 XP, once per event, and must be on the roster.',
      'Credit organisers pays 30 XP to the person who runs the club for that event, once per event, and it will not pay twice.'
    ],
    relatedRoutes: [
      { label: 'Leader dashboard', path: '/leader' },
      { label: 'Events', path: '/events' }
    ]
  },
  {
    id: 'how-certificates-are-issued',
    categoryId: 'certificates',
    title: 'How certificates are issued',
    summary: 'A certificate appears by itself when you actually attended an eligible event.',
    roles: ['all'],
    steps: [
      'Three things have to be true: you were registered, the organiser recorded your attendance, and the event has certificates switched on.',
      'Attendance is recorded either by scanning your check-in code or by the organiser marking you present from the roster.',
      'The moment both happen the certificate is created. There is nothing to apply for, no form and no fee.',
      'A session with certificates turned over gives a certificate; a plain session with them switched off gives points only.',
      'If the organiser undoes your attendance later, the certificate is withdrawn with it.',
      'Every certificate carries its own verification code, which is what makes it checkable by other people.'
    ],
    relatedRoutes: [
      { label: 'Certificates', path: '/certificates' },
      { label: 'Events', path: '/events' }
    ]
  },
  {
    id: 'downloading-and-verifying-a-certificate',
    categoryId: 'certificates',
    title: 'Downloading and proving a certificate',
    summary: 'Save the PDF and share a public link anyone can check for themselves.',
    roles: ['all'],
    steps: [
      'Open Certificates to see every certificate on your account as a card.',
      'Press View to read it on screen, or Download Certificate to save the PDF to your device.',
      'The PDF is a landscape Certificate of Participation with your name, the event, the issuing club and a verification link.',
      'Press Verify on the card to open its public link in a browser.',
      'That link is what you hand to a placement office or another college. It opens without signing in and shows the recipient, the event, the club and the dates.',
      'A wrong or retired link simply says the certificate could not be verified; nothing about other students is revealed.'
    ],
    relatedRoutes: [
      { label: 'Certificates', path: '/certificates' },
      { label: 'Profile', path: '/profile' }
    ]
  },
  {
    id: 'earning-xp',
    categoryId: 'leaderboard',
    title: 'Earning XP',
    summary: 'Points come from verified activity, never from simply putting your name down.',
    roles: ['all'],
    steps: [
      'XP is credited when an organiser confirms you were there, not when you register.',
      'The rate follows the activity type: Event 10, Workshop 15, Competition 20, Volunteering 20.',
      'One verified session gives one base award, so a competition entrant earns 20 rather than 20 plus 10.',
      'Winning a judged competition adds 50 on top, once per event, when the organiser records the results.',
      'Running an event pays 30 to the organiser credited for it.',
      'Badges add a bonus on top of the session points, from 25 for your first event to 250 for reaching 500 lifetime XP.',
      'An administrator can also add or remove points with a written reason, and every entry stays in your XP history.'
    ],
    relatedRoutes: [
      { label: 'Leaderboard', path: '/leaderboard' },
      { label: 'Profile', path: '/profile' }
    ]
  },
  {
    id: 'reading-the-leaderboard',
    categoryId: 'leaderboard',
    title: 'Reading the leaderboard',
    summary: 'The ranking is ordered by points, ties share a place, and you can view a week or a term.',
    roles: ['all'],
    steps: [
      'Open Leaderboard for the student ranking, and switch to the Clubs tab for club standings.',
      'Pick a period: All time, This week, This month or Semester. A week starts on Monday.',
      'Narrow the student list by semester or department, or search by name, student ID or department. Email addresses are never searched.',
      'The list is ordered by total points. Students on the same total share a rank and the next place skips, like a competition table.',
      'Only students with at least one point are ranked, and the top twenty show at a time. The page refreshes itself every 30 seconds.',
      'Your position card tells you where you sit out of everyone ranked and how close you are to the next level.',
      'A club score counts the points earned through that club events, so a personal badge bonus does not lift every club its holder has joined.'
    ],
    relatedRoutes: [
      { label: 'Leaderboard', path: '/leaderboard' },
      { label: 'Profile', path: '/profile' }
    ]
  },
  {
    id: 'how-notifications-reach-you',
    categoryId: 'notifications',
    title: 'What lands in your notifications',
    summary: 'Everything the site tells you arrives in the bell, never in your email.',
    roles: ['all'],
    steps: [
      'The bell in the top bar carries a count of everything you have not read.',
      'Campus-wide announcements appear for everyone: a new event, a cancellation or a general notice from the administration.',
      'Personal messages appear only for you, for example a reply to your support request or news about your own attendance.',
      'A reminder arrives shortly before an event you registered for, or one you saved to your calendar, starts.',
      'Nothing is delivered by email or text message. If it is not in the bell, the site did not send it.',
      'Open the Notifications page from the bell menu or from the page itself.'
    ],
    relatedRoutes: [
      { label: 'Notifications', path: '/notifications' },
      { label: 'Events', path: '/events' }
    ]
  },
  {
    id: 'managing-your-notification-list',
    categoryId: 'notifications',
    title: 'Managing your notification list',
    summary: 'Read them, clear them all or delete one at a time.',
    roles: ['all'],
    steps: [
      'Open the Notifications page to see your newest items first.',
      'Press an item to mark it read. Items about an event carry a View event link that opens the Events page.',
      'Mark all as read clears the unread count in one press.',
      'The delete icon on an item removes it from your list.',
      'Deleting removes it for you. An announcement sent to the whole campus stays visible to everybody else.',
      'Announcements cannot be switched off, but event reminders can be, in the Notifications part of your account settings.'
    ],
    relatedRoutes: [
      { label: 'Notifications', path: '/notifications' },
      { label: 'Account settings', path: '/account-settings' }
    ]
  },
  {
    id: 'using-the-campus-planner',
    categoryId: 'calendar',
    title: 'The campus planner',
    summary: 'A month view of everything on campus, plus your own saved events and day notes.',
    roles: ['all'],
    steps: [
      'Open Calendar to see the month grid with campus events sitting on their days.',
      'Move through the months with the arrows beside the month name.',
      'Press a day to read what happens on it and to write yourself a note, up to 240 characters.',
      'My calendar lists the events you chose to save, soonest first, and Agenda gives the same list as a plain schedule.',
      'Your saved events and notes are yours alone. No other student or organiser can see them.',
      'You can keep up to 100 saved events and 200 notes, so clear old ones as the term moves on.',
      'If an organiser deletes an event you had saved, it simply disappears from your calendar.'
    ],
    relatedRoutes: [
      { label: 'Calendar', path: '/calendar' },
      { label: 'Events', path: '/events' }
    ]
  },
  {
    id: 'add-to-calendar-and-reminders',
    categoryId: 'calendar',
    title: 'Adding events to your own calendar',
    summary: 'Save an event on the site, or take it out to a calendar app of your own.',
    roles: ['all'],
    steps: [
      'On an upcoming or ongoing event press Add to my calendar. It then reads In my calendar.',
      'The same control offers a downloadable .ics file and a Google Calendar link, so the event can live outside this site as well.',
      'The .ics file uses the ordinary calendar format, so most calendar apps import it.',
      'A saved event counts for the site reminder too, alongside the events you registered for.',
      'Reminders go out about 30 minutes before the start, once per event, using the clock on the server.',
      'Turn them off with the Event Reminders switch in your account settings.'
    ],
    relatedRoutes: [
      { label: 'Calendar', path: '/calendar' },
      { label: 'Account settings', path: '/account-settings' }
    ]
  },
  {
    id: 'changing-your-password',
    categoryId: 'account',
    title: 'Changing your password',
    summary: 'Pick a new password whenever you like from your account settings.',
    roles: ['all'],
    steps: [
      'Open Account and Settings and go to the Security section.',
      'Type your current password, then the new one, then type the new one again to confirm.',
      'A password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a special character. Anything up to 128 characters is accepted.',
      'It also has to be different from the password you are using now.',
      'The checklist under the field shows which rules you still have to meet.',
      'After saving, your old password stops working everywhere and any earlier session on another device is turned off. This browser stays signed in.',
      'If it is refused, the message names the rule the new password broke.'
    ],
    relatedRoutes: [{ label: 'Account settings', path: '/account-settings' }]
  },
  {
    id: 'editing-your-profile-and-photo',
    categoryId: 'account',
    title: 'Editing your profile details and photo',
    summary: 'Most of what the site shows about you is yours to change.',
    roles: ['all'],
    steps: [
      'Open Account and Settings, or press Edit Profile on your profile page.',
      'You can change your name, student ID, personal email, department, year, semester, course, section, bio, gender, date of birth, phone and address.',
      'The email address you sign in with is not on that list, so it stays as it is.',
      'For a picture, choose a PNG, JPG or WEBP file under 8 MB. The site shrinks it to about 512 pixels before saving.',
      'Press Save. If the picture is still too large to store, the site tells you and keeps the old one.',
      'Keep your name, student ID and department correct: the leaderboard searches and filters use them.'
    ],
    relatedRoutes: [
      { label: 'Account settings', path: '/account-settings' },
      { label: 'Profile', path: '/profile' }
    ]
  },
  {
    id: 'theme-and-notification-switches',
    categoryId: 'account',
    title: 'Theme and notification switches',
    summary: 'The look of the site and your reminder switch both live in account settings.',
    roles: ['all'],
    steps: [
      'Open Account and Settings and go to Appearance.',
      'Choose Light, Dark or System. System follows whatever your device is set to, and your choice is remembered in this browser.',
      'The theme switch is also available from the top bar at any time.',
      'Go to the Notifications section for the switches: Push Notifications, Event Reminders and Membership Renewal Alerts.',
      'Event Reminders is the one that changes what reaches you. Off means no reminder before an event you are going to.',
      'The email and text switches on that page do nothing, because this site delivers no email and no text. Everything appears in the bell.',
      'Press Save with your profile changes to keep them.'
    ],
    relatedRoutes: [
      { label: 'Account settings', path: '/account-settings' },
      { label: 'Notifications', path: '/notifications' }
    ]
  },
  {
    id: 'downloading-your-data',
    categoryId: 'account',
    title: 'Downloading a copy of your data',
    summary: 'You can export what the platform holds about you. Closing an account needs a person.',
    roles: ['all'],
    steps: [
      'Open Account and Settings and go to Data and privacy.',
      'Press Download my data. The site builds a JSON file with your profile, event history, certificates, notifications and your points ledger.',
      'Passwords and any sign-in or verification codes are stripped out of the file, because anyone holding one of those could act as you.',
      'The file is produced in your browser. If nothing appears, allow downloads for this site.',
      'There is no delete my account button anywhere on the site.',
      'If your account should be closed, send a support request from the Help and Support page, or speak to an administrator.'
    ],
    relatedRoutes: [
      { label: 'Account settings', path: '/account-settings' },
      { label: 'Help and Support', path: '/help' }
    ]
  },
  {
    id: 'admin-tools-overview',
    categoryId: 'admin',
    title: 'The administrator tools at a glance',
    summary: 'One page with seven tabs covers accounts, clubs, events, announcements, support and points.',
    roles: ['admin'],
    steps: [
      'Open Admin from the top bar. Only an administrator account gets past the door.',
      'Dashboard holds the campus totals and the charts.',
      'Users lists every account with its clubs, events, join date and password status, and searches by name, email or role.',
      'Clubs and Events give you the same powers a club leader has, but across every club on campus.',
      'Notifications sends a campus-wide announcement and shows what you have already sent.',
      'Support is the help desk queue that feeds from the Help and Support page.',
      'Gamification covers point awards, the badge catalog, the analytics and the exports.',
      'Everything here changes real records, so read the confirm dialog before deleting or recomputing.'
    ],
    relatedRoutes: [
      { label: 'Admin tools', path: '/admin' },
      { label: 'Help and Support', path: '/help' }
    ]
  },
  {
    id: 'creating-accounts-and-temporary-passwords',
    categoryId: 'admin',
    title: 'Creating accounts and issuing temporary passwords',
    summary: 'You make the account, the system makes the password, and the person must replace it.',
    roles: ['admin'],
    steps: [
      'On the Users tab press Create account.',
      'Fill in the name, the college email and the role: Student, Club leader or Administrator. Student ID and department are optional, and the department feeds the leaderboard filters.',
      'Press Create and show password. The system generates a 14 character temporary password and shows it once, with a copy button.',
      'Pass it over through a channel you trust rather than a public group. Only a hashed copy is stored, and the card shows the expiry time, normally 24 hours after creation.',
      'The new person must set their own password before any dashboard opens. The users table reads Awaiting first login until they do, and Link expired once the window has passed.',
      'Press New temp password on that row to replace a lost or expired password. It ends any session that account has open, and it is not available on your own row.',
      'There is no role editor: a role is fixed when the account is created, and the only in-app route to club leader is a club handover.'
    ],
    relatedRoutes: [
      { label: 'Admin tools', path: '/admin' },
      { label: 'Set a new password', path: '/set-new-password' }
    ]
  },
  {
    id: 'managing-clubs-and-events-as-an-administrator',
    categoryId: 'admin',
    title: 'Creating clubs and looking after every event',
    summary: 'Administrators create the clubs, then run or repair any club events.',
    roles: ['admin'],
    steps: [
      'Students cannot create a club, so use the Clubs tab. Name and description are required.',
      'You are recorded as the creator and the club starts with you in its member list.',
      'Editing works on any club, not only the ones you made. A leader can edit their own club too.',
      'A club that still has events cannot be deleted. Cancel or delete those events first.',
      'On the Events tab you can publish an event for any club, change its details, cancel it or delete it.',
      'Cancelling sends a campus announcement and voids registrations; putting it back on the schedule sends another.',
      'You can open any check-in desk, correct a roster and undo attendance that was recorded wrongly.'
    ],
    relatedRoutes: [
      { label: 'Admin tools', path: '/admin' },
      { label: 'Events', path: '/events' },
      { label: 'Clubs', path: '/clubs' }
    ]
  },
  {
    id: 'sending-announcements',
    categoryId: 'admin',
    title: 'Sending announcements',
    summary: 'One form puts a message in every bell on campus.',
    roles: ['admin'],
    steps: [
      'Open the Notifications tab on the admin page.',
      'Add a title, choose a type of Information, Alert or Event, and write the message.',
      'Press Send Notification. Every signed-in person sees it in their bell.',
      'It is a broadcast: there is no way to aim it at one department, one club or one year.',
      'The list under the form shows what has already gone out.',
      'Deleting a broadcast removes it for everyone, so check the wording before you delete.',
      'New events and cancellations announce themselves, so there is no need to duplicate those by hand.'
    ],
    relatedRoutes: [
      { label: 'Admin tools', path: '/admin' },
      { label: 'Notifications', path: '/notifications' }
    ]
  },
  {
    id: 'adjusting-points-badges-and-reports',
    categoryId: 'admin',
    title: 'Adjusting points, badges and reports',
    summary: 'The Gamification tab is where the points ledger is corrected, audited and exported.',
    roles: ['admin'],
    steps: [
      'Search for a student by name, student ID or department to open their ledger.',
      'Use Award or deduct to write an entry with a type, an amount and a reason. The reason is compulsory and one entry cannot pass 1000 points in either direction.',
      'Any entry can be reversed afterwards, which writes the opposite number and pulls the student total back down. Badges are re-checked, but a reversal does not withdraw a certificate — only an organiser undoing the attendance, or deleting the event, does that.',
      'The badge catalog is editable here: title, description, the metric it watches, the threshold and the bonus between 0 and 5000 XP.',
      'Analytics shows points by activity and by department, the entries that look unusual and any cached total that disagrees with the ledger.',
      'Run recompute settles unpaid attendance, rebuilds the cached totals and re-awards badges. It never removes an award that has already been paid.',
      'Leaderboard reports export as CSV for the same periods the students see.'
    ],
    relatedRoutes: [
      { label: 'Admin tools', path: '/admin' },
      { label: 'Leaderboard', path: '/leaderboard' }
    ]
  },
  {
    id: 'working-the-support-queue',
    categoryId: 'admin',
    title: 'Working the support queue',
    summary: 'Requests from the Help and Support page land in the Support tab.',
    roles: ['admin'],
    steps: [
      'Open the Support tab to see the queue newest first, with counts for each status.',
      'Filter by status: Open, In progress, Resolved or Closed, or by category, or search the text and the requester email.',
      'A new request also arrives as a personal notification to every administrator.',
      'Open a request to read it, set its status and write a reply of up to 2000 characters.',
      'A request cannot be moved to Resolved or Closed until you have written that reply.',
      'The student is notified when you answer and sees your reply with the status on their Help page. The reference shown when the request arrives is what they can quote back to you.',
      'Only administrators reach this queue. A club leader cannot see or answer requests.'
    ],
    relatedRoutes: [
      { label: 'Admin tools', path: '/admin' },
      { label: 'Help and Support', path: '/help' }
    ]
  }
];

export const HELP_FAQS = [
  {
    id: 'faq-1',
    categoryId: 'getting-started',
    question: 'What makes a password strong enough on this site?',
    answer:
      'At least 8 characters, with one uppercase letter, one lowercase letter, one number and one special character. Anything up to 128 characters is accepted. The checklist under the password box shows which of those you still need.',
    roles: ['all']
  },
  {
    id: 'faq-2',
    categoryId: 'getting-started',
    question: 'My temporary password no longer works. What now?',
    answer:
      'Temporary passwords normally last 24 hours, and the login page tells you when one has expired. Nothing can renew it from your side: ask a college administrator to issue a new one, then set your own password on the Set New Password page.',
    roles: ['all']
  },
  {
    id: 'faq-3',
    categoryId: 'getting-started',
    question: 'I forgot my password. Is there a reset link?',
    answer:
      'No. This site has no self-service reset, no Forgot password link and sends no email or text with a code. An administrator issues a fresh temporary password for your account, which replaces the old one and signs you out everywhere.',
    roles: ['all']
  },
  {
    id: 'faq-4',
    categoryId: 'getting-started',
    question: 'Can I sign up as a club leader or an administrator?',
    answer:
      'No. The role choice on the sign-up form does not stick: a self-registered account is always created as a student. Leaders and administrators are created by an administrator, and the one in-app path to becoming a leader is being handed a club.',
    roles: ['all']
  },
  {
    id: 'faq-5',
    categoryId: 'getting-started',
    question: 'Do I have to install an app?',
    answer:
      'No. Campus Clubs is a responsive website: it reflows for a phone or tablet in the browser you already use, with a collapsed menu and the same pages. There is no app to download and nothing works offline.',
    roles: ['all']
  },
  {
    id: 'faq-6',
    categoryId: 'getting-started',
    question: 'Where do I get help if a guide does not cover my problem?',
    answer:
      'Search the Help and Support page first, then try ClubAssist in the corner. If neither answers, send a support request from the form on that page, choosing the category that fits.',
    roles: ['all']
  },
  {
    id: 'faq-7',
    categoryId: 'dashboard',
    question: 'What do the numbers on my profile actually count?',
    answer:
      'Registered Events counts events you are signed up for, Events Completed counts the sessions you were marked present at, Clubs Joined and Clubs Led count your memberships, and Badges Earned counts the milestones you have passed. They are read from real records, so there is nothing to update by hand.',
    roles: ['all']
  },
  {
    id: 'faq-8',
    categoryId: 'clubs',
    question: 'How many clubs can I join?',
    answer:
      'As many as you like. Joining is instant and there is no application or approval step, so pressing Join is the whole process.',
    roles: ['all']
  },
  {
    id: 'faq-9',
    categoryId: 'clubs',
    question: 'Who can create a club?',
    answer:
      'Only an administrator. The Create club button on the Clubs page and the Clubs tab of the admin tools are the two ways a club comes into existence, and the creator is recorded as the club admin.',
    roles: ['all']
  },
  {
    id: 'faq-10',
    categoryId: 'clubs',
    question: 'Why will the site not let me leave my own club?',
    answer:
      'A club cannot be left without a leader, so a leader is refused with a message telling them to transfer it first. Use Hand the club to another member on the leader dashboard, then you can leave as an ordinary member.',
    roles: ['club_leader', 'admin']
  },
  {
    id: 'faq-11',
    categoryId: 'clubs',
    question: 'Can I remove someone from my club?',
    answer:
      'No. Members join and leave themselves from the Clubs page, and there is no kick or approve control anywhere. What a leader can do is hand the club to another member, which makes that person the leader.',
    roles: ['club_leader', 'admin']
  },
  {
    id: 'faq-12',
    categoryId: 'clubs',
    question: 'What happens to a club with events when I delete it?',
    answer:
      'The deletion is refused while events still point at the club. Cancel or delete those events first, then remove the club. Anything students saved to their own calendar for those events simply disappears from their list.',
    roles: ['admin']
  },
  {
    id: 'faq-13',
    categoryId: 'events',
    question: 'What happens when an event is full?',
    answer:
      'The button reads Full and further registrations are refused, so the number of places is a real limit rather than a suggestion. There is no waiting list. An organiser can raise the capacity on the event form if the room allows it.',
    roles: ['all']
  },
  {
    id: 'faq-14',
    categoryId: 'events',
    question: 'Can I cancel my registration?',
    answer:
      'Yes, any time before the event starts: press Tap to unregister on the card and confirm. Your place goes back to the pool. Once the event has started the button is gone, and if you then do not check in nothing is recorded against you.',
    roles: ['all']
  },
  {
    id: 'faq-15',
    categoryId: 'events',
    question: 'Can I register for a friend or take two places?',
    answer:
      'No. A registration belongs to the signed-in account, one place per person per event, and a second attempt on the same event is refused. There is also no way to book on somebody elses behalf.',
    roles: ['all']
  },
  {
    id: 'faq-16',
    categoryId: 'events',
    question: 'Does the check-in code expire?',
    answer:
      'Yes. The code is tied to you and to that one event, and it stops working 12 hours after you open the ticket. Close and reopen the ticket on the event card for a fresh one, and have the organiser use the roster if a code keeps failing.',
    roles: ['all']
  },
  {
    id: 'faq-17',
    categoryId: 'events',
    question: 'Do I have to be in the club to go to its event?',
    answer:
      'No. Club membership and event registration are separate. Anyone signed in can register for any published event that still has places.',
    roles: ['all']
  },
  {
    id: 'faq-18',
    categoryId: 'events',
    question: 'Can I register a student for an event myself?',
    answer:
      'No. Students register themselves, and the roster tools only work on people already on the list: you can mark them present or mark a winner, but you cannot add a name to the registration.',
    roles: ['club_leader', 'admin']
  },
  {
    id: 'faq-19',
    categoryId: 'certificates',
    question: 'Why is there no certificate for an event I attended?',
    answer:
      'Three usual reasons: the organiser never recorded your attendance, you were not registered for the event, or certificates were switched off for that event. Points and a certificate both need a recorded attendance.',
    roles: ['all']
  },
  {
    id: 'faq-20',
    categoryId: 'certificates',
    question: 'How can someone else check that my certificate is real?',
    answer:
      'Every certificate carries its own verification link, printed on the PDF and reachable from the Verify button. Anyone opening it sees the recipient, the event, the issuing club and the dates without signing in, and an unknown code just says it could not be verified.',
    roles: ['all']
  },
  {
    id: 'faq-21',
    categoryId: 'leaderboard',
    question: 'Two of us have the same points. Who is ahead?',
    answer:
      'Nobody. Students with the same total share a rank and the next position is skipped, the way a competition table works, so two people on rank 3 are followed by rank 5.',
    roles: ['all']
  },
  {
    id: 'faq-22',
    categoryId: 'leaderboard',
    question: 'How much is each activity worth?',
    answer:
      'A verified event is 10, a workshop 15, a competition entry 20, volunteering 20, organising an event 30 and a competition win 50 on top of the entry. Badge bonuses run from 25 to 250.',
    roles: ['all']
  },
  {
    id: 'faq-23',
    categoryId: 'leaderboard',
    question: 'Can I see another student attendance sheet?',
    answer:
      'No. Rosters and attendance are visible only to the organiser of that event and to administrators. Elsewhere the most another student sees of you is your name, department and total on the leaderboard.',
    roles: ['all']
  },
  {
    id: 'faq-24',
    categoryId: 'leaderboard',
    question: 'Does joining a club earn points?',
    answer:
      'No. Points come from verified activity on events. Leading a club counts towards the Club Leader badge, worth 80 XP, but ordinary membership grants nothing on its own.',
    roles: ['all']
  },
  {
    id: 'faq-25',
    categoryId: 'notifications',
    question: 'Can I turn notifications off?',
    answer:
      'You can switch off the reminder before an event starts, in the Notifications part of account settings. Everything else, such as campus announcements and replies to your own support request, keeps arriving in the bell. Nothing is sent by email or text at all.',
    roles: ['all']
  },
  {
    id: 'faq-26',
    categoryId: 'notifications',
    question: 'When exactly does the event reminder come?',
    answer:
      'About 30 minutes before the start, once per event, for events you registered for or saved to your calendar. It is a notification inside the site, so you have to have the page open to see it at that moment.',
    roles: ['all']
  },
  {
    id: 'faq-27',
    categoryId: 'calendar',
    question: 'Does the calendar sync with Google Calendar?',
    answer:
      'Not both ways. You can send a single event out with the Google Calendar link or the downloadable .ics file, and the site keeps its own list of the events you saved. Deleting an event on the campus side does not reach a calendar app.',
    roles: ['all']
  },
  {
    id: 'faq-28',
    categoryId: 'calendar',
    question: 'How much can I keep in the planner?',
    answer:
      'Up to 100 saved events and up to 200 personal notes, with each note capped at 240 characters. If the calendar says it is full, remove an old event before adding another.',
    roles: ['all']
  },
  {
    id: 'faq-29',
    categoryId: 'account',
    question: 'Can I change the email address I sign in with?',
    answer:
      'No. The login email cannot be edited anywhere on the site, and the personal email field on your profile is separate information. If the address is wrong, send a support request and describe what needs correcting.',
    roles: ['all']
  },
  {
    id: 'faq-30',
    categoryId: 'account',
    question: 'Is there a dark mode?',
    answer:
      'Yes. Appearance in account settings offers Light, Dark and System, and the top bar has the same toggle. Your choice is remembered in this browser, so a different device starts from the default again.',
    roles: ['all']
  },
  {
    id: 'faq-31',
    categoryId: 'account',
    question: 'How big can my profile picture be?',
    answer:
      'Choose a PNG, JPG or WEBP file no larger than 8 MB. The site resizes it to about 512 pixels before saving, and if the result is still too big it tells you and keeps your current picture. Press Save to apply it.',
    roles: ['all']
  },
  {
    id: 'faq-32',
    categoryId: 'account',
    question: 'Can I delete my account myself?',
    answer:
      'No. The only self-service control on the Data and privacy page is Download my data, which gives you a JSON copy of your profile, event history, certificates, notifications and points ledger. To close an account, send a support request or speak to an administrator.',
    roles: ['all']
  },
  {
    id: 'faq-33',
    categoryId: 'account',
    question: 'How long does a support request take to answer?',
    answer:
      'There is no promised response time on this site. Administrators see your request in their queue with a status of Open, In progress, Resolved or Closed, and you get a notification the moment someone replies. The confirmation screen shows a reference for the request, and your list of requests sits under the form.',
    roles: ['all']
  },
  {
    id: 'faq-34',
    categoryId: 'admin',
    question: 'Can I change someone role after their account exists?',
    answer:
      'No. There is no role editor in the Users tab. A role is fixed when the account is created, and the only in-app movement is a club handover, which promotes the receiving member to club leader.',
    roles: ['admin']
  },
  {
    id: 'faq-35',
    categoryId: 'admin',
    question: 'What does the recompute job actually do?',
    answer:
      'It scans attendance history, writes any missing awards, rebuilds every cached total and re-evaluates badges. It is safe to run twice and it cannot remove an award that has already been paid, so use reversals in the ledger for corrections.',
    roles: ['admin']
  },
  {
    id: 'faq-36',
    categoryId: 'admin',
    question: 'Can a club leader answer a support request?',
    answer:
      'No. The queue and the reply box sit behind the administrator check. A leader sees only their own clubs, events and rosters, so route account and certificate questions to an administrator.',
    roles: ['admin']
  },
  {
    id: 'faq-37',
    categoryId: 'leaderboard',
    question: 'What do the level names on the board mean?',
    answer:
      'A level is just your lifetime points read a different way. The first step costs 100 XP and every step after that costs 25 more, and the titles run from Freshface through Participant, Contributor, Regular and higher up to Campus Legend. Your level never drops, and badge milestones such as your first event, five events attended or four active weeks appear on your profile as you pass them.',
    roles: ['all']
  },
  {
    id: 'faq-38',
    categoryId: 'events',
    question: 'An event I registered for was cancelled. What happens to me?',
    answer:
      'Everyone on campus gets an announcement, the registration is treated as void and no attendance or points are taken. You do not have to cancel anything yourself, and the event simply drops out of your upcoming list. If it is put back on the schedule, another announcement tells you.',
    roles: ['all']
  }
];
