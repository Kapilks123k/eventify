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
  const googleBtn = document.getElementById('btn-google');

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

      const data = await response.json();

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
      console.error('Login Error:', error);
      showMessage('Server error. Please try again later.', 'error');
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
  if (googleBtn) {
  googleBtn.addEventListener('click', (e) => {
    e.preventDefault(); // Prevent following any hardcoded href in the HTML
    // Redirects to the backend Passport route
    const urlParams = new URLSearchParams(window.location.search);
    const redirectParam = urlParams.get('redirect');
    
    let authUrl = '/auth/google';
    if (redirectParam && redirectParam.includes('create-event')) {
        authUrl += '?origin=admin_page';
    }
    window.location.href = authUrl;
  });
  }
});