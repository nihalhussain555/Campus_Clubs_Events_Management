# 📚 API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected endpoints require a JWT token in the `Authorization` header:
```
Authorization: Bearer <token>
```

---

## 🔐 Authentication Endpoints

### 1. Sign Up
Create a new user account.

**Endpoint:** `POST /auth/signup`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "student"
}
```

**Role Options:** `student`, `admin`

**Response (200 - Created):**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student"
  }
}
```

**Error (400):**
```json
{
  "message": "Email already registered"
}
```

---

### 2. Login
Authenticate user and get JWT token.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student"
  }
}
```

**Error (401):**
```json
{
  "message": "Invalid credentials"
}
```

---

### 3. Get User Profile
Retrieve authenticated user's profile.

**Endpoint:** `GET /auth/profile`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student",
    "joinedClubs": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "clubName": "Tech Club",
        "description": "For tech enthusiasts"
      }
    ],
    "registeredEvents": [
      {
        "_id": "507f1f77bcf86cd799439013",
        "title": "Tech Workshop",
        "date": "2024-03-15T10:00:00.000Z"
      }
    ]
  }
}
```

---

### 4. Get All Users (Admin Only)
Retrieve list of all users in the system.

**Endpoint:** `GET /auth/users`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "users": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "student",
      "joinedClubs": [],
      "registeredEvents": [],
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

---

## 🎯 Club Endpoints

### 1. Get All Clubs
Retrieve list of all clubs (Public).

**Endpoint:** `GET /clubs`

**Response (200):**
```json
{
  "clubs": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "clubName": "Tech Club",
      "description": "For tech enthusiasts",
      "members": [
        {
          "_id": "507f1f77bcf86cd799439011",
          "name": "John Doe",
          "email": "john@example.com"
        }
      ],
      "admin": {
        "_id": "507f1f77bcf86cd799439010",
        "name": "Admin User",
        "email": "admin@example.com"
      },
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

---

### 2. Get Club by ID
Retrieve specific club details.

**Endpoint:** `GET /clubs/:id`

**Parameters:**
- `id` - Club ID

**Response (200):**
```json
{
  "club": {
    "_id": "507f1f77bcf86cd799439012",
    "clubName": "Tech Club",
    "description": "For tech enthusiasts",
    "members": [...],
    "admin": {...},
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Error (404):**
```json
{
  "message": "Club not found"
}
```

---

### 3. Create Club (Admin Only)
Create a new club.

**Endpoint:** `POST /clubs`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "clubName": "Tech Club",
  "description": "For tech enthusiasts and developers"
}
```

**Response (201):**
```json
{
  "message": "Club created successfully",
  "club": {
    "_id": "507f1f77bcf86cd799439012",
    "clubName": "Tech Club",
    "description": "For tech enthusiasts and developers",
    "members": ["507f1f77bcf86cd799439011"],
    "admin": "507f1f77bcf86cd799439011",
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

---

### 4. Update Club (Admin Only)
Update club details.

**Endpoint:** `PUT /clubs/:id`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "clubName": "Updated Tech Club",
  "description": "Updated description"
}
```

**Response (200):**
```json
{
  "message": "Club updated successfully",
  "club": {
    "_id": "507f1f77bcf86cd799439012",
    "clubName": "Updated Tech Club",
    "description": "Updated description",
    ...
  }
}
```

---

### 5. Delete Club (Admin Only)
Delete a club.

**Endpoint:** `DELETE /clubs/:id`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "message": "Club deleted successfully"
}
```

---

### 6. Join Club
Join a club as a student.

**Endpoint:** `POST /clubs/:id/join`

**Headers:**
```
Authorization: Bearer <student_token>
```

**Response (200):**
```json
{
  "message": "Joined club successfully",
  "club": {
    "_id": "507f1f77bcf86cd799439012",
    "clubName": "Tech Club",
    "members": [...]
  }
}
```

**Error (400):**
```json
{
  "message": "Already a member of this club"
}
```

---

### 7. Leave Club
Leave a club.

**Endpoint:** `POST /clubs/:id/leave`

**Headers:**
```
Authorization: Bearer <student_token>
```

**Response (200):**
```json
{
  "message": "Left club successfully"
}
```

---

## 📅 Event Endpoints

### 1. Get All Events
Retrieve list of all events (Public).

**Endpoint:** `GET /events`

**Response (200):**
```json
{
  "events": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "title": "Tech Workshop",
      "description": "Learn latest web technologies",
      "date": "2024-03-15T10:00:00.000Z",
      "location": "Auditorium",
      "club": {
        "_id": "507f1f77bcf86cd799439012",
        "clubName": "Tech Club"
      },
      "registeredStudents": [...],
      "capacity": 50,
      "status": "upcoming",
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

---

### 2. Get Event by ID
Retrieve specific event details.

**Endpoint:** `GET /events/:id`

**Parameters:**
- `id` - Event ID

**Response (200):**
```json
{
  "event": {
    "_id": "507f1f77bcf86cd799439013",
    "title": "Tech Workshop",
    "description": "Learn latest web technologies",
    "date": "2024-03-15T10:00:00.000Z",
    "location": "Auditorium",
    "club": {
      "_id": "507f1f77bcf86cd799439012",
      "clubName": "Tech Club",
      "description": "For tech enthusiasts"
    },
    "registeredStudents": [...],
    "capacity": 50,
    "status": "upcoming",
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

---

### 3. Get Events by Club
Get all events of a specific club.

**Endpoint:** `GET /events/club/:clubId`

**Parameters:**
- `clubId` - Club ID

**Response (200):**
```json
{
  "events": [...]
}
```

---

### 4. Get Upcoming Events
Get all upcoming events (Public).

**Endpoint:** `GET /events/upcoming`

**Response (200):**
```json
{
  "events": [...]
}
```

---

### 5. Create Event (Admin Only)
Create a new event.

**Endpoint:** `POST /events`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "title": "Tech Workshop",
  "description": "Learn latest web technologies",
  "date": "2024-03-15T10:00:00",
  "location": "Auditorium",
  "club": "507f1f77bcf86cd799439012",
  "capacity": 50
}
```

**Response (201):**
```json
{
  "message": "Event created successfully",
  "event": {
    "_id": "507f1f77bcf86cd799439013",
    "title": "Tech Workshop",
    "description": "Learn latest web technologies",
    "date": "2024-03-15T10:00:00.000Z",
    "location": "Auditorium",
    "club": "507f1f77bcf86cd799439012",
    "registeredStudents": [],
    "capacity": 50,
    "status": "upcoming",
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

---

### 6. Update Event (Admin Only)
Update event details.

**Endpoint:** `PUT /events/:id`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "title": "Updated Tech Workshop",
  "description": "Updated description",
  "date": "2024-03-16T10:00:00",
  "location": "Updated Location",
  "capacity": 60,
  "status": "ongoing"
}
```

**Response (200):**
```json
{
  "message": "Event updated successfully",
  "event": {
    "_id": "507f1f77bcf86cd799439013",
    "title": "Updated Tech Workshop",
    ...
  }
}
```

---

### 7. Delete Event (Admin Only)
Delete an event.

**Endpoint:** `DELETE /events/:id`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "message": "Event deleted successfully"
}
```

---

### 8. Register for Event
Register as a student for an event.

**Endpoint:** `POST /events/:id/register`

**Headers:**
```
Authorization: Bearer <student_token>
```

**Response (200):**
```json
{
  "message": "Registered for event successfully",
  "event": {
    "_id": "507f1f77bcf86cd799439013",
    "title": "Tech Workshop",
    "registeredStudents": [...],
    "capacity": 50,
    ...
  }
}
```

**Error (400):**
```json
{
  "message": "Event is at full capacity"
}
```

---

### 9. Unregister from Event
Unregister from an event.

**Endpoint:** `POST /events/:id/unregister`

**Headers:**
```
Authorization: Bearer <student_token>
```

**Response (200):**
```json
{
  "message": "Unregistered from event successfully"
}
```

---

## 🔍 Common Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Successful GET, PUT |
| 201 | Created | Successful POST |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Internal server error |

---

## 📝 Error Response Format

All errors follow this format:
```json
{
  "message": "Error description"
}
```

---

## 🔑 JWT Token Structure

The JWT token contains:
```json
{
  "id": "507f1f77bcf86cd799439011",
  "role": "student",
  "iat": 1705315200,
  "exp": 1705920000
}
```

- `id`: User's MongoDB ObjectId
- `role`: User's role (admin/student)
- `iat`: Token issued at (timestamp)
- `exp`: Token expiration (7 days)

---

## 🧪 Example cURL Requests

### Sign Up
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "student"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Get All Clubs
```bash
curl -X GET http://localhost:5000/api/clubs
```

### Create Club (Admin)
```bash
curl -X POST http://localhost:5000/api/clubs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "clubName": "Tech Club",
    "description": "For tech enthusiasts"
  }'
```

### Join Club
```bash
curl -X POST http://localhost:5000/api/clubs/<club_id>/join \
  -H "Authorization: Bearer <token>"
```

### Create Event (Admin)
```bash
curl -X POST http://localhost:5000/api/events \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Tech Workshop",
    "description": "Learn web development",
    "date": "2024-03-15T10:00:00",
    "location": "Auditorium",
    "club": "<club_id>",
    "capacity": 50
  }'
```

### Register for Event
```bash
curl -X POST http://localhost:5000/api/events/<event_id>/register \
  -H "Authorization: Bearer <token>"
```

---

## 📋 Data Validation Rules

### User (Signup)
- `name`: Required, string
- `email`: Required, valid email format, unique
- `password`: Required, minimum 6 characters
- `role`: Optional, default "student"

### Club
- `clubName`: Required, string
- `description`: Required, string

### Event
- `title`: Required, string
- `description`: Required, string
- `date`: Required, ISO 8601 format
- `location`: Optional, string
- `club`: Required, valid club ID
- `capacity`: Optional, number, default 100

---

## 🔒 Security Notes

1. All passwords are hashed with bcryptjs (10 salt rounds)
2. JWT tokens expire after 7 days
3. Sensitive fields (password) excluded from responses
4. Admin operations require admin role
5. CORS enabled for frontend origin
6. Input validation on all endpoints

---

**Last Updated:** 2024
**API Version:** 1.0.0
