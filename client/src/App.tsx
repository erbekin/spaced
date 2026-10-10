import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import SpaceList from './components/SpaceList';
import CreateSpace from './components/CreateSpace';
import EditSpace from './components/EditSpace';
import OwnPostsPage from './components/OwnPostsPage';
import CreatePost from './components/CreatePost';
import HomePage from './components/HomePage';
import EditHomePost from './components/EditHomePost';
import AuthProvider from './components/AuthProvider';
import PostView from './components/PostView';
import NotFound from './components/NotFound';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';

function AppRoutes() {
  const { token, user, handleLogout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar isLoggedIn={!!token} onLogout={handleLogout} username={user?.username ?? null} />
      <main className="flex-1 flex items-start justify-center p-8 pt-10">
        <Routes>
          // login page or redirect to '/' if already logged in
          <Route
            path="/login"
            element={ <LoginPage />}
          />
          <Route
            path="/posts/view/:postId"
            element={<PostView />}
          />
          <Route path="/home/:username" element={<HomePage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route path="/home/:username/spaces" element={<SpaceList />} />
            <Route path="/spaces/new" element={<CreateSpace />} />
            <Route path="/spaces/:slug/edit" element={<EditSpace />} />
            <Route path="/posts" element={<OwnPostsPage />} />
            <Route path="/posts/new" element={<CreatePost />} />
            <Route path="/home/:username/edit" element={<EditHomePost />} />
          </Route>

          // NotFound
          <Route path="*" element={<NotFound />} />
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
