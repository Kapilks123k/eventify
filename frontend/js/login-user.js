document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const views = {
    login: document.getElementById('view-login'),
    signup: document.getElementById('view-signup')
  };
  
  const forms = {
    login: document.getElementById('form-login'),
    signup: document.getElementById('form-signup')
  };
  
  const toggles = {
    showSignup: document.getElementById('btn-show-signup'),
    showLogin: document.getElementById('btn-show-login')
  };

  const statusMsg = document.getElementById('status-message');

  // --- NEW: Handle URL Error Params ---
  const urlParams = new URLSearchParams(window.location.search);
  const errorParam = urlParams.get('error');
  if (errorParam && statusMsg) {
      let msg = "Login failed.";
      if (errorParam === 'server_error') msg = "Server error during login. Please try again.";
      else if (errorParam === 'google_auth_failed') msg = "Google authentication failed.";
      else if (errorParam === 'oauth_not_configured') msg = "Google Login is not configured.";
      else if (errorParam === 'oauth_invalid_client') msg = "Invalid Google Credentials. Check Render Environment Variables.";
      else if (errorParam === 'callback_failed') msg = "Login callback failed.";
      
      statusMsg.textContent = msg;
      statusMsg.className = 'status-message status-error';
      statusMsg.style.display = 'block';
      
      // Clean URL so the error doesn't persist on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
  }

  // --- Helper Functions ---
  
  function switchView(viewName) {
    if (!views.login || !views.signup) return;
    statusMsg.style.display = 'none'; 
    if (viewName === 'signup') {
      views.login.classList.remove('active');
      views.signup.classList.add('active');
    } else {
      views.signup.classList.remove('active');
      views.login.classList.add('active');
    }
  }

  function showMessage(text, type) {
    if (!statusMsg) return;
    statusMsg.textContent = text;
    statusMsg.className = `status-message status-${type}`;
    statusMsg.style.display = 'block';
  }

  // --- Event Listeners ---

  if (toggles.showSignup) {
    toggles.showSignup.addEventListener('click', (e) => {
      e.preventDefault();
      switchView('signup');
    });
  }

  if (toggles.showLogin) {
    toggles.showLogin.addEventListener('click', (e) => {
      e.preventDefault();
      switchView('login');
    });
  }

  // --- 1. HANDLE MANUAL LOGIN (Email & Password) ---
  if (forms.login) {
  forms.login.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Updated: Fetching Email instead of Username
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');

    if (!emailInput || !passwordInput) {
        showMessage('Error: Login input fields not found.', 'error');
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    // Capture redirect URL from query parameters (e.g., ?redirect=/pages/create-event.html)
    const urlParams = new URLSearchParams(window.location.search);
    const redirectParam = urlParams.get('redirect');

    if (!email || !password) {
      showMessage('Please enter both email and password.', 'error');
      return;
    }

    showMessage('Verifying credentials...', 'success');

    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password, redirectUrl: redirectParam })
      });

      // Check if response is actually JSON (handles 500/502 HTML error pages)
      const contentType = response.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
          data = await response.json();
      } else {
          const text = await response.text();
          console.error("Server returned non-JSON response:", text);
          throw new Error("Server returned an error (HTML) instead of JSON. The server might be down or crashing.");
      }

      if (response.ok && data.success) {
        showMessage('Login successful! Redirecting...', 'success');
        
        // Show dashboard link
        const dashboardContainer = document.getElementById('dashboard-link-container');
        if (dashboardContainer) {
          dashboardContainer.style.display = 'block';
        }
        
        setTimeout(() => {
          window.location.href = data.redirectUrl || '/pages/find-events.html';
        }, 1000);
      } else {
        showMessage(data.message || 'Login failed', 'error');
      }
    } catch (error) {
      console.error('Login Fetch Error:', error);
      showMessage('Server connection failed. If on Render, the server might be waking up (wait 30s).', 'error');
    }
  });
  }

  // --- 2. HANDLE SIGNUP (Username, Email, Password) ---
  if (forms.signup) {
  forms.signup.addEventListener('submit', async (e) => {
    e.preventDefault();

    const usernameInput = document.getElementById('signup-username');
    const emailInput = document.getElementById('signup-email');
    const passwordInput = document.getElementById('signup-password');

    if (!usernameInput || !emailInput || !passwordInput) {
        showMessage('Error: Signup input fields not found.', 'error');
        return;
    }

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !email || !password) {
      showMessage('All fields are required.', 'error');
      return;
    }

    if (password.length < 6) {
      showMessage('Password must be at least 6 characters.', 'error');
      return;
    }

    showMessage('Creating your account...', 'success');

    try {
      const response = await fetch('/signup', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showMessage('Account created successfully! Redirecting...', 'success');
        forms.signup.reset();

        setTimeout(() => {
          window.location.href = '/pages/find-events.html?new_signup=true'; 
        }, 1500);
      } else {
        showMessage(data.message || 'Registration failed', 'error');
      }
    } catch (error) {
      console.error('Signup Error:', error);
      showMessage('Server error. Please try again later.', 'error');
    }
  });
  }

  // --- 3. GOOGLE OAUTH REDIRECT ---
  // USE EVENT DELEGATION: Catches clicks on ANY Google link/button, even if IDs mismatch
  document.body.addEventListener('click', (e) => {
      // Find the closest anchor or button
      const target = e.target.closest('a, button');
      
      if (target) {
          const href = target.getAttribute('href') || '';
          const text = target.innerText || '';

          // Check if it's a Google login button (by Href or Text)
          if (href.includes('google') || text.toLowerCase().includes('google')) {
              e.preventDefault(); // STOP the browser from going to localhost
              
              const urlParams = new URLSearchParams(window.location.search);
              const redirectParam = urlParams.get('redirect');
              
              let authUrl = '/auth/google';
              if (window.location.pathname.includes('login-admin.html') || (redirectParam && redirectParam.includes('create-event'))) {
                  authUrl += '?origin=admin_page';
              }
              window.location.href = authUrl;
          }
      }
  });
});
