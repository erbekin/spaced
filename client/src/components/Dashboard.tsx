import { type User } from '../types';

type DashboardProps = {
  user: User;
};

export default function Dashboard({ user }: DashboardProps) {
  return (
    <div className="w-full max-w-lg border border-gray-300 bg-white p-6 rounded shadow-sm">
      <h2 className="text-xl font-bold mb-4">Dashboard</h2>
      <div className="space-y-2 text-sm text-gray-700 bg-gray-50 p-4 rounded border border-gray-200">
        <p><strong className="text-gray-900">ID:</strong> {user.id}</p>
        <p><strong className="text-gray-900">Username:</strong> {user.username}</p>
        <p><strong className="text-gray-900">Email:</strong> {user.email}</p>
        {user.name && <p><strong className="text-gray-900">Name:</strong> {user.name}</p>}
      </div>
    </div>
  );
}
