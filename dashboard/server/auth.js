import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';

const ENABLE_GOOGLE_AUTH = process.env.ENABLE_GOOGLE_AUTH === 'true';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// In-memory user store (sufficient for a dev tool)
const users = new Map();

export function setupAuth(app) {
  if (!ENABLE_GOOGLE_AUTH) return;

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/auth/google/callback',
      },
      (_accessToken, _refreshToken, profile, done) => {
        const user = {
          id: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
          picture: profile.photos?.[0]?.value,
        };
        users.set(user.id, user);
        done(null, user);
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) => {
    const user = users.get(id);
    done(null, user || null);
  });

  app.use(passport.initialize());

  // Google OAuth redirect
  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

  // Google OAuth callback
  app.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: FRONTEND_URL, session: false }),
    (req, res) => {
      const token = jwt.sign(
        { id: req.user.id, email: req.user.email, name: req.user.name, picture: req.user.picture },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      res.redirect(`${FRONTEND_URL}/auth/callback?token=${encodeURIComponent(token)}`);
    }
  );

  // Verify token endpoint
  app.get('/auth/me', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    try {
      const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
      res.json(decoded);
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  });
}

// Middleware that only enforces auth when ENABLE_GOOGLE_AUTH is true
export function authGuard(req, res, next) {
  if (!ENABLE_GOOGLE_AUTH) return next();

  // Skip auth for auth routes and static assets
  if (req.path.startsWith('/auth/')) return next();

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    req.user = jwt.verify(authHeader.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
