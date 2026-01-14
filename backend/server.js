require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Import Models
const Event = require('./models/Event'); 

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: String,
  password: { type: String }, 
  googleId: { type: String },
  role: { type: String, enum: ['user', 'admin'], default: 'admin' }, // CHANGED: Default to admin
  authProvider: { type: String, enum: ['google', 'manual'], default: 'manual' } 
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

const app = express();
// Use Render's provided port, or default to 10000 (Render's default)
const PORT = process.env.PORT || 10000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

// --- Registration Schema ---
const registrationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventName: { type: String, required: true },
  registeredAt: { type: Date, default: Date.now }
});
registrationSchema.index({ userId: 1, eventName: 1 }, { unique: true });

const Registration = mongoose.model('Registration', registrationSchema);

// --- Middleware ---
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true })); 

// 1. Session Config
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key', 
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// 2. Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// --- Database Connection ---
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/Project_1', {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
})
  .then(() => console.log('✅ Connected to MongoDB (Project_1)'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    console.log('⚠️  Starting server without database connection');
  });

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,      
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,                                        
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://https://eventify-3iu8.onrender.com/auth/google/callback",
    passReqToCallback: true 
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      // 1. Try to find user by Google ID
      let user = await User.findOne({ googleId: profile.id });
      
      if (user) {
          // Ensure existing users are upgraded to admin if they log in again
          if (user.role !== 'admin') {
              user.role = 'admin';
              await user.save();
          }
      } else {
        // 2. Check if user exists by Email (Account Merging)
        user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
            user.googleId = profile.id;
            user.role = 'admin'; // Force Admin
            await user.save();
        } else {
            // 3. New User Creation - ALWAYS ADMIN
            user = new User({
                username: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id,
                password: "", 
                role: 'admin', // Force Admin
                authProvider: 'google' 
            });
            await user.save();
        }
      }
      return done(null, user);
    } catch (err) {
      console.error('Google OAuth Error:', err);
      return done(err, null);
    }
  }
));
} else {
  console.log("⚠️  Google OAuth credentials missing. Google Login skipped.");
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// --- UPDATED MIDDLEWARE: Standard Authentication Check ---
// Since everyone is now an admin, we just need to check if they are logged in.
const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    // Case 4 Protection: If accessing create-event without auth, redirect to Admin Login
    res.redirect('/pages/login-admin.html');
};

// --- ROUTES ---

// --- PROTECTED ROUTES ---
// Case 4: If logged in (via Modal or Admin Page), this passes. If not, redirects to login-admin.
app.get('/pages/create-event.html', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/create-event.html'));
});

// Landing Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Serve Static Files
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- VIEW ROUTES ---
app.get('/pages/find-events.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/find-events.html'));
});

// --- AUTH ROUTES ---

// 1. Google Login Route
// Accepts 'origin' query param (e.g., ?origin=admin_page or ?origin=find_events)
app.get('/auth/google', (req, res, next) => {
    // Check if Google OAuth is properly configured
    const cid = process.env.GOOGLE_CLIENT_ID;
    const csec = process.env.GOOGLE_CLIENT_SECRET;
    const cb = process.env.GOOGLE_CALLBACK_URL || "https://eventify-3iu8.onrender.com/auth/google/callback";

    const missingCreds = !cid || !csec;
    const placeholderCreds = (cid || '').includes('your_google_client_id_here') || (csec || '').includes('your_google_client_secret_here');

    if (missingCreds || placeholderCreds) {
        console.error('Google OAuth credentials not configured properly.');
        return res.redirect('/pages/login-admin.html?error=oauth_not_configured');
    }

    // Basic sanity on callback URL format
    if (!cb.startsWith('http')) {
        console.error('Invalid GOOGLE_CALLBACK_URL format:', cb);
        return res.redirect('/pages/login-admin.html?error=oauth_callback_invalid');
    }
    
    const origin = req.query.origin || 'home';
    passport.authenticate('google', { 
        scope: ['profile', 'email'],
        state: origin // Pass origin as 'state' to Google
    })(req, res, next);
});

// 2. Google Callback Route
app.get('/auth/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: '/pages/login-admin.html?error=google_auth_failed',
    failureFlash: false 
  }),
  (req, res) => {
    try {
      // Retrieve the origin from the 'state' query param
      const origin = req.query.state;

      // Case 1: Login from Admin Page -> Redirect to Create Event
      if (origin === 'admin_page') {
          res.redirect('/pages/create-event.html');
      } 
      // Case 2: Login from Find Events Modal -> Stay on Find Events + Alert Param
      else if (origin === 'find_events') {
          res.redirect('/pages/find-events.html?login_success=true');
      } 
      // Default Fallback
      else {
          res.redirect('/pages/find-events.html');
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect('/pages/login-admin.html?error=callback_failed');
    }
  }
);

// --- MANUAL LOGIN ROUTE ---
app.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid email address' });
    
    if (user.authProvider === 'google' && !user.password) {
        return res.status(400).json({ success: false, message: 'Please login with Google' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Incorrect password' });

    req.login(user, async (err) => {
        if (err) return next(err);

        // Force Admin Role in Session (and DB if needed)
        if (user.role !== 'admin') {
            user.role = 'admin';
            await user.save();
        }

        // Return success. Frontend handles the redirect logic based on where the user is.
        return res.json({ 
            success: true, 
            message: 'Login successful!', 
            user: { username: user.username, role: 'admin' },
            redirectUrl: '/pages/find-events.html'
        });
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// --- ADMIN SIGNUP ROUTE (Now redundant role-wise, but keeps separate entry) ---
app.post('/signup-admin', async (req, res) => {
  try {
    const { username, email, password } = req.body; // Removed mobile for simplicity or add if needed
    
    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ message: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ 
        username, 
        email, 
        password: hashedPassword,
        role: 'admin', // Always Admin
        authProvider: 'manual' 
    });
    
    await newUser.save();
    res.status(201).json({ message: 'Account created successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error registering account' });
  }
});

// --- USER SIGNUP ROUTE (Unified to Admin) ---
app.post('/signup', async (req, res) => {
  // Use same logic as admin signup since everyone is admin now
  try {
    const { username, email, password } = req.body;
    
    console.log('Signup attempt:', { username, email }); // Debug log
    
    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ message: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = new User({ 
        username, 
        email, 
        password: hashedPassword, 
        role: 'admin', // Unified Role
        authProvider: 'manual'
    });
    await newUser.save();

    console.log('User created successfully:', newUser._id); // Debug log

    // MODIFIED: Send the redirect URL so the frontend doesn't go to "undefined"
    res.status(201).json({ 
        success: true, 
        message: 'User registered successfully!', 
        redirectUrl: '/pages/find-events.html?new_signup=true' 
    });
  } catch (error) {
    console.error('Signup error:', error); // Debug log
    res.status(500).json({ success: false, message: 'Error registering user: ' + error.message });
  }
});

// --- LOGOUT ROUTE ---
app.get('/logout', (req, res, next) => {
    req.logout((err) => {
      if (err) { return next(err); }
      res.redirect('/');
    });
});

// --- API: Auth Status ---
app.get('/api/auth-status', (req, res) => {
    if (req.isAuthenticated()) {
        return res.json({ 
            isAuthenticated: true, 
            role: 'admin', // Always return admin
            user: req.user.username 
        });
    }
    return res.json({ isAuthenticated: false });
});

// --- Registration Persistence Routes (Preserved) ---
app.get('/api/user-registrations', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.json({ registeredEvents: [] });
    }
    try {
        const regs = await Registration.find({ userId: req.user._id }).select('eventName');
        const names = regs.map(r => r.eventName);
        res.json({ registeredEvents: names });
    } catch (error) {
        console.error("Error fetching registrations:", error);
        res.status(500).json({ registeredEvents: [] });
    }
});

app.post('/api/register-event', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    try {
        const { eventName } = req.body;
        if (!eventName) return res.status(400).json({ success: false });

        await Registration.updateOne(
            { userId: req.user._id, eventName: eventName },
            { $set: { registeredAt: new Date() } },
            { upsert: true }
        );
        res.json({ success: true });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ success: false });
    }
});

// --- API ROUTES (Event Logic) ---
// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } });
const cpUpload = upload.fields([{ name: 'eventImage', maxCount: 1 }, { name: 'eventBrochure', maxCount: 1 }]);

app.get('/api/my-events', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
        const events = await Event.find({ createdBy: req.user._id }).sort({ _id: -1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// --- CRITICAL: EVENT FETCHING LOGIC ---
// Ensures Newest Events are returned first.
// The frontend reverses this list before rendering to the top of the stack.
app.get('/api/events', async (req, res) => {
    try {
        const events = await Event.find({}).sort({ _id: -1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: "Server error fetching events." });
    }
});

app.post('/api/events', cpUpload, async (req, res) => {
    try {
        // 1. Validation (Existing)
        if (!req.files || !req.files['eventImage'] || !req.files['eventBrochure']) {
            return res.status(400).json({ message: "Both Image and Brochure are required." });
        }
        if (!req.user) return res.status(401).json({ message: "You must be logged in." });
        
        // --- NEW: Construct Date Object for TTL ---
        const rawDate = req.body.date || req.body.eventDate;
        const rawTime = req.body.time || req.body.eventTime;
        
        // Create an ISO formatted string (YYYY-MM-DDTHH:MM) to ensure correct Date parsing
        // This ensures the TTL index knows exactly when the event happens.
        const combinedDateTime = new Date(`${rawDate}T${rawTime}:00`);

        // 2. Create Event Object (Updated)
        const newEvent = new Event({
            organizerName: req.body.organizerName, 
            latitude: req.body.latitude,
            longitude: req.body.longitude,
            eventName: req.body.eventName,
            category: req.body.category,
            organizationName: req.body.organizationName,
            organizerEmail: req.body.organizerEmail,
            mobileNumber: req.body.mobileNumber, 
            address: req.body.address,
            city: req.body.city,
            googleFormLink: req.body.googleFormLink,
            
            // Keep original strings for frontend display
            date: rawDate, 
            time: rawTime,
            
            // Add the new Date object for backend auto-deletion
            eventDateTime: combinedDateTime,

            createdBy: req.user._id,
            imagePath: req.files['eventImage'][0].path,
            brochurePath: req.files['eventBrochure'][0].path
        });

        // 3. Save to Database
        await newEvent.save();
        res.status(201).json({ message: "Event saved successfully!" });

    } catch (error) {
        console.error("❌ SAVE ERROR:", error); 
        res.status(500).json({ message: "Server error: " + error.message });
    }
});

// --- NEW ROUTE: DELETE EVENT ---
app.delete('/api/events/:id', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const eventId = req.params.id;
        const userId = req.user._id;

        // Find the event first to get its name
        const event = await Event.findOne({ _id: eventId, createdBy: userId });
        if (!event) {
            return res.status(404).json({ message: "Event not found or you are not authorized to delete it." });
        }

        // Delete the event
        await Event.findOneAndDelete({ _id: eventId, createdBy: userId });
        
        // Clean up all registrations for this event
        await Registration.deleteMany({ eventName: event.eventName });

        res.json({ success: true, message: "Event deleted successfully." });

    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ message: "Server error during deletion." });
    }
});


// Catch-all route to serve the frontend for non-API/Auth/Uploads routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});


