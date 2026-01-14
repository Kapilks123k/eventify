# Eventify - Event Management Platform

A full-stack web application for discovering and creating local events. Built with Node.js, Express, MongoDB, and vanilla JavaScript.

## 🏗️ Project Structure

```
eventify/
├── backend/                 # Server-side code
│   ├── models/             # Database models
│   │   └── Event.js        # Event schema
│   ├── uploads/            # File uploads directory
│   ├── server.js           # Main server file
│   ├── package.json        # Backend dependencies
│   └── .env.example        # Environment variables template
├── frontend/               # Client-side code
│   ├── assets/            # Static assets
│   │   ├── images/        # Image files
│   │   └── demo/          # Demo files (PDFs)
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript files
│   ├── pages/             # HTML pages
│   │   ├── create-event.html
│   │   ├── find-events.html
│   │   ├── login-admin.html
│   │   ├── login-user.html
│   │   └── event-form.html
│   └── index.html         # Landing page
└── README.md
```

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Google Maps API key
- Google OAuth credentials

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/Project_1
   PORT=3000
   SESSION_SECRET=your_super_secret_session_key_here
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here
   GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
   NODE_ENV=development
   ```

4. **Start the server:**
   ```bash
   npm start
   # or for development with auto-restart:
   npm run dev
   ```

### Frontend Setup

The frontend is served statically by the Express server. No separate build process required.

### Database Setup

1. **Install MongoDB** locally or use MongoDB Atlas
2. **Create database:** The application will automatically create the `Project_1` database
3. **Collections:** `Events`, `Users`, and `Registrations` will be created automatically

## 🔧 Configuration

### Google Maps API
1. Get API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Maps JavaScript API and Places API
3. Update the API key in `frontend/pages/event-form.html`

### Google OAuth Setup
1. Create OAuth 2.0 credentials in Google Cloud Console
2. Add authorized redirect URI: `http://localhost:3000/auth/google/callback`
3. Update credentials in `.env` file

## 🐛 Known API Issues & Fixes

### 1. **Security Issues (CRITICAL)**
- **Issue:** Google OAuth credentials are hardcoded in server.js
- **Fix:** ✅ Moved to environment variables
- **Issue:** MongoDB connection string is hardcoded
- **Fix:** ✅ Moved to environment variables

### 2. **Path Issues**
- **Issue:** Inconsistent file paths after reorganization
- **Fix:** ✅ Updated all paths to match new directory structure
- **Issue:** Static file serving paths incorrect
- **Fix:** ✅ Updated Express static middleware

### 3. **File Upload Issues**
- **Issue:** Upload directory path hardcoded
- **Fix:** ✅ Updated to use path.join() for cross-platform compatibility
- **Issue:** File size limits not properly enforced
- **Status:** ✅ Already implemented with proper validation

### 4. **Authentication Issues**
- **Issue:** Session secret hardcoded
- **Fix:** ✅ Moved to environment variables
- **Issue:** Google OAuth callback URL hardcoded
- **Fix:** ✅ Made configurable via environment variables

### 5. **API Endpoint Issues**
- **Issue:** Some endpoints missing proper error handling
- **Status:** ⚠️ Partially addressed - could use more comprehensive error handling
- **Issue:** File paths in responses may not work with new structure
- **Fix:** ✅ Updated to serve files from correct upload directory

## 🌐 API Endpoints

### Authentication
- `POST /login` - User login
- `POST /signup` - User registration
- `POST /signup-admin` - Admin registration
- `GET /auth/google` - Google OAuth login
- `GET /auth/google/callback` - Google OAuth callback
- `GET /logout` - User logout
- `GET /api/auth-status` - Check authentication status

### Events
- `GET /api/events` - Get all events
- `POST /api/events` - Create new event (requires auth)
- `GET /api/my-events` - Get user's events (requires auth)
- `DELETE /api/events/:id` - Delete event (requires auth)

### Registration
- `GET /api/user-registrations` - Get user's registered events
- `POST /api/register-event` - Register for an event

## 🔒 Security Considerations

1. **Environment Variables:** All sensitive data moved to `.env` file
2. **File Upload Security:** File type and size validation implemented
3. **Authentication:** Session-based auth with Passport.js
4. **CORS:** Configured for security
5. **Input Validation:** Basic validation on forms and API endpoints

## 🚀 Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production` in environment
- [ ] Use strong session secret
- [ ] Configure MongoDB Atlas for production
- [ ] Set up proper domain for Google OAuth
- [ ] Configure reverse proxy (nginx) if needed
- [ ] Set up SSL/HTTPS
- [ ] Configure file upload limits for production

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/eventify
PORT=3000
SESSION_SECRET=very_long_random_string_for_production
GOOGLE_CLIENT_ID=production_google_client_id
GOOGLE_CLIENT_SECRET=production_google_client_secret
GOOGLE_CALLBACK_URL=https://eventify-3iu8.onrender.com/auth/google/callback
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Common Issues

1. **Server won't start:**
   - Check if MongoDB is running
   - Verify all environment variables are set
   - Check if port 3000 is available

2. **Google OAuth not working:**
   - Verify OAuth credentials in Google Console
   - Check callback URL matches exactly
   - Ensure OAuth consent screen is configured

3. **File uploads failing:**
   - Check upload directory permissions
   - Verify file size limits
   - Check file type restrictions

4. **Database connection issues:**
   - Verify MongoDB is running
   - Check connection string format
   - Ensure database user has proper permissions

For more help, check the console logs for detailed error messages.