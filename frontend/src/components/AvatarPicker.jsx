import { AVATAR_PRESETS } from '../constants';
import { CartoonAvatar } from './Avatar';

export default function AvatarPicker({ value, onChange }) {
  return (
    <div className="avatar-picker">
      {AVATAR_PRESETS.map((p) => (
        <div
          key={p.id}
          className={`av-opt ${value === p.id ? 'selected' : ''}`}
          onClick={() => onChange(p.id)}
          title="Choose this avatar"
        >
          <CartoonAvatar preset={p} size={48} />
        </div>
      ))}
    </div>
  );
}
