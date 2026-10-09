import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthCard from '../components/AuthCard';
import SpaceBackground from '../components/SpaceBackground';
import type { User } from '../types';

const ROTATING_TEXTS = [
  'Explore personal knowledge universes.',
  'Your thoughts, cleanly spaced out.',
  'Capture ideas across infinite spaces.',
  'Write, connect, and discover.',
  'A calm workspace for focused minds.',
];

export default function LoginPage() {
  const { token, user, handleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: Location })?.from?.pathname || '/';

  // Rotating text state
  const [currentText, setCurrentText] = useState(() => {
    return ROTATING_TEXTS[Math.floor(Math.random() * ROTATING_TEXTS.length)];
  });
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');

  const cycleCountRef = useRef(0);
  const prevIndexRef = useRef<number>(-1);

  // Pick random next index ensuring it never repeats the previous one
  const getRandomIndex = () => {
    let nextIndex: number;
    do {
      nextIndex = Math.floor(Math.random() * ROTATING_TEXTS.length);
    } while (nextIndex === prevIndexRef.current && ROTATING_TEXTS.length > 1);
    prevIndexRef.current = nextIndex;
    return nextIndex;
  };

  useEffect(() => {
    // Stop after 10 full phrase transitions
    if (cycleCountRef.current >= 10) return;

    // 1. Wait 3 seconds, then start fading out
    const fadeOutTimer = setTimeout(() => {
      setFadeState('out');
    }, 3000);

    // 2. At 3.5 seconds, swap the text and fade back in
    const switchTimer = setTimeout(() => {
      const nextIdx = getRandomIndex();
      setCurrentText(ROTATING_TEXTS[nextIdx]);
      setFadeState('in');
      cycleCountRef.current += 1;
    }, 3500);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(switchTimer);
    };
  }, [currentText]);

  useEffect(() => {
    if (token && user) {
      navigate(from, { replace: true });
    }
  }, [token, user, navigate, from]);

  const onSuccessfulAuth = (token: string, userData: User) => {
    handleLogin(token, userData);
    navigate(from, { replace: true });
  };

  return (
    <div className="relative w-full h-[calc(100vh-5rem)] flex items-center justify-center overflow-hidden">
      <SpaceBackground />

      {/* Centered Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4 p-8 bg-white/95 backdrop-blur border border-gray-200 rounded-2xl shadow-xl">
        <header className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 font-sans">
            Welcome to SPACED!
          </h2>

          {/* Animated Dynamic Subtitle */}
          <p
            className={`text-sm text-gray-500 mt-1 h-5 transition-opacity duration-500 ease-in-out ${
              fadeState === 'in' ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {currentText}
          </p>
        </header>

        <AuthCard onLogin={onSuccessfulAuth} />
      </div>
    </div>
  );
}
