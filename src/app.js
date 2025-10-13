// App.js (Simplified Router Setup)
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PublicProfile from './pages/PublicProfile';
import AuthGuard from './components/layout/AuthGuard';

const App = () => (
  <HashRouter>
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<Navigate to="/register" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/u/:username" element={<PublicProfile />} />
      
      {/* Protected Dashboard */}
      <Route 
        path="/dashboard" 
        element={<AuthGuard><Dashboard /></AuthGuard>} 
      />

      {/* Fallback route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </HashRouter>
);
// ... The public URL will look like: https://[username].github.io/linkspark/#/u/john_doe
