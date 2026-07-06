# 🎓 Campus Clubs - Student Events & Clubs Management System

A complete production-ready MERN stack application for managing student clubs and events in educational institutions.

## 📋 Features

### Admin Features
- ✅ Create, update, and delete clubs
- ✅ Create, update, and delete events
- ✅ View all students, clubs, and events
- ✅ Manage user roles and permissions
- ✅ View registration statistics

### Student Features
- ✅ User registration and login
- ✅ View all available clubs
- ✅ Join and leave clubs
- ✅ View upcoming events
- ✅ Register for events
- ✅ View personal dashboard with statistics

## 🛠️ Tech Stack

### Frontend
- **React 18.2** - UI Library
- **Vite** - Build tool & dev server
- **React Router v6** - Client-side routing
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin requests

## 📁 Project Structure

```
fsd project/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB configuration
│   ├── models/
│   │   ├── User.js               # User schema
│   │   ├── Club.js               # Club schema
│   │   └── Event.js              # Event schema
│   ├── routes/
│   │   ├── authRoutes.js         # Auth endpoints
│   │   ├── clubRoutes.js         # Club endpoints
│   │   └── eventRoutes.js        # Event endpoints
│   ├── controllers/
│   │   ├── authController.js     # Auth logic
│   │   ├── clubController.js     # Club logic
│   │   └── eventController.js    # Event logic
│   ├── middleware/
│   │   └── authMiddleware.js     # JWT verification
│   ├── server.js                 # Express app
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ProtectedRoute.jsx      # Route protection
    │   │   ├── Navbar.jsx              # Navigation bar
    │   │   ├── Toast.jsx               # Notifications
    │   │   └── LoadingSpinner.jsx      # Loading indicator
    │   ├── pages/
    │   │   ├── Register.jsx            # Login/Register page
    │   │   ├── Dashboard.jsx           # Dashboard
    │   │   ├── Clubs.jsx               # Clubs management
    │   │   ├── Events.jsx              # Events management
    │   │   └── AdminPanel.jsx          # Admin dashboard
    │   ├── services/
    │   │   └── api.js                  # API calls with Axios
    │   ├── App.jsx                     # Main app component
    │   ├── main.jsx                    # React entry point
    │   └── index.css                   # Tailwind styles
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── package.json
    ├── .env.example
    └── .gitignore
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables in `.env`:**
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/student-clubs-events
   JWT_SECRET=your_secure_jwt_secret_key_here
   NODE_ENV=development
   ```

5. **Start MongoDB:**
   ```bash
   # For local MongoDB
   mongod
   
   # Or use MongoDB Atlas (update MONGODB_URI in .env)
   ```

6. **Start the backend server:**
   ```bash
   npm run dev    # Development with nodemon
   # or
   npm start      # Production
   ```

   The server will run at `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables in `.env`:**
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

   The application will open at `http://localhost:3000`

## 📚 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (Protected)
- `GET /api/auth/users` - Get all users (Admin only)

### Clubs
- `GET /api/clubs` - Get all clubs
- `GET /api/clubs/:id` - Get club by ID
- `POST /api/clubs` - Create club (Admin only)
- `PUT /api/clubs/:id` - Update club (Admin only)
- `DELETE /api/clubs/:id` - Delete club (Admin only)
- `POST /api/clubs/:id/join` - Join club
- `POST /api/clubs/:id/leave` - Leave club

### Events
- `GET /api/events` - Get all events
- `GET /api/events/:id` - Get event by ID
- `GET /api/events/club/:clubId` - Get events by club
- `GET /api/events/upcoming` - Get upcoming events
- `POST /api/events` - Create event (Admin only)
- `PUT /api/events/:id` - Update event (Admin only)
- `DELETE /api/events/:id` - Delete event (Admin only)
- `POST /api/events/:id/register` - Register for event
- `POST /api/events/:id/unregister` - Unregister from event

## 🔐 Authentication

The application uses JWT (JSON Web Tokens) for authentication:

1. **Signup/Login**: User credentials validated, JWT token generated
2. **Token Storage**: JWT stored in localStorage on the client
3. **Protected Routes**: Routes require valid JWT token
4. **Role-Based Access**: Admin routes check user role
5. **Token Expiry**: Tokens expire after 7 days

## 📊 Database Schema

### User Model
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String (admin/student),
  joinedClubs: [ObjectId],
  registeredEvents: [ObjectId],
  createdAt: Date
}
```

### Club Model
```javascript
{
  clubName: String,
  description: String,
  members: [ObjectId],
  admin: ObjectId,
  createdAt: Date
}
```

### Event Model
```javascript
{
  title: String,
  description: String,
  date: Date,
  location: String,
  club: ObjectId,
  registeredStudents: [ObjectId],
  capacity: Number,
  status: String (upcoming/ongoing/completed/cancelled),
  createdAt: Date
}
```

## 🎨 Features Implementation

### Protected Routes
Routes are protected using `ProtectedRoute` component that checks for valid JWT token and user role.

### Form Validation
Client-side validation for all forms with error messages.

### Toast Notifications
Real-time toast notifications for user actions (success/error).

### Responsive Design
Fully responsive UI using Tailwind CSS grid system.

### Loading States
Loading spinners shown during data fetching operations.

## 🔄 Workflow Examples

### User Registration
1. User fills signup form
2. Backend validates input and checks email uniqueness
3. Password hashed with bcrypt
4. User saved to MongoDB
5. JWT token generated and returned
6. User redirected to dashboard

### Joining a Club
1. User clicks "Join" button on club card
2. Club ID sent to backend
3. User ID added to club's members array
4. Club ID added to user's joinedClubs array
5. Both documents updated in MongoDB
6. UI updated with success message

### Creating an Event
1. Admin fills event creation form
2. Form data validated
3. Event saved to MongoDB with club reference
4. Club data populated in response
5. Success message shown to admin
6. Events list refreshed on page

## 🚨 Error Handling

The application includes comprehensive error handling:
- Network error handling with Axios interceptors
- Invalid credentials handling
- Token expiry and auto-logout
- Database error messages
- Form validation errors
- 404 not found responses

## 📝 User Guide

### For Students
1. **Create Account**: Click "Sign Up" and enter details
2. **Login**: Enter credentials to access dashboard
3. **Explore Clubs**: View all available clubs
4. **Join Clubs**: Click "Join" to become a member
5. **Browse Events**: View upcoming events
6. **Register Events**: Register for events of interest
7. **Dashboard**: Check personal statistics

### For Admins
1. **Login**: Use admin credentials
2. **Dashboard**: View system statistics
3. **Manage Clubs**: Create, edit, or delete clubs
4. **Manage Events**: Create, edit, or delete events
5. **View Users**: See all registered users
6. **Admin Panel**: Full control over all resources

## 🔧 Troubleshooting

### Backend Won't Connect to MongoDB
- Ensure MongoDB is running (`mongod`)
- Check MONGODB_URI in .env
- For MongoDB Atlas, ensure IP whitelist includes your machine

### API Calls Failing
- Check if backend server is running on port 5000
- Verify VITE_API_BASE_URL in frontend .env
- Check browser console for CORS errors

### Token Issues
- Clear localStorage and log in again
- Check JWT_SECRET matches between signup and login
- Ensure token hasn't expired

### Port Already in Use
```bash
# Change port in .env or kill process using port
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :5000
kill -9 <PID>
```

## 📦 Build for Production

### Backend
```bash
cd backend
npm install
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run build
```

The `dist` folder contains optimized production build.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is open source and available under the MIT License.

## 👨‍💻 Developer Notes

- All passwords are hashed with bcryptjs before storing
- JWT tokens are signed with SECRET_KEY
- MongoDB ObjectIds are used for relationships
- Axios instances include request/response interceptors
- Protected routes require valid JWT in Authorization header
- Admin operations are restricted to users with admin role

## 🎯 Future Enhancements

- Email notifications for event reminders
- Club announcements and updates
- Event ratings and reviews
- Event attendance tracking
- Club statistics and analytics
- User profile customization
- Event search and filters
- Social features (following, messaging)

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation
3. Check browser console for errors
4. Verify environment variables

---

**Happy Coding! 🚀**
