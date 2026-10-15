import { useState } from 'react';

export default function ThemeToggle({ theme, setTheme }) {
  const [switching, setSwitching] = useState(false);

  function toggle() {
    setSwitching(true);
    setTheme(theme === 'dark' ? 'light' : 'dark');
    setTimeout(() => setSwitching(false), 400);
  }

  return (
    <button id="themeToggle" className={switching ? 'switching' : ''} onClick={toggle} title="Switch theme">
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
