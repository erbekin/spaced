import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import AuthCard from './components/AuthCard';
import SpaceList from './components/SpaceList';
import CreateSpace from './components/CreateSpace';

function AppRoutes() {
  const { token, user, handleLogin, handleLogout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar isLoggedIn={!!token} onLogout={handleLogout} />
      <main className="flex-1 flex items-center justify-center p-6">
        <Routes>
          <Route
            path="/"
            element={token && user ? <Dashboard user={user} /> : <AuthCard onLogin={handleLogin} />}
          />
          <Route
            path="/spaces"
            element={token && user ? <SpaceList /> : <Navigate to="/" />}
          />
          <Route
            path="/spaces/new"
            element={token ? <CreateSpace /> : <Navigate to="/" />}
          />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
