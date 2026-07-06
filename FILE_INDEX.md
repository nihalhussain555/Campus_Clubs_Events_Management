# 📑 Complete File Index

## Project Root Files

### Documentation
- **README.md** - Full project documentation with features, tech stack, and detailed setup instructions
- **SETUP.md** - Quick start guide with environment setup and testing instructions
- **API_DOCUMENTATION.md** - Complete API reference with all endpoints, request/response examples
- **PROJECT_SUMMARY.md** - Completion summary with features checklist and deployment guide
- **FILE_INDEX.md** - This file - navigation guide for all project files

---

## Backend Files (`backend/`)

### Package Configuration
- **package.json** - Node.js dependencies and scripts
  - Dependencies: express, mongoose, dotenv, jsonwebtoken, bcryptjs, cors, express-validator
  - Scripts: `start` (production), `dev` (development with nodemon)

### Configuration (`backend/config/`)
- **db.js** - MongoDB connection setup with error handling

### Database Models (`backend/models/`)
- **User.js** - User schema
  - Fields: name, email, password, role, joinedClubs, registeredEvents, createdAt
  - Includes email validation and unique constraint

- **Club.js** - Club schema
  - Fields: clubName, description, members, admin, createdAt
  - References User model for members and admin

- **Event.js** - Event schema
  - Fields: title, description, date, location, club, registeredStudents, capacity, status, createdAt
  - Includes status enum: upcoming, ongoing, completed, cancelled

### Controllers (`backend/controllers/`)
- **authController.js** - Authentication logic
  - `signup()` - User registration with password hashing
  - `login()` - User login with JWT token generation
  - `getUserProfile()` - Get authenticated user's profile
  - `getAllUsers()` - Get all users (admin only)

- **clubController.js** - Club management logic
  - `createClub()` - Create new club (admin)
  - `getAllClubs()` - Get all clubs
  - `getClubById()` - Get specific club
  - `updateClub()` - Update club details (admin)
  - `deleteClub()` - Delete club (admin)
  - `joinClub()` - Student joins club
  - `leaveClub()` - Student leaves club

- **eventController.js** - Event management logic
  - `createEvent()` - Create new event (admin)
  - `getAllEvents()` - Get all events
  - `getEventById()` - Get specific event
  - `getEventsByClub()` - Get events by club
  - `updateEvent()` - Update event details (admin)
  - `deleteEvent()` - Delete event (admin)
  - `registerForEvent()` - Student registers for event
  - `unregisterFromEvent()` - Student unregisters from event
  - `getUpcomingEvents()` - Get upcoming events only

### Routes (`backend/routes/`)
- **authRoutes.js** - Authentication endpoints
  - POST /signup, POST /login, GET /profile, GET /users

- **clubRoutes.js** - Club endpoints
  - GET /clubs, POST /clubs, GET /clubs/:id, PUT /clubs/:id, DELETE /clubs/:id
  - POST /clubs/:id/join, POST /clubs/:id/leave

- **eventRoutes.js** - Event endpoints
  - GET /events, GET /events/upcoming, GET /events/:id, GET /events/club/:clubId
  - POST /events, PUT /events/:id, DELETE /events/:id
  - POST /events/:id/register, POST /events/:id/unregister

### Middleware (`backend/middleware/`)
- **authMiddleware.js** - Authentication & authorization
  - `verifyToken()` - JWT token verification
  - `verifyAdmin()` - Admin role check
  - `verifyStudent()` - Student role check

### Server Files
- **server.js** - Express application
  - Middleware setup: cors, express.json()
  - Route registration
  - Error handling
  - 404 handler
  - Port: 5000 (configurable via .env)

### Configuration Files
- **.env.example** - Environment variables template
  - PORT, MONGODB_URI, JWT_SECRET, NODE_ENV

- **.gitignore** - Git ignore rules
  - .env, node_modules/, .DS_Store

---

## Frontend Files (`frontend/`)

### Package Configuration
- **package.json** - React/Vite dependencies and scripts
  - Dependencies: react, react-dom, react-router-dom, axios, lucide-react
  - Dev: vite, tailwindcss, postcss, autoprefixer
  - Scripts: `dev` (development), `build` (production), `preview` (preview build)

### React Components (`frontend/src/components/`)
- **ProtectedRoute.jsx** - Route protection component
  - Checks authentication token
  - Validates user role if required
  - Redirects to login if unauthorized

- **Navbar.jsx** - Navigation bar
  - Logo and navigation links
  - User name display
  - Logout button
  - Responsive mobile menu
  - Links: Dashboard, Clubs, Events, Admin Panel

- **Toast.jsx** - Notification component
  - Success/error notifications
  - Auto-dismiss after 3 seconds
  - Icon display (CheckCircle/AlertCircle)

- **LoadingSpinner.jsx** - Loading indicator
  - Centered spinner with message
  - Used during data fetching

### Pages (`frontend/src/pages/`)
- **Register.jsx** - Authentication page
  - Unified login/signup form
  - Toggle between modes
  - Form validation
  - Email and password fields
  - Role selection for signup
  - Error display
  - Redirect on success

- **Dashboard.jsx** - User dashboard
  - Welcome message
  - Statistics cards (clubs, events, registered events)
  - User profile information
  - Role display

- **Clubs.jsx** - Clubs management page
  - List all clubs
  - Club cards with member count
  - Join/Leave buttons
  - Admin: Create, Delete clubs
  - Create club form (admin)
  - Success/error notifications

- **Events.jsx** - Events management page
  - List all events with details
  - Date, location, capacity info
  - Status badges
  - Register/Unregister buttons
  - Full capacity indicator
  - Admin: Create, Delete events
  - Create event form (admin)
  - Date/time picker

- **AdminPanel.jsx** - Admin dashboard
  - Tab navigation (dashboard, users, clubs, events)
  - Statistics cards
  - User list table
  - Club grid with delete
  - Event table with delete
  - Responsive design

### Services (`frontend/src/services/`)
- **api.js** - API client with Axios
  - Base URL configuration
  - Request/response interceptors
  - Token auto-inclusion in requests
  - Auto-logout on 401
  - API functions:
    - authAPI: signup, login, getProfile, getAllUsers
    - clubAPI: getAllClubs, getClubById, createClub, updateClub, deleteClub, joinClub, leaveClub
    - eventAPI: getAllEvents, getEventById, getEventsByClub, getUpcomingEvents, createEvent, updateEvent, deleteEvent, registerForEvent, unregisterFromEvent

### Main Files
- **App.jsx** - Main React component
  - React Router setup with BrowserRouter
  - Route definitions with ProtectedRoute
  - Public routes: /login, /register
  - Protected routes: /dashboard, /clubs, /events, /admin
  - Default route redirect

- **main.jsx** - React entry point
  - React 18 strict mode
  - Root element rendering

- **index.css** - Tailwind CSS styles
  - Global styles
  - Tailwind directives
  - Custom styles

### Configuration Files
- **vite.config.js** - Vite build configuration
  - React plugin
  - Dev server on port 3000
  - Auto-open browser

- **tailwind.config.js** - Tailwind CSS configuration
  - Content paths
  - Theme customization
  - Plugin configuration

- **postcss.config.js** - PostCSS configuration
  - Tailwind CSS plugin
  - Autoprefixer plugin

- **index.html** - HTML template
  - Root div for React
  - Title: "Campus Clubs - Student Events Management"

- **.env.example** - Environment variables template
  - VITE_API_BASE_URL

- **.gitignore** - Git ignore rules
  - .env, node_modules/, dist/, .idea/, etc.

### Static Files (`frontend/public/`)
- Empty directory for static assets

---

## File Statistics

### Backend
- **Models**: 3 files (User, Club, Event)
- **Controllers**: 3 files (Auth, Club, Event)
- **Routes**: 3 files (Auth, Club, Event)
- **Middleware**: 1 file
- **Config**: 1 file
- **Server**: 1 file
- **Total Backend Source**: 12 files + config files

### Frontend
- **Components**: 4 files (ProtectedRoute, Navbar, Toast, LoadingSpinner)
- **Pages**: 5 files (Register, Dashboard, Clubs, Events, AdminPanel)
- **Services**: 1 file (API client)
- **App Files**: 3 files (App.jsx, main.jsx, index.css)
- **Total Frontend Source**: 13 files + config files

### Configuration & Documentation
- **Documentation**: 5 files (README, SETUP, API_DOCUMENTATION, PROJECT_SUMMARY, FILE_INDEX)
- **Config Files**: 8 files (env templates, gitignore, vite, tailwind, postcss, etc.)
- **Total Config**: 13 files

**Grand Total**: ~40+ files with complete, production-ready code

---

## File Dependencies Map

### Backend Dependencies
```
server.js
├── config/db.js → MongoDB
├── middleware/authMiddleware.js
├── routes/
│   ├── authRoutes.js → controllers/authController.js → models/User.js
│   ├── clubRoutes.js → controllers/clubController.js → models/Club.js, User.js
│   └── eventRoutes.js → controllers/eventController.js → models/Event.js, Club.js
└── package.json
```

### Frontend Dependencies
```
main.jsx
└── App.jsx
    ├── pages/Register.jsx
    ├── pages/Dashboard.jsx
    ├── pages/Clubs.jsx
    ├── pages/Events.jsx
    ├── pages/AdminPanel.jsx
    ├── components/
    │   ├── ProtectedRoute.jsx
    │   ├── Navbar.jsx
    │   ├── Toast.jsx
    │   └── LoadingSpinner.jsx
    └── services/api.js
        └── axios + localStorage
```

---

## How to Navigate This Project

### To Understand Architecture
1. Read README.md
2. Check PROJECT_SUMMARY.md
3. Review this FILE_INDEX.md

### To Set Up the Project
1. Follow SETUP.md instructions
2. Configure .env files from examples

### To Use the API
1. Read API_DOCUMENTATION.md
2. Check backend/routes/ files for endpoint details

### To Modify Code
1. Backend changes: Edit models/ → controllers/ → routes/
2. Frontend changes: Edit components/ → pages/ → App.jsx

### To Debug Issues
1. Check server.js console for backend errors
2. Check browser console for frontend errors
3. Review Network tab for API calls
4. Check .env configuration

---

## File Purpose Quick Reference

| File | Purpose |
|------|---------|
| server.js | Express app setup & middleware |
| models/*.js | Database schemas |
| controllers/*.js | Business logic |
| routes/*.js | API endpoints |
| authMiddleware.js | JWT verification |
| App.jsx | React routing |
| pages/*.jsx | Page components |
| components/*.jsx | Reusable components |
| api.js | API client |
| package.json | Dependencies |
| .env.example | Environment template |
| *.config.js | Tool configuration |

---

## Quick File Locations

**Need to...**
- ...change database connection? → `backend/config/db.js`
- ...add new API endpoint? → `backend/routes/*.js` + `backend/controllers/*.js`
- ...modify user authentication? → `backend/controllers/authController.js`
- ...change UI colors? → `frontend/tailwind.config.js`
- ...add new page? → `frontend/src/pages/` + `frontend/src/App.jsx`
- ...modify API client? → `frontend/src/services/api.js`
- ...change JWT secret? → `backend/.env`
- ...change API URL? → `frontend/.env`

---

**Total Lines of Code**: ~3000+ (including comments)
**Total Components**: 4 reusable
**Total Pages**: 5 feature-complete
**Total API Endpoints**: 20+
**Database Collections**: 3 (User, Club, Event)

---

Happy coding! 🚀
