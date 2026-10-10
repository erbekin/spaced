import { Link, NavLink } from 'react-router-dom';
import Logo from './Logo';
import GoToUserHome from './GoToUserHome';
type NavbarProps = {
  isLoggedIn: boolean;
  onLogout: () => void;
  username: string | null;
};

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "text-sm font-medium tracking-tight text-black",
    "border-b-2 pb-0.5 transition-colors",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2",
    isActive
      ? "border-black"
      : "border-transparent hover:border-black",
  ].join(" ");

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
              <NavLink to={`/home/${username}`} end className={linkClass}>
                Home
              </NavLink>
              <NavLink to={`/home/${username}/spaces`} className={linkClass}>
                Spaces
              </NavLink>
              <NavLink to="/posts" className={linkClass}>
                Posts
              </NavLink>
              <GoToUserHome />
            </>
          )}
        </div>
        {isLoggedIn ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 italic">
              You are logged in as {username ? `@${username}` : 'user'}
            </span>
            <button
              onClick={onLogout}
              className="px-4 py-1.5 text-sm font-semibold text-white bg-red-700 hover:bg-yellow-700 rounded-md transition-colors"
            >
              Log out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Welcome</span>
            <Link
              to="/login"
              className="px-4 py-1.5 text-sm font-semibold text-white bg-gray-900 hover:bg-black rounded-md transition-colors"
            >
              Log in
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
