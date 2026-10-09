import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="w-full max-w-md border border-gray-200 rounded-lg bg-white p-8 text-center shadow-sm space-y-4">
      <h1 className="text-4xl font-extrabold text-gray-900">404</h1>
      <h2 className="text-lg font-semibold text-gray-800">Page not found</h2>
      <p className="text-sm text-gray-500">
        Sorry, the page you are looking for does not exist or has been moved.
      </p>
      <div>
        <Link
          to="/"
          className="inline-block bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-black transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
