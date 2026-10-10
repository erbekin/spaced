import type { SpaceEntity } from '../types';

type SpaceSelectorProps = {
  spaces: SpaceEntity[];
  value: SpaceEntity | null;
  onChange: (space: SpaceEntity | null) => void;
};

export default function SpaceSelector({ spaces, value, onChange }: SpaceSelectorProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = spaces.find((s) => s.id === e.target.value) ?? null;
    onChange(selected);
  };

  return (
    <select
      value={value?.id ?? ''}
      onChange={handleChange}
      className="text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-black"
    >
      <option value="">Select a space...</option>
      {spaces.map((space) => (
        <option key={space.id} value={space.id}>
          {space.name}
        </option>
      ))}
    </select>
  );
}
