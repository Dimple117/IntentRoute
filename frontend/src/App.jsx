import { useEffect, useRef, useState } from 'react';
import BgOrbs from './components/BgOrbs';
import ThemeToggle from './components/ThemeToggle';
import Splash from './components/Splash';
import AuthPage from './components/AuthPage';
import LocationPopup from './components/LocationPopup';
import Sidebar from './components/Sidebar';
import VoiceAgent from './components/VoiceAgent';
import Toast from './components/Toast';
import NavigateSection from './components/sections/NavigateSection';
import HistorySection from './components/sections/HistorySection';
import FavouritesSection from './components/sections/FavouritesSection';
import ProfileSection from './components/sections/ProfileSection';
import RouteSection from './components/RouteSection';
import CampusMap from './campus-map/CampusMap';
import { apiFetch } from './api';

import { CAMPUS_CENTER, DEFAULT_LANG } from './constants';

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [token, setToken] = useState(() => localStorage.getItem('ir_token') || null);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('ir_user') || 'null'));
  const [postSplashStage] = useState(() => (localStorage.getItem('ir_token') && localStorage.getItem('ir_user') ? 'location' : 'auth'));
  const [stage, setStage] = useState('splash');
  const [section, setSection] = useState('navigate');
  const [userLat, setUserLat] = useState(null);
  const [userLon, setUserLon] = useState(null);
  const [favIds, setFavIds] = useState(new Set());
  const [toastMsg, setToastMsg] = useState('');
  const [toastShow, setToastShow] = useState(false);
  const [navigateSeed, setNavigateSeed] = useState(0);
  const [replayQuery, setReplayQuery] = useState('');
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [prevSection, setPrevSection] = useState('navigate');
  const [lang, setLang] = useState(() => localStorage.getItem('ir_lang') || DEFAULT_LANG);
  const toastTimer = useRef(null);

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('ir_lang', lang); }, [lang]);

  // Animated "IntentRoute" intro splash, shown once on cold app load, then
  // hands off to whichever stage the user should actually land on.
  useEffect(() => {
    const t = setTimeout(() => setStage(postSplashStage), 2400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toast(msg, dur = 2400) {
    setToastMsg(msg); setToastShow(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastShow(false), dur);
  }

  function onLogin(t, u) {
    setToken(t); setUser(u);
    localStorage.setItem('ir_token', t); localStorage.setItem('ir_user', JSON.stringify(u));
    setStage('location');
  }

  function onUnauthorized() {
    doLogout();
    toast('Session expired — please log in again');
  }

  function doLogout() {
    setToken(null); setUser(null);
    localStorage.removeItem('ir_token'); localStorage.removeItem('ir_user');
    setStage('auth');
  }

  async function loadFavIds(t) {
    try {
      const r = await apiFetch('/favourites', t, {}, onUnauthorized);
      const d = await r.json();
      setFavIds(new Set(d.map((f) => f.id)));
    } catch {}
  }

  function allowLocation() {
    navigator.geolocation.getCurrentPosition(
      (p) => { setUserLat(p.coords.latitude); setUserLon(p.coords.longitude); toast('📍 Location set!'); },
      () => {
        setUserLat(CAMPUS_CENTER.latitude); setUserLon(CAMPUS_CENTER.longitude);
        toast('⚠ Could not get location — starting at the ATME main gate');
      }
    );
    launchApp();
  }
  function skipLocation() {
    setUserLat(CAMPUS_CENTER.latitude); setUserLon(CAMPUS_CENTER.longitude);
    launchApp();
  }
  function launchApp() {
    setStage('app');
    loadFavIds(token);
  }

  async function toggleFav(fid) {
    const isSaved = favIds.has(fid);
    try {
      if (isSaved) {
        await apiFetch(`/favourites/${fid}`, token, { method: 'DELETE' }, onUnauthorized);
        setFavIds((prev) => { const n = new Set(prev); n.delete(fid); return n; });
        toast('Removed from favourites');
      } else {
        await apiFetch(`/favourites/${fid}`, token, { method: 'POST' }, onUnauthorized);
        setFavIds((prev) => new Set(prev).add(fid));
        toast('❤️ Added to favourites');
      }
    } catch (e) { toast('Error: ' + e.message); }
  }

  function viewRoute(facility) {
    setPrevSection(section);
    setSelectedFacility(facility);
    setSection('route');
  }
  function backFromRoute() {
    setSection(prevSection === 'route' ? 'navigate' : prevSection);
    setSelectedFacility(null);
  }

  function onWakeQuery(text) {
    setSection('navigate');
    setReplayQuery(text);
    setNavigateSeed((n) => n + 1);
  }
  function onReplay(q) {
    setSection('navigate');
    setReplayQuery(q);
    setNavigateSeed((n) => n + 1);
  }

  return (
    <>
      <BgOrbs />
      <ThemeToggle theme={theme} setTheme={setTheme} />

      {stage === 'splash' && <Splash />}

      {stage === 'auth' && <AuthPage onLogin={onLogin} toast={toast} />}

      {stage === 'location' && <LocationPopup onAllow={allowLocation} onSkip={skipLocation} />}

      {stage === 'app' && (
        <div id="appPage" className="page visible">
          <div className="app-layout">
            <Sidebar active={section === 'route' ? prevSection : section} onNavigate={setSection} user={user} onLogout={doLogout} lang={lang} setLang={setLang} />
            <main className="main-content">
              {section === 'route' && selectedFacility ? (
                <RouteSection
                  token={token} onUnauthorized={onUnauthorized}
                  userLat={userLat} userLon={userLon}
                  facility={selectedFacility} onBack={backFromRoute} toast={toast}
                />
              ) : (
                <>
                  <div className={`section-page ${section === 'navigate' ? 'active' : ''}`}>
                    <NavigateSection
                      key={navigateSeed}
                      token={token} onUnauthorized={onUnauthorized}
                      userLat={userLat} userLon={userLon}
                      favIds={favIds} toggleFav={toggleFav} toast={toast}
                      initialQuery={navigateSeed > 0 ? replayQuery : ''}
                      autoRun={navigateSeed > 0}
                      autoRunMode="voice"
                      onViewRoute={viewRoute}
                      lang={lang}
                    />
                  </div>
                  {section === 'map' && (
                    <div className="section-page active" style={{ height: 'calc(100vh - 96px)' }}>
                      <CampusMap token={token} onUnauthorized={onUnauthorized} toast={toast} userLat={userLat} userLon={userLon} />
                    </div>
                  )}
                  <HistorySection token={token} onUnauthorized={onUnauthorized} active={section === 'history'} onReplay={onReplay} toast={toast} />
                  <FavouritesSection token={token} onUnauthorized={onUnauthorized} active={section === 'favourites'} onRemoved={(id) => setFavIds((p) => { const n = new Set(p); n.delete(id); return n; })} toast={toast} />
                  <ProfileSection token={token} onUnauthorized={onUnauthorized} active={section === 'profile'} user={user} setUser={(u) => { setUser(u); localStorage.setItem('ir_user', JSON.stringify(u)); }} toast={toast} />
                </>
              )}
            </main>
          </div>
          <VoiceAgent onWakeQuery={onWakeQuery} lang={lang} />
        </div>
      )}

      <Toast message={toastMsg} show={toastShow} />
    </>
  );
}