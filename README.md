# Medic on Time - Medicine Tracker Application

## Overview
Medic on Time is a comprehensive medicine tracking application designed to help patients manage their medication schedules effectively. The app allows users to track their medicine intake, monitor adherence rates, and maintain emergency contacts for critical situations.

## Table of Contents
1. [Features](#features)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [Authentication System](#authentication-system)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Implementation](#frontend-implementation)
7. [Security Measures](#security-measures)
8. [Future Enhancements](#future-enhancements)

---

## Features

### Current Features
- **User Authentication**: Secure signup and login system with token-based authentication
- **Medicine Management**: Add, update, view, and delete medicine entries
- **Medication Tracking**: Mark medicines as "taken" or "skipped" with timestamp history
- **Adherence Monitoring**: Track medication adherence over time
- **Emergency Contact**: Store emergency contact information for family or friends
- **User Profile Management**: Update personal information and emergency contacts
- **Dark/Light Mode**: Theme support for comfortable viewing in different lighting conditions
- **Secure Data Storage**: All user data encrypted and securely stored

### Future Features (Planned)
- Push notifications for medicine reminders
- Alarm system for scheduled doses
- Advanced adherence analytics

---

## Technology Stack

### Frontend
- **React Native**: Cross-platform mobile application framework
- **Expo**: Development platform for React Native applications
- **Zustand**: Lightweight state management library for handling authentication and application state
- **Axios**: HTTP client for API communications
- **AsyncStorage**: Persistent local storage for React Native

### Backend
- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework for Node.js
- **MongoDB**: NoSQL database for flexible data storage
- **Mongoose**: ODM (Object Data Modeling) library for MongoDB

### Authentication & Security
- **JSON Web Tokens (JWT)**: Token-based authentication
- **bcrypt**: Password hashing library
- **Refresh Token Mechanism**: Secure session management

---

## Architecture Overview

### System Architecture
The application follows a client-server architecture with clear separation of concerns:

```
┌─────────────────┐         ┌──────────────────┐
│  React Native   │ ◄──────►│   Express API    │
│   (Expo App)    │  HTTPS  │     Server       │
│                 │         │                  │
│   - Zustand     │         │  - Controllers   │
│   - AsyncStorage│         │  - Middleware    │
└─────────────────┘         │  - Routes        │
                            └─────────┬────────┘
                                      │
                                      ▼
                            ┌──────────────────┐
                            │     MongoDB      │
                            │    Database      │
                            └──────────────────┘
```

### API Endpoints

#### Authentication Routes (`/api/auth`)
- `POST /signup` - Register new user
- `POST /login` - User login
- `POST /logout` - User logout
- `POST /refresh-token` - Refresh session token

#### User Routes (`/api/users`) - Protected
- `GET /me` - Get current user profile
- `PUT /me` - Update user profile

#### Medicine Routes (`/api/medicines`) - Protected
- `GET /` - Get all medicines for user
- `GET /:id` - Get specific medicine by ID
- `POST /` - Add new medicine
- `PUT /:id` - Update medicine details
- `POST /history/:id` - Update medicine history (mark as taken/skipped)
- `DELETE /:id` - Delete medicine

---

## Authentication System

### Token-Based Authentication
The application uses a dual-token system for secure authentication:

#### 1. Session Token (Access Token)
- **Purpose**: Used for authenticating API requests
- **Lifespan**: Short-lived (configurable via `JWT_EXPIRES_IN`)
- **Storage**: Zustand store and AsyncStorage
- **Usage**: Sent in Authorization header as Bearer token

#### 2. Refresh Token
- **Purpose**: Used to obtain new session tokens without re-login
- **Lifespan**: Long-lived (configurable via `JWT_REFRESH_EXPIRES_IN`)
- **Storage**: Both client-side and database
- **Security**: Validated against stored token in database

### Authentication Flow

#### Signup Process
1. User submits registration form (name, email, password, emergency contact)
2. Server validates if email already exists
3. Password is hashed using bcrypt with salt rounds
4. New user document created in MongoDB
5. Both session and refresh tokens generated
6. Refresh token stored in user document
7. Both tokens returned to client

#### Login Process
1. User submits credentials (email, password)
2. Server finds user by email
3. Password compared with stored hash using bcrypt
4. New tokens generated upon successful authentication
5. Refresh token updated in database
6. User data and tokens returned to client

#### Token Refresh Mechanism
1. When session token expires (401 error)
2. Client automatically sends refresh token to `/auth/refresh-token`
3. Server validates refresh token and checks database match
4. New session and refresh tokens generated
5. Old refresh token replaced in database
6. Original API request retried with new token

#### Logout Process
1. Client sends refresh token to logout endpoint
2. Server removes refresh token from user document
3. Client clears all stored authentication data

### Axios Interceptors

#### Request Interceptor
```javascript
// Automatically attaches session token to every request
config.headers.Authorization = `Bearer ${sessionToken}`;
```

#### Response Interceptor
```javascript
// Handles 401 errors and automatic token refresh
if (error.response.status === 401 && !originalRequest._retry) {
    // Attempt token refresh
    // Retry original request
}
```

---

## Security Measures

### Password Security

#### Hashing
Passwords are never stored in plain text. The application uses **bcrypt**, a cryptographic hashing function specifically designed for password storage.

**What is Hashing?**
- One-way cryptographic function
- Same input always produces same output
- Impossible to reverse (get original password from hash)
- Example: `password123` → `$2b$10$rX7...` (60 characters)

#### Salting
To prevent rainbow table attacks, bcrypt automatically adds a **salt** to each password before hashing.

**What is a Salt?**
- Random data added to password before hashing
- Each user has unique salt
- Makes identical passwords produce different hashes
- Prevents precomputed hash attacks

**Salt Rounds**: The application uses 10 salt rounds, meaning the hashing algorithm runs 2^10 (1024) times, making brute-force attacks computationally expensive.

#### bcrypt Implementation
```javascript
// During Signup
const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
// password: user's plain text password
// SALT_ROUNDS: 10 (security strength)
// Result stored in database

// During Login
const isMatch = await bcrypt.compare(password, user.password);
// Compares submitted password with stored hash
// Returns true/false
```

### JWT (JSON Web Tokens)

**Structure of JWT:**
```
header.payload.signature
```

**Components:**
1. **Header**: Token type and hashing algorithm
2. **Payload**: User data (user ID)
3. **Signature**: Cryptographic signature using secret key

**How JWT Works:**
- Server generates token using secret key
- Token contains user ID and expiration time
- Server can verify token authenticity using same secret
- Stateless authentication (no session storage needed)

**JWT Significance:**
- **Stateless**: Server doesn't need to store session data
- **Scalable**: Works across multiple servers
- **Secure**: Tamper-proof due to cryptographic signature
- **Self-contained**: Contains all necessary user information

### Middleware Protection

All protected routes use `authMiddleware` which:
1. Extracts Bearer token from Authorization header
2. Verifies token using JWT secret
3. Decodes user ID from token
4. Fetches user from database
5. Attaches user object to request
6. Grants or denies access

---

## Backend Implementation

### Data Models

#### User Model
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  emergencyContact: String,
  refreshToken: String,
  timestamps: true
}
```

#### Medicine Model
```javascript
{
  user: ObjectId (reference to User),
  name: String,
  dosage: String,
  frequency: String,
  times: [String],
  foodTiming: String (before/after/with/anytime),
  description: String,
  history: [
    {
      timestamp: Date,
      status: String (taken/skipped)
    }
  ],
  timestamps: true
}
```

### Controllers

#### Auth Controller
**signup**: Handles user registration with password hashing and token generation

**login**: Authenticates users and issues tokens

**logout**: Invalidates refresh token in database

**refreshSessionToken**: Issues new tokens using valid refresh token

**verifyToken**: Validates session token (via middleware)

#### User Controller
**getMe**: Retrieves authenticated user's profile data (excludes password and refresh token)

**updateProfile**: Updates user name and/or emergency contact information

#### Medicine Controller
**getAllMedicines**: Fetches all medicines for authenticated user, sorted by creation date

**getMedicineById**: Retrieves specific medicine with ownership verification

**addMedicine**: Creates new medicine entry for user

**updateMedicine**: Updates medicine details with authorization check

**updateMedicineHistory**: Adds timestamp entry marking medicine as taken or skipped

**deleteMedicine**: Removes medicine from database after ownership verification

### Authorization Pattern
All medicine operations verify:
1. Medicine exists in database
2. Medicine belongs to authenticated user
3. Returns 401 error if ownership mismatch

---

## Frontend Implementation

### State Management (Zustand)

Zustand provides lightweight, hook-based state management with persistence.

#### Auth Store Structure
```javascript
State:
- user: User object or null
- sessionToken: JWT access token
- refreshToken: JWT refresh token
- isAuthenticated: Boolean flag
- isLoading: Loading state
- error: Error messages

Actions:
- signup(): Register new user
- login(): Authenticate user
- logout(): Clear session
- checkAuthStatus(): Verify token validity on app launch
- handleTokenRefresh(): Obtain new session token
- updateUserProfile(): Update user information
```

#### Persistence
Zustand middleware automatically saves authentication state to AsyncStorage:
- Persists across app restarts
- Survives app crashes
- Selective persistence (excludes loading/error states)

### API Client

Centralized Axios instance with:
- Base URL configuration
- Automatic token injection
- Automatic token refresh on 401 errors
- Request/response interceptors

**Token Refresh Logic:**
- Detects 401 errors
- Prevents infinite refresh loops
- Retries original request after refresh
- Logs out user if refresh fails

---

## User Experience Features

### Medicine Tracking
Users can:
- Set medicine name and dosage
- Define frequency and timing
- Specify food timing requirements
- Add descriptive notes
- Track intake history with timestamps
- View adherence patterns

### Adherence Calculation
The app calculates adherence rate based on:
- Total scheduled doses
- Doses marked as "taken"
- Historical tracking data

### Profile Management
Users can:
- View personal information
- Update display name
- Modify emergency contact
- Maintain account security

### Theme Support
- Light mode for daytime use
- Dark mode for low-light environments
- Reduces eye strain for patients

---

## Database Structure

### Connection
MongoDB connection established using Mongoose with:
- Connection string from environment variables
- Automatic reconnection handling
- Schema validation

### Data Relationships
```
User (1) ──── (Many) Medicine
            │
            └──── (Many) History Entries
```

Each medicine document:
- References parent user via ObjectId
- Contains embedded history array
- Maintains timestamps for tracking

---

## Environment Configuration

Required environment variables:
```
PORT=6000
MONGO_URI=<MongoDB connection string>
JWT_SECRET=<Secret for session tokens>
JWT_EXPIRES_IN=<Session token expiry (e.g., "15m")>
JWT_REFRESH_SECRET=<Secret for refresh tokens>
JWT_REFRESH_EXPIRES_IN=<Refresh token expiry (e.g., "7d")>
```

---

## Error Handling

### Backend
- Consistent error response format
- Status code conventions (401, 404, 500)
- Detailed error logging
- User-friendly error messages

### Frontend
- Try-catch blocks in async operations
- Error state management in Zustand
- Graceful error display to users
- Automatic retry mechanisms

---

## API Security Features

1. **Authentication Required**: All sensitive endpoints protected by middleware
2. **Ownership Verification**: Users can only access their own data
3. **Password Exclusion**: Passwords never returned in API responses
4. **Token Validation**: Every request validates token signature and expiry
5. **CORS Configuration**: Cross-origin requests properly configured
6. **Input Validation**: Server validates all incoming data

---

## Development Workflow

### Backend Startup
1. Load environment variables
2. Connect to MongoDB
3. Initialize Express server
4. Register middleware
5. Mount API routes
6. Start listening on specified port

### Frontend Startup
1. Initialize React Native app
2. Load persisted auth state from AsyncStorage
3. Verify token validity with server
4. Render appropriate UI (logged in/out)
5. Setup API interceptors

---

## Key Technical Concepts

### RESTful API Design
- Resource-based URLs
- HTTP verb usage (GET, POST, PUT, DELETE)
- Stateless communication
- Consistent response formats

### Middleware Pattern
Functions executed before route handlers:
- Authentication verification
- Request logging
- Error handling
- Request parsing

### Token Rotation
Security practice where:
- Refresh tokens replaced on each use
- Prevents token replay attacks
- Limits damage from stolen tokens

### Password Best Practices
- Never log passwords
- Never transmit in plain text
- Use HTTPS in production
- Implement strong hashing (bcrypt)
- Add unique salts per user

---

## Testing Considerations

### Backend Testing
- Authentication flow verification
- Protected route access control
- Token expiration handling
- Medicine CRUD operations
- Ownership authorization

### Frontend Testing
- User registration/login flows
- Automatic token refresh
- Medicine tracking functionality
- Profile updates
- Error handling

---

## Conclusion

Medic on Time demonstrates modern full-stack application development with:
- Secure authentication using industry-standard practices
- Clean separation of frontend and backend concerns
- Scalable architecture supporting future enhancements
- User-centric design focused on medication adherence
- Robust error handling and security measures

The application provides a solid foundation for helping patients manage their medication schedules while maintaining data security and user privacy.