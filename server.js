const express = require('express');
const axios = require('axios');
const session = require('express-session');
const path = require('path');
const assetRoutes = require('./assets-api'); // Import modular asset routes

const app = express();
const port = process.env.PORT || 3000;

// Static user store
const users = {
  'testuser': { password: 'password123', role: 'customer' },
  'adminuser': { password: 'adminpass', role: 'admin' }
};

// ForgeRock OAuth2 settings
const CLIENT_ID = 'plainid_test_app';
const CLIENT_SECRET = 'Admin@12345';
const REDIRECT_URI = 'https://plainid.onrender.com/callback';
const FORGEROCK_AUTH_URL = 'https://openam-acnemea20230705.forgeblocks.com/am/oauth2/realms/root/realms/bravo/authorize';
const FORGEROCK_TOKEN_URL = 'https://openam-acnemea20230705.forgeblocks.com/am/oauth2/realms/root/realms/bravo/access_token';
const FORGEROCK_USERINFO_URL = 'https://openam-acnemea20230705.forgeblocks.com/am/oauth2/realms/root/realms/bravo/userinfo';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}));

// Local login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (user && user.password === password) {
    req.session.user = { username, role: user.role };
    req.session.accessToken = 'static';
    return res.json({ success: true, role: user.role, message: 'Login successful' });
  }
  res.status(401).json({ success: false, message: 'Invalid username or password' });
});

// Register
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password required' });
  }
  if (users[username]) {
    return res.status(400).json({ success: false, message: 'Username already exists' });
  }
  users[username] = { password, role: 'customer' };
  return res.json({ success: true, message: 'Registration successful' });
});

// ForgeRock OAuth login
app.get('/auth/forgerock', (req, res) => {
  const authUrl = `${FORGEROCK_AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=openid%20profile%20email&prompt=login`;
  res.redirect(authUrl);
});

// ForgeRock OAuth callback
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
    user.role = (user.email === 'admin@example.com' || user.preferred_username === 'adminuser') ? 'admin' : 'customer';
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

// User info
app.get('/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  const { name, email, username, role } = req.session.user;
  res.json({ name, email, username, role });
});

// Logout
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

// ✅ Mount modular asset APIs (accounts, branches, payments, etc.)
app.use('/api/assets', assetRoutes);

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
