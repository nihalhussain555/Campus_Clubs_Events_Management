# 🚀 Quick Setup Guide

## One-Time Setup

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
copy .env.example .env

# Update .env with your settings
# Edit .env and set:
# - MONGODB_URI (local or Atlas)
# - JWT_SECRET (any secure string)

# Start MongoDB (if local)
mongod

# Start backend server
npm run dev
```

**Backend should be running at: http://localhost:5000**

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
copy .env.example .env

# Start frontend dev server
npm run dev
```

**Frontend should be running at: http://localhost:3000**

## Testing the Application

### Create Test Accounts

**Admin Account (for admin panel):**
- Email: admin@example.com
- Password: admin123
- Role: Admin

**Student Account (regular user):**
- Email: student@example.com
- Password: student123
- Role: Student

### Test Flow

1. **Login as Admin**
   - Create 2-3 clubs
   - Create 5-6 events
   - View admin panel

2. **Login as Student**
   - Browse and join clubs
   - Register for events
   - View dashboard
   - Check joined clubs and registered events

## API Endpoints to Test

Use Postman or curl:

```bash
# Signup
POST http://localhost:5000/api/auth/signup
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "test123",
  "role": "student"
}

# Login
POST http://localhost:5000/api/auth/login
{
  "email": "test@example.com",
  "password": "test123"
}

# Get Profile (requires token)
GET http://localhost:5000/api/auth/profile
Headers: Authorization: Bearer <your_token>

# Get All Clubs
GET http://localhost:5000/api/clubs

# Create Club (admin only)
POST http://localhost:5000/api/clubs
Headers: Authorization: Bearer <admin_token>
{
  "clubName": "Tech Club",
  "description": "For tech enthusiasts"
}

# Get All Events
GET http://localhost:5000/api/events

# Create Event (admin only)
POST http://localhost:5000/api/events
Headers: Authorization: Bearer <admin_token>
{
  "title": "Hackathon 2024",
  "description": "24-hour coding competition",
  "date": "2024-03-15T10:00:00",
  "location": "Auditorium",
  "club": "<club_id>",
  "capacity": 50
}

# Register for Event
POST http://localhost:5000/api/events/<event_id>/register
Headers: Authorization: Bearer <student_token>

# Join Club
POST http://localhost:5000/api/clubs/<club_id>/join
Headers: Authorization: Bearer <student_token>
```

## Key Features to Test

✅ **Authentication**
- Sign up with different roles
- Login validation
- Token-based access

✅ **Club Management**
- Admin creates clubs
- Students browse clubs
- Students can join/leave clubs
- Admin can delete clubs

✅ **Event Management**
- Admin creates events
- Students browse events
- Students register/unregister
- Capacity management
- Status tracking

✅ **Admin Panel**
- View all users
- View all clubs
- View all events
- Delete resources
- Statistics dashboard

## Environment Setup

### Backend (.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/student-clubs-events
JWT_SECRET=super_secret_key_change_me_in_production
NODE_ENV=development
```

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## MongoDB Setup (if using local)

### Windows
1. Download MongoDB Community Edition
2. Install with default settings
3. Run: `mongod` in command prompt

### macOS
```bash
brew install mongodb-community
brew services start mongodb-community
```

### Linux
```bash
sudo apt-get install -y mongodb
sudo systemctl start mongodb
```

## Database Initialization

The MongoDB database will auto-create on first run. No manual initialization needed.

## Troubleshooting

**Port 5000 already in use:**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :5000
kill -9 <PID>
```

**CORS errors:**
- Ensure backend is running
- Check VITE_API_BASE_URL matches backend URL

**MongoDB connection failed:**
- Ensure mongod is running
- Check MONGODB_URI is correct
- Verify MongoDB is installed

**Package installation failed:**
- Delete node_modules and package-lock.json
- Run npm install again
- Try `npm cache clean --force`

## File Structure Generated

```
fsd project/
├── backend/
│   ├── config/db.js
│   ├── models/User.js, Club.js, Event.js
│   ├── routes/authRoutes.js, clubRoutes.js, eventRoutes.js
│   ├── controllers/authController.js, clubController.js, eventController.js
│   ├── middleware/authMiddleware.js
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
│
└── frontend/
    ├── src/
    │   ├── components/ProtectedRoute.jsx, Navbar.jsx, Toast.jsx, LoadingSpinner.jsx
    │   ├── pages/Register.jsx, Dashboard.jsx, Clubs.jsx, Events.jsx, AdminPanel.jsx
    │   ├── services/api.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    ├── package.json
    ├── .env.example
    └── .gitignore
```

## Next Steps

1. ✅ Install dependencies
2. ✅ Configure .env files
3. ✅ Start MongoDB
4. ✅ Start backend (`npm run dev`)
5. ✅ Start frontend (`npm run dev`)
6. ✅ Open http://localhost:3000
7. ✅ Create test accounts
8. ✅ Test all features

## Performance Tips

- Use MongoDB Atlas for cloud database
- Enable compression in production
- Use CDN for static files
- Implement caching strategies
- Monitor API response times

## Security Notes

- Change JWT_SECRET before production
- Use HTTPS in production
- Add rate limiting
- Implement input sanitization
- Use environment variables for secrets
- Keep dependencies updated

---

**You're all set! Start building! 🎉**
