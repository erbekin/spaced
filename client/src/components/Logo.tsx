import { Link } from 'react-router-dom';

export default function Logo() {
  return (
    <Link
      to="/"
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
