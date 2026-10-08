import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import AuthCard from './components/AuthCard';
import SpaceList from './components/SpaceList';
import CreateSpace from './components/CreateSpace';
import EditSpace from './components/EditSpace';
import PostsPage from './components/PostsPage';
import CreatePost from './components/CreatePost';
import HomePage from './components/HomePage';
import EditHomePost from './components/EditHomePost';
import AuthProvider from './components/AuthProvider';
import PostView from './components/PostView';

function AppRoutes() {
  const { token, user, handleLogin, handleLogout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar isLoggedIn={!!token} onLogout={handleLogout} username={user?.username ?? null} />
      <main className="flex-1 flex items-start justify-center p-8 pt-10">
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
          <Route
            path="/spaces/:slug/edit"
            element={token && user ? <EditSpace /> : <Navigate to="/" />}
          />
          <Route
            path="/posts"
            element={token && user ? <PostsPage /> : <Navigate to="/" />}
          />
          <Route
            path="/posts/new"
            element={token && user ? <CreatePost /> : <Navigate to="/" />}
          />
          <Route
            path="/posts/view/:postId"
            element={<PostView />}
          />
          <Route
            path="/home/:username"
            element={token && user ? <HomePage /> : <Navigate to="/" />}
          />
          <Route
            path="/home/:username/edit"
            element={token && user ? <EditHomePost /> : <Navigate to="/" />}
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
