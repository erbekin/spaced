import { useRef, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

// Easter egg tuning: on the home page, click the logo fast and long enough
const REQUIRED_CLICKS = 8; // total clicks in one streak
const MAX_GAP_MS = 700; // each click must follow the previous one within this
const MIN_DURATION_MS = 1500; // the streak must also last at least this long
const SECRET_PATH = '/watchspace';

export default function Logo() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // A ref, not state: counting clicks must not cause re-renders
  const streak = useRef({ count: 0, start: 0, last: 0 });

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Only active on the home page; elsewhere the logo is a normal link
    if (pathname !== '/') return;
    // Let ctrl/cmd/shift/middle clicks open in a new tab as usual (not counted)
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    // Already on "/", so the link itself would do nothing useful
    e.preventDefault();

    const now = performance.now();
    const s = streak.current;

    if (s.count === 0 || now - s.last > MAX_GAP_MS) {
      // Too slow: start a new streak
      s.count = 1;
      s.start = now;
    } else {
      s.count += 1;
    }
    s.last = now;

    if (s.count >= REQUIRED_CLICKS && now - s.start >= MIN_DURATION_MS) {
      s.count = 0;
      navigate(SECRET_PATH);
    }
  };

  return (
    <Link
      to="/"
      onClick={handleClick}
      className="group relative inline-flex items-center px-2 py-1 select-none"
    >
      {/* Sparkle 1: Top Right */}
      <span className="absolute -top-1 right-1 text-gray-900 text-xs pointer-events-none opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 group-hover:animate-ping">
        ✦
      </span>

      {/* Sparkle 2: Top Left */}
      <span className="absolute -top-2 left-2 text-gray-900 text-xs pointer-events-none opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 delay-100">
        ★
      </span>

      {/* Sparkle 3: Bottom Right */}
      <span className="absolute -bottom-1 right-4 text-gray-900 text-[10px] pointer-events-none opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-400 delay-150">
        ✦
      </span>

      {/* Logo Text with Letter-Spacing Animation */}
      <span className="font-extrabold text-xl tracking-normal text-gray-900 transition-all duration-300 ease-out group-hover:tracking-widest group-hover:text-black">
        SPACED
      </span>
    </Link>
  );
}
