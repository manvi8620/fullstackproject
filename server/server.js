const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// --- Config ---
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/saas-dashboard';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-this';

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- MongoDB Connection ---
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- Mongoose Schemas ---

// Tenant Schema
const TenantSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // e.g., 'acme', 'globex'
  name: { type: String, required: true },
  theme: { type: Object, required: true },
  features: { type: Object, required: true },
});
const Tenant = mongoose.model('Tenant', TenantSchema);

// User Schema
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true }, // Hashed password
  role: { type: String, required: true, enum: ['admin', 'member'], default: 'member' },
  tenantId: { type: String, required: true, index: true }, // Reference to Tenant.id
});
const User = mongoose.model('User', UserSchema);

// Project Schema
const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: { type: String, required: true },
  tenantId: { type: String, required: true, index: true }, // Data isolation
});
const Project = mongoose.model('Project', ProjectSchema);


// --- Auth Middleware ---
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // CRITICAL: Check if token tenantId matches URL tenantId
    if (decoded.tenantId !== req.params.tenantId) {
      return res.status(403).json({ message: 'Forbidden: Token is not valid for this tenant' });
    }
    
    req.user = decoded; // Add user payload to request
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};


// --- API Routes ---

// [PUBLIC] Get tenant settings (theme, name)
app.get('/api/settings/:tenantId', async (req, res) => {
  try {
    const tenant = await Tenant.findOne({ id: req.params.tenantId });
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }
    // Return only public-safe info
    res.json({
      id: tenant.id,
      name: tenant.name,
      theme: tenant.theme,
      features: tenant.features, // Send features to client
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// [PUBLIC] Login
app.post('/api/:tenantId/auth/login', async (req, res) => {
  const { tenantId } = req.params;
  const { email, password } = req.body;

  try {
    // 1. Find user by email
    const user = await User.findOne({ email });

    // 2. Validate user, password, and tenant
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // 3. CRITICAL: Check if user belongs to the tenant they're logging into
    if (user.tenantId !== tenantId) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 4. Generate JWT
    const payload = {
      sub: user._id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId, // Token is scoped to the tenant
    };
    
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    
    // Send token and user info (excluding password)
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// [PROTECTED] Get projects for a tenant
app.get('/api/:tenantId/projects', authMiddleware, async (req, res) => {
  try {
    // authMiddleware already confirmed tenantId, so this query is safe
    const projects = await Project.find({ tenantId: req.params.tenantId });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// [PROTECTED] Update tenant theme
app.put('/api/:tenantId/admin/theme', authMiddleware, async (req, res) => {
  // Check role
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Not an admin' });
  }

  try {
    const tenant = await Tenant.findOne({ id: req.params.tenantId });
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    // Merge new theme properties
    tenant.theme = { ...tenant.theme, ...req.body };
    await tenant.save();

    res.json(tenant.theme);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


// [PUBLIC] Endpoint to seed the database (FOR DEMO ONLY)
app.post('/api/seed', async (req, res) => {
  try {
    // Clear existing data
    await Tenant.deleteMany({});
    await User.deleteMany({});
    await Project.deleteMany({});

    // Hash passwords
    const salt = await bcrypt.genSalt(10);
    const pass123 = await bcrypt.hash('password123', salt);

    // Seed Tenants
    const acmeTheme = {
        '--primary-color': '#0ea5e9',
        '--secondary-color': '#6366f1',
        '--background-color': '#f3f4f6',
        '--sidebar-color': '#1f2937',
        '--sidebar-text-color': '#e5e7eb',
        '--text-color': '#111827',
        '--logo-text': 'ACME'
    };
    const globexTheme = {
        '--primary-color': '#10b981',
        '--secondary-color': '#f97316',
        '--background-color': '#f9fafb',
        '--sidebar-color': '#ffffff',
        '--sidebar-text-color': '#374151',
        '--text-color': '#374151',
        '--logo-text': 'GLOBEX'
    };
    
    await Tenant.create([
      { id: 'acme', name: 'Acme Corp', theme: acmeTheme, features: { analytics: true, userManagement: false } },
      { id: 'globex', name: 'Globex Industries', theme: globexTheme, features: { analytics: true, userManagement: true } },
    ]);

    // Seed Users
    await User.create([
      { tenantId: 'acme', name: 'Alice (Acme)', email: 'acme-user@acme.com', password: pass123, role: 'admin' },
      { tenantId: 'acme', name: 'Sanskar Sinha (Acme)', email: 'sanskarsinhanew@gmail.com', password: pass123, role: 'admin' },
      { tenantId: 'globex', name: 'Bob (Globex)', email: 'globex-user@globex.com', password: pass123, role: 'admin' },
      { tenantId: 'globex', name: 'Charlie (Globex)', email: 'globex-member@globex.com', password: pass123, role: 'member' },
    ]);

    // Seed Projects
    await Project.create([
      { tenantId: 'acme', name: 'Acme Project Alpha', status: 'Active' },
      { tenantId: 'acme', name: 'Acme Project Beta', status: 'Pending' },
      { tenantId: 'globex', name: 'Globex Project Phoenix', status: 'Active' },
    ]);

    res.status(201).json({ message: 'Database seeded successfully!' });
  } catch (error) {
     res.status(500).json({ message: 'Seed error', error: error.message });
  }
});


// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});