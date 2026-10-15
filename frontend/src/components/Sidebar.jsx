import Avatar from './Avatar';
import LanguageSelector from './LanguageSelector';

const NAV_ITEMS = [
  { section: 'Main', items: [
    { id: 'navigate', icon: '🧭', label: 'Navigate' },
    { id: 'map', icon: '🗺️', label: 'Live Map' },
  ] },
  {
    section: 'My Account',
    items: [
      { id: 'history', icon: '🕐', label: 'Search History' },
      { id: 'favourites', icon: '❤️', label: 'Favourites' },
      { id: 'profile', icon: '👤', label: 'Profile' },
    ],
  },
];

export default function Sidebar({ active, onNavigate, user, onLogout, lang, setLang }) {
  return (
    <aside className="sidebar">
      <div className="sb-logo">
        <div className="lm">IntentRoute</div>
        <div className="lt">From Intention to Destination</div>
      </div>
      <nav className="sb-nav">
        {NAV_ITEMS.map((group) => (
          <div key={group.section}>
            <div className="sb-section">{group.section}</div>
            {group.items.map((it) => (
              <button
                key={it.id}
                className={`nav-item ${active === it.id ? 'active' : ''}`}
                onClick={() => onNavigate(it.id)}
              >
                <span className="ni">{it.icon}</span> {it.label}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="sb-user">
        <LanguageSelector lang={lang} setLang={setLang} />
        <div className="sb-user-info">
          <div className="sb-avatar"><Avatar avatar={user?.avatar} name={user?.name} size={36} /></div>
          <div>
            <div className="sb-user-name">{user?.name || '—'}</div>
            <div className="sb-user-email">{user?.email || '—'}</div>
          </div>
          <button className="logout-btn" onClick={onLogout} title="Logout">⏏</button>
        </div>
      </div>
    </aside>
  );
}