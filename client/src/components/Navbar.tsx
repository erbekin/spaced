import { Link } from 'react-router-dom';

type NavbarProps = {
  isLoggedIn: boolean;
  onLogout: () => void;
};

export default function Navbar({ isLoggedIn, onLogout }: NavbarProps) {
  return (
    <header className="flex items-center border-b border-gray-300 bg-white">
      <div className="w-48 px-6 py-4 border-r border-gray-300 font-bold tracking-wider text-xl">
        <Link to="/">SPACED</Link>
      </div>
      <nav className="flex-1 px-6 py-4 flex justify-between items-center text-sm font-medium text-gray-600">
        <div className="flex gap-6">
          {isLoggedIn && (
            <Link to="/spaces" className="hover:text-gray-900 transition-colors">
              Spaces
            </Link>
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
