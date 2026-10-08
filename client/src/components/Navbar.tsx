import { Link } from 'react-router-dom';
import Logo from './Logo';
type NavbarProps = {
  isLoggedIn: boolean;
  onLogout: () => void;
  username: string | null;
};

export default function Navbar({ isLoggedIn, onLogout, username }: NavbarProps) {
  return (
    <header className="flex items-center border-b border-gray-300 bg-white">
      <div className="w-48 px-6 py-4 border-r border-gray-300 font-bold tracking-wider text-xl">
        <Logo />
      </div>
      <nav className="flex-1 px-6 py-4 flex justify-between items-center text-sm font-medium text-gray-600">
        <div className="flex gap-6">
          {isLoggedIn && username && (
            <>
              <Link to={`/home/${username}`} className="hover:text-gray-900 transition-colors">
                Home
              </Link>
              <Link to="/spaces" className="hover:text-gray-900 transition-colors">
                Spaces
              </Link>
              <Link to="/posts" className="hover:text-gray-900 transition-colors">
                Posts
              </Link>
            </>
          )}
        </div>
        {isLoggedIn ? (
          <button onClick={onLogout} className="text-red-600 hover:text-red-800 transition-colors">
            Log out
          </button>
        ) : (
          <span>Welcome</span>
        )}
      </nav>
    </header>
  );
}
