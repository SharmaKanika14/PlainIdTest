/*Static Content before Forgerock Integration

const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

const users = {
  'testuser': { password: 'password123', role: 'customer' },
  'adminuser': { password: 'adminpass', role: 'admin' }
};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users[username];

  if (user && user.password === password) {
    res.json({
      success: true,
      role: user.role,
      message: 'Login successful'
    });
  } else {
    res.status(401).json({ success: false, message: 'Invalid username or password' });
  }
});

// New registration endpoint
app.post('/register', (req, res) => {
  const { username, password } = req.body;

  if (users[username]) {
    return res.status(400).json({ success: false, message: 'Username already exists' });
  }
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password required' });
  }

  users[username] = { password, role: 'customer' }; // default role is customer
  res.json({ success: true, message: 'Registration successful, please login' });
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

*/


/*2nd

const express = require('express');
const axios = require('axios');
const session = require('express-session');
const path = require('path');

const app = express();
const port = 3000;

// 🔐 ForgeRock Bravo Realm Configuration
const CLIENT_ID = 'plainid_test_app'; 
const CLIENT_SECRET = 'Admin@12345'; 
const REDIRECT_URI = 'https://plainid.onrender.com/callback';

const FORGEROCK_AUTH_URL = 'https://openam-acnemea20230705.forgeblocks.com:443/am/oauth2/realms/root/realms/bravo/authorize';
const FORGEROCK_TOKEN_URL = 'https://openam-acnemea20230705.forgeblocks.com:443/am/oauth2/realms/root/realms/bravo/access_token';
const FORGEROCK_USERINFO_URL = 'https://openam-acnemea20230705.forgeblocks.com:443/am/oauth2/realms/root/realms/bravo/userinfo';

app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}));

// 👉 Redirect to ForgeRock login page
app.get('/auth/forgerock', (req, res) => {
  const authUrl = `${FORGEROCK_AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=openid%20profile%20email`;
  res.redirect(authUrl);
});

// 🔁 Handle OAuth2 callback
app.get('/callback', async (req, res) => {
  const { code } = req.query;
  console.log('📥 Received code:', code);

  try {
    console.log('🔁 Requesting access token from:', FORGEROCK_TOKEN_URL);
    const tokenRes = await axios.post(
      FORGEROCK_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const accessToken = tokenRes.data.access_token;
    req.session.accessToken = accessToken;
    console.log('✅ Access token received:', accessToken);


    // 🔎 Get user profile (optional but useful)
    const userInfoRes = await axios.get(FORGEROCK_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    req.session.user = userInfoRes.data;
    console.log('✅ User Info:', userInfoRes.data);

    res.redirect('/dashboard');
  } catch (error) {
    console.error('❌ OAuth Error:', error.response?.data || error.message);
    res.status(500).send('Authentication failed');
  }
});

// 🔐 Dashboard (only for authenticated users)
app.get('/dashboard', (req, res) => {
  if (!req.session.accessToken) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // You can optionally map ForgeRock user info to roles here
  const userInfo = {
    name: req.session.user.name,
    email: req.session.user.email,
    role: req.session.user.role || 'customer' // Example fallback
  };

  res.json(userInfo);
});


// 🚪 Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

*/

const express = require('express');
const axios = require('axios');
const session = require('express-session');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Static user store (for local login & registration)
const users = {
  'testuser': { password: 'password123', role: 'customer' },
  'adminuser': { password: 'adminpass', role: 'admin' }
};

// ForgeRock Bravo realm configuration
const CLIENT_ID = 'plainid_test_app';
const CLIENT_SECRET = 'Admin@12345';
const REDIRECT_URI = 'https://plainid.onrender.com/callback';
const FORGEROCK_AUTH_URL = 'https://openam-acnemea20230705.forgeblocks.com:443/am/oauth2/realms/root/realms/bravo/authorize';
const FORGEROCK_TOKEN_URL = 'https://openam-acnemea20230705.forgeblocks.com:443/am/oauth2/realms/root/realms/bravo/access_token';
const FORGEROCK_USERINFO_URL = 'https://openam-acnemea20230705.forgeblocks.com:443/am/oauth2/realms/root/realms/bravo/userinfo';
const FORGEROCK_LOGOUT_URL = 'https://openam-acnemea20230705.forgeblocks.com:443/am/oauth2/realms/root/realms/bravo/logout';

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}));

// Local Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users[username];

  if (user && user.password === password) {
    req.session.user = { username, role: user.role };
    req.session.accessToken = 'static'; // to mark as logged in
    return res.json({ success: true, role: user.role, message: 'Login successful' });
  }
  res.status(401).json({ success: false, message: 'Invalid username or password' });
});

// Local Registration
app.post('/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password required' });
  }

  if (users[username]) {
    return res.status(400).json({ success: false, message: 'Username already exists' });
  }

  users[username] = { password, role: 'customer' };
  return res.json({ success: true, message: 'Registration successful, please login' });
});

// ForgeRock OAuth Login
app.get('/auth/forgerock', (req, res) => {
  const authUrl = `${FORGEROCK_AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=openid%20profile%20email`;
  res.redirect(authUrl);
});

// ForgeRock OAuth Callback
app.get('/callback', async (req, res) => {
  const { code } = req.query;
  console.log('📥 Received auth code:', code);

  try {
    const tokenRes = await axios.post(
      FORGEROCK_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenRes.data.access_token;
    req.session.accessToken = accessToken;

    const userInfoRes = await axios.get(FORGEROCK_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const user = userInfoRes.data;

    // Determine role
    if (user.email === 'admin@example.com' || user.preferred_username === 'adminuser') {
      user.role = 'admin';
    } else {
      user.role = 'customer';
    }

    req.session.user = user;
    console.log('✅ Logged in user from ForgeRock:', user);

    res.redirect('/dashboard');
  } catch (error) {
    console.error('❌ OAuth Error:', error.response?.data || error.message);
    res.status(500).send('Authentication failed');
  }
});

// Dashboard
app.get('/dashboard', (req, res) => {
  if (!req.session.accessToken) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// User Info
app.get('/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  const { name, email, username, role } = req.session.user;
  res.json({ name, email, username, role });
});

// Logout route: clear session and redirect with logout message
app.get('/logout', (req, res) => {
  const redirectAfterLogout = 'https://plainid.onrender.com/?logged_out=true';
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).send('Logout failed');
    }
    res.clearCookie('connect.sid');
    res.redirect(redirectAfterLogout);
  });
});

// Auth route with prompt=login to force fresh login on each auth attempt
app.get('/auth/forgerock', (req, res) => {
  const authUrl = `${FORGEROCK_AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=openid%20profile%20email&prompt=login`;
  res.redirect(authUrl);
});


// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
