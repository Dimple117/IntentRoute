import { AVATAR_PRESETS, AVATAR_COLORS } from '../constants';

function initials(name) {
  return name ? name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) : '?';
}

function Hair({ style, color }) {
  switch (style) {
    case 'short':
      return <path d="M14 34 Q14 8 40 8 Q66 8 66 34 L66 26 Q66 14 40 14 Q14 14 14 26 Z" fill={color} />;
    case 'bun':
      return (
        <>
          <path d="M13 33 Q13 9 40 9 Q67 9 67 33 L67 24 Q67 13 40 13 Q13 13 13 24 Z" fill={color} />
          <circle cx="40" cy="7" r="7" fill={color} />
        </>
      );
    case 'curly':
      return (
        <g fill={color}>
          <circle cx="18" cy="20" r="9" /><circle cx="30" cy="12" r="10" />
          <circle cx="44" cy="10" r="10" /><circle cx="57" cy="14" r="9.5" />
          <circle cx="65" cy="24" r="8.5" /><circle cx="15" cy="30" r="7" />
        </g>
      );
    case 'long':
      return (
        <path d="M12 30 Q10 6 40 6 Q70 6 68 30 L70 62 Q64 66 62 52 L60 28 Q60 12 40 12 Q20 12 20 28 L18 52 Q16 66 10 62 Z" fill={color} />
      );
    case 'afro':
      return <circle cx="40" cy="24" r="27" fill={color} />;
    case 'cap':
      return (
        <>
          <path d="M12 28 Q12 8 40 8 Q68 8 68 28 L68 22 Q68 14 40 14 Q12 14 12 22 Z" fill={color} />
          <ellipse cx="40" cy="16" rx="30" ry="9" fill="var(--a1)" />
          <rect x="34" y="10" width="34" height="9" rx="4" fill="var(--a1)" />
        </>
      );
    case 'bald':
    default:
      return null;
  }
}

function Accessory({ type }) {
  switch (type) {
    case 'glasses':
      return (
        <g stroke="#22303f" strokeWidth="2.5" fill="rgba(255,255,255,.15)">
          <circle cx="30" cy="40" r="8" /><circle cx="50" cy="40" r="8" />
          <line x1="38" y1="40" x2="42" y2="40" />
        </g>
      );
    case 'earrings':
      return (
        <g fill="#ffd54a">
          <circle cx="18" cy="46" r="2.4" /><circle cx="62" cy="46" r="2.4" />
        </g>
      );
    case 'headband':
      return <rect x="12" y="20" width="56" height="6" rx="3" fill="var(--a3)" />;
    case 'cap':
    case 'none':
    default:
      return null;
  }
}

/** Original cartoon student avatar — parametric SVG, not a reproduction of any branded character set. */
export function CartoonAvatar({ preset, size = 80 }) {
  if (!preset) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="40" fill={preset.top} opacity="0.18" />
      <circle cx="40" cy="44" r="26" fill={preset.skin} />
      <path d="M22 62 Q40 78 58 62 L58 50 L22 50 Z" fill={preset.top} />
      <circle cx="31" cy="42" r="3" fill="#22303f" />
      <circle cx="49" cy="42" r="3" fill="#22303f" />
      <path d="M32 52 Q40 58 48 52" stroke="#22303f" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <Hair style={preset.hairStyle} color={preset.hair} />
      <Accessory type={preset.accessory} />
    </svg>
  );
}

/** Renders whichever avatar the user has selected — cartoon preset id, or legacy color-initials index. */
export default function Avatar({ avatar, name, size = 40 }) {
  const preset = AVATAR_PRESETS.find((p) => p.id === avatar);
  if (preset) {
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
        <CartoonAvatar preset={preset} size={size} />
      </div>
    );
  }
  const idx = parseInt(avatar, 10) || 0;
  const c = AVATAR_COLORS[idx] || AVATAR_COLORS[0];
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%', background: c.bg, color: c.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: size * 0.4, flexShrink: 0,
      }}
    >
      {initials(name)}
    </div>
  );
}
