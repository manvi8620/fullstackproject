import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
// --- IMPORT THE NEW API CLIENT ---
import * as api from './api';

// --- SEED DATA and FAKE API ARE NOW REMOVED ---
// (They are replaced by the api.js client and the Node.js server)


// --- React Contexts ---

// AuthContext: Holds user and token, manages login/logout
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  // --- UPDATED LOGIN FUNCTION ---
  const login = (tenantId, email, password) => {
    // Use the real API
    return api.login(tenantId, email, password).then(data => {
      // data contains { token, user } from the server
      setUser(data.user);
      setToken(data.token);
      // In a real app, you'd save the token to localStorage here
    });
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    // In a real app, you'd remove the token from localStorage here
  };

  const value = { user, token, login, logout, isAuthenticated: !!user };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ThemeContext: Holds current tenant theme
const ThemeContext = createContext(null);
const useTheme = () => useContext(ThemeContext);

/**
 * This component takes a theme object and applies it to its children
 * using CSS variables. This is the core of runtime theming.
 */
const ThemeProvider = ({ theme, children }) => {
  const themeStyle = useMemo(() => {
    return theme ? Object.entries(theme).reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {}) : {};
  }, [theme]);

  if (!theme) return <Spinner text="Loading theme..." />;

  // Apply theme as CSS variables to the wrapper div
  return (
    <ThemeContext.Provider value={theme}>
      <div style={themeStyle} className="h-full w-full">
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

// --- Helper Hook: Tenant Resolution ---

/**
 * Reads tenant ID from the URL hash (e.g., #/t/acme)
 * This simulates subdomain or path-based routing.
 */
const useTenant = () => {
  const [tenant, setTenant] = useState({ id: null, name: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash; // e.g., #/t/acme
      const match = hash.match(/^#\/t\/([^/]+)/);
      const tenantId = match ? match[1] : null;

      if (tenantId) {
        setLoading(true);
        setError(null);
        // --- UPDATED TO USE REAL API ---
        api.getTenantSettings(tenantId)
          .then(settings => {
            setTenant(settings); // settings is { id, name, theme, features }
          })
          .catch(err => {
            console.error(err);
            setError('Tenant not found. Invalid URL.');
            setTenant({ id: null, name: null });
          })
          .finally(() => {
            setLoading(false);
          });
      } else {
        setLoading(false);
        setError(null);
        setTenant({ id: null, name: null });
      }
    };

    // Initial check
    handleHashChange();

    // Listen for changes
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  return { tenant, loading, error };
};

// --- UI Components ---
// (These components are identical to before, as they
//  are just UI and consume the contexts)

const Spinner = ({ text = "Loading..." }) => (
  <div className="flex flex-col items-center justify-center h-full w-full bg-gray-100">
    <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <span className="mt-2 text-gray-700">{text}</span>
  </div>
);

const Logo = () => {
  const theme = useTheme();
  return (
    <div 
      className="text-2xl font-bold h-10 w-10 flex items-center justify-center rounded-lg"
      style={{ 
        backgroundColor: 'var(--primary-color)',
        color: 'white'
      }}
    >
      {theme['--logo-text']?.substring(0, 1) || 'S'}
    </div>
  );
};

const Header = () => {
  const { user, logout } = useAuth();
  const theme = useTheme();

  return (
    <header className="flex items-center justify-between p-4 h-16 shadow-md" style={{ backgroundColor: 'white', color: 'var(--text-color)' }}>
      <div className="flex items-center gap-4">
        <Logo />
        <h1 className="text-xl font-semibold">{theme.name || 'SaaS Dashboard'}</h1>
      </div>
      <div className="flex items-center gap-4">
        <span>{user.name} ({user.role})</span>
        <button
          onClick={logout}
          className="px-4 py-2 rounded-lg text-white font-medium"
          style={{ backgroundColor: 'var(--secondary-color)' }}
        >
          Log Out
        </button>
      </div>
    </header>
  );
};

const Sidebar = ({ view, setView }) => {
  const { user } = useAuth();
  const { tenant } = useTenant(); // We need tenant features

  const navItems = [
    { name: 'Dashboard', view: 'dashboard' },
    { name: 'Analytics', view: 'analytics', feature: 'analytics' },
    { name: 'Users', view: 'users', feature: 'userManagement' },
    { name: 'Admin', view: 'admin', role: 'admin' },
  ];

  // Need to get features from the tenant object
  const tenantFeatures = tenant.features || {};
  const userRole = user.role;

  const accessibleItems = navItems.filter(item => {
    if (item.feature && !tenantFeatures[item.feature]) return false;
    if (item.role && item.role !== userRole) return false;
    return true;
  });
  
  return (
    <nav className="w-64 p-4 flex flex-col gap-2" style={{ backgroundColor: 'var(--sidebar-color)', color: 'var(--sidebar-text-color)' }}>
      {accessibleItems.map(item => (
        <button
          key={item.view}
          onClick={() => setView(item.view)}
          className={`w-full text-left px-4 py-3 rounded-lg ${
            view === item.view 
              ? 'font-bold' 
              : 'opacity-80 hover:opacity-100'
          }`}
          style={{ 
            backgroundColor: view === item.view ? 'var(--primary-color)' : 'transparent',
            color: view === item.view ? 'white' : 'var(--sidebar-text-color)'
          }}
        >
          {item.name}
        </button>
      ))}
    </nav>
  );
};

// --- Page Components ---

const DashboardContent = () => {
  const { token } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return; // Don't fetch if not logged in

    setLoading(true);
    // --- UPDATED TO USE REAL API ---
    api.getProjects(token)
      .then(setProjects) // data is the array of projects
      .catch(err => {
        console.error(err);
        setError(new Error('Failed to load projects.'));
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <Spinner text="Loading projects..." />;
  if (error) return <div className="p-4 text-red-500">Error: {error.message}</div>;

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-6" style={{ color: 'var(--text-color)' }}>Your Projects</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(project => (
          <div key={project._id} className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--primary-color)' }}>{project.name}</h3>
            <span 
              className="px-3 py-1 text-sm font-medium rounded-full"
              style={{ 
                backgroundColor: project.status === 'Active' ? 'var(--primary-color)' : '#d1d5db',
                color: project.status === 'Active' ? 'white' : '#374151'
              }}
            >
              {project.status}
            </span>
          </div>
        ))}
      </div>
      {projects.length === 0 && (
        <p className="text-gray-500">No projects found for this tenant.</p>
      )}
    </div>
  );
};

const AdminConsole = ({ onThemeChange }) => {
  const theme = useTheme();
  const { token } = useAuth();
  const [formState, setFormState] = useState(theme);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFormState(theme);
  }, [theme]);

  const handleChange = (e) => {
    setFormState({
      ...formState,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    // Only send changed values
    const newTheme = {
      '--primary-color': formState['--primary-color'],
      '--secondary-color': formState['--secondary-color'],
      '--logo-text': formState['--logo-text'],
    };
    
    // --- UPDATED TO USE REAL API ---
    api.updateTheme(token, newTheme)
      .then(updatedTheme => {
        onThemeChange(updatedTheme); // Notify App to update state
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const ColorInput = ({ name, label }) => (
    <div className="flex items-center justify-between">
      <label htmlFor={name} className="font-medium">{label}</label>
      <input
        type="color"
        id={name}
        name={name}
        value={formState[name]}
        onChange={handleChange}
        className="w-24 h-10 rounded border-none cursor-pointer"
      />
    </div>
  );

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-6" style={{ color: 'var(--text-color)' }}>Tenant Branding</h2>
      <form onSubmit={handleSubmit} className="max-w-md bg-white p-6 rounded-xl shadow-lg border border-gray-200 space-y-6">
        <ColorInput name="--primary-color" label="Primary Color" />
        <ColorInput name="--secondary-color" label="Secondary Color" />
        <div>
          <label htmlFor="--logo-text" className="block font-medium mb-1">Logo Text</label>
          <input
            type="text"
            id="--logo-text"
            name="--logo-text"
            value={formState['--logo-text']}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-3 rounded-lg text-white font-medium disabled:opacity-50"
          style={{ backgroundColor: 'var(--primary-color)' }}
        >
          {loading ? 'Saving...' : 'Save Theme'}
        </button>
      </form>
    </div>
  );
};

const PlaceholderContent = ({ title }) => (
  <div className="p-8">
    <h2 className="text-3xl font-bold mb-6" style={{ color: 'var(--text-color)' }}>{title}</h2>
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
      <p>Content for {title} goes here.</p>
      <p className="mt-2 text-gray-500">This module is enabled for your tenant.</p>
    </div>
  </div>
);


const LoginScreen = ({ tenant, onLoginSuccess }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Set default logins for easier testing
  useEffect(() => {
    if (tenant.id === 'acme') setEmail('sanskarsinhanew@gmail.com');
    if (tenant.id === 'globex') setEmail('globex-user@globex.com');
    setPassword('password123');
  }, [tenant.id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    login(tenant.id, email, password)
      .then(() => {
        onLoginSuccess();
      })
      .catch(err => {
        // Handle server error messages
        const message = err.response?.data?.message || 'Login failed. Please try again.';
        setError(message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="flex items-center justify-center h-full w-full" style={{ backgroundColor: 'var(--background-color)' }}>
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-2xl border border-gray-200">
        <div className="flex justify-center mb-6">
          <div 
            className="text-4xl font-bold h-16 w-16 flex items-center justify-center rounded-2xl text-white"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            {tenant.theme['--logo-text']?.substring(0, 1) || 'S'}
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center mb-2" style={{ color: 'var(--text-color)' }}>
          Welcome to {tenant.name}
        </h2>
        <p className="text-center text-gray-500 mb-6">Sign in to your account</p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg text-white font-semibold disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

const DashboardLayout = ({ onThemeChange }) => {
  const [view, setView] = useState('dashboard'); // Simple routing

  const renderView = () => {
    switch(view) {
      case 'dashboard':
        return <DashboardContent />;
      case 'admin':
        return <AdminConsole onThemeChange={onThemeChange} />;
      case 'analytics':
        return <PlaceholderContent title="Analytics" />;
      case 'users':
        return <PlaceholderContent title="User Management" />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-full" style={{ backgroundColor: 'var(--background-color)', color: 'var(--text-color)' }}>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar view={view} setView={setView} />
        <main className="flex-1 overflow-y-auto">
          {renderView()}
        </main>
      </div>
    </div>
  );
};

// If no tenant is selected
const TenantSelector = () => (
  <div className="h-screen w-screen bg-gray-900 flex flex-col items-center justify-center text-white p-8">
    <h1 className="text-5xl font-bold mb-4">Multi-Tenant SaaS Demo</h1>
    <p className="text-xl text-gray-300 mb-12">Please select a tenant to simulate visiting their unique URL.</p>
    <div className="flex gap-8">
      <a href="#/t/acme" className="text-center px-10 py-8 bg-sky-500 text-white rounded-2xl shadow-xl transform hover:scale-105 transition-transform">
        <h2 className="text-3xl font-bold">Acme Corp</h2>
        <p className="text-lg font-light">#/t/acme</p>
      </a>
      <a href="#/t/globex" className="text-center px-10 py-8 bg-emerald-500 text-white rounded-2xl shadow-xl transform hover:scale-105 transition-transform">
        <h2 className="text-3xl font-bold">Globex Industries</h2>
        <p className="text-lg font-light">#/t/globex</p>
      </a>
    </div>
  </div>
);


// --- Main App Component ---

function App() {
  const { tenant, loading, error } = useTenant();
  const { isAuthenticated, logout } = useAuth();
  
  // This state holds the theme *config*, which is passed to ThemeProvider
  // It's separate from the Auth state.
  const [theme, setTheme] = useState(null);

  // When tenant changes (from URL), or on logout, reload the theme
  useEffect(() => {
    if (tenant.id) {
      setTheme(tenant.theme);
    } else {
      setTheme(null); // Clear theme if no tenant
      logout(); // Also log out user if tenant becomes invalid
    }
  }, [tenant, logout]); // Added logout to dependency array

  // Main render logic
  if (loading) {
    return <Spinner text="Resolving tenant..." />;
  }
  
  if (error) {
    return <div className="h-screen w-screen flex items-center justify-center bg-red-100 text-red-700">{error}</div>;
  }

  // 1. No Tenant in URL -> Show selection page
  if (!tenant.id) {
    return <TenantSelector />;
  }

  // 2. Tenant resolved -> Wrap in ThemeProvider
  // We must also check that the theme object is loaded
  if (!theme) {
     return <Spinner text="Loading theme..." />;
  }
  
  return (
    <ThemeProvider theme={theme}>
      {/* 3. User not authenticated -> Show LoginScreen */}
      {!isAuthenticated ? (
        <LoginScreen tenant={tenant} onLoginSuccess={() => { /* AuthProvider handles state */ }} />
      ) : (
        /* 4. User authenticated -> Show DashboardLayout */
        <DashboardLayout onThemeChange={setTheme} />
      )}
    </ThemeProvider>
  );
}

// Wrap the entire app in the AuthProvider
export default function MultiTenantApp() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}