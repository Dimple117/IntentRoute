// frontend/src/campus-map/FacilityAdminPanel.jsx
//
// Modal form for adding a new facility or editing an existing one, driven
// by explicit latitude/longitude fields (per the requirement to add/edit
// facilities "using their latitude and longitude coordinates"). Also
// supports "pick point on map" and "use my current location" shortcuts.

import { useState } from 'react';
import { ALL_CATEGORIES } from './mapConfig';
import { createFacility, updateFacility, deleteFacility } from './campusMapApi';

const emptyForm = {
  name: '', category: 'STUDY', description: '',
  latitude: '', longitude: '', opening_time: '00:00', closing_time: '23:59',
  building: '', floor: '', icon: '',
};

export default function FacilityAdminPanel({
  token, onUnauthorized, toast,
  initial, pickedPoint, onRequestPickPoint, myPosition,
  onSaved, onClose,
}) {
  const [form, setForm] = useState(() => (
    initial
      ? { ...emptyForm, ...initial, latitude: String(initial.latitude), longitude: String(initial.longitude) }
      : { ...emptyForm, ...(pickedPoint ? { latitude: String(pickedPoint[0]), longitude: String(pickedPoint[1]) } : {}) }
  ));
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial?.id);

  // Keep lat/lon in sync if the user picks a new point on the map while the form is open.
  if (pickedPoint && (form.latitude !== String(pickedPoint[0]) || form.longitude !== String(pickedPoint[1]))) {
    // Only auto-fill once per pick, not fight the user's manual typing:
    // handled by parent clearing pickedPoint after applying it once.
  }

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function useMyLocation() {
    if (!myPosition) { toast?.('Live location not available yet'); return; }
    set('latitude', String(myPosition.lat));
    set('longitude', String(myPosition.lon));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const lat = parseFloat(form.latitude), lon = parseFloat(form.longitude);
    if (!form.name.trim()) return toast?.('Facility name is required');
    if (Number.isNaN(lat) || Number.isNaN(lon)) return toast?.('Enter valid latitude/longitude');

    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      description: form.description,
      latitude: lat,
      longitude: lon,
      opening_time: form.opening_time || '00:00',
      closing_time: form.closing_time || '23:59',
      building: form.building || null,
      floor: form.floor || null,
      icon: form.icon || null,
    };

    setSaving(true);
    try {
      const saved = isEdit
        ? await updateFacility(token, initial.id, payload, onUnauthorized)
        : await createFacility(token, payload, onUnauthorized);
      toast?.(isEdit ? '✅ Facility updated' : '✅ Facility added');
      onSaved?.(saved);
    } catch (err) {
      toast?.('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!window.confirm(`Delete "${initial.name}"?`)) return;
    setSaving(true);
    try {
      await deleteFacility(token, initial.id, onUnauthorized);
      toast?.('🗑️ Facility deleted');
      onSaved?.(null, initial.id);
    } catch (err) {
      toast?.('Delete failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="cm-modal-backdrop" onClick={onClose}>
      <form className="cm-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="cm-modal-head">
          <strong>{isEdit ? 'Edit facility' : 'Add facility'}</strong>
          <button type="button" className="cm-icon-btn" onClick={onClose}>✕</button>
        </div>

        <label className="cm-field">
          <span>Name</span>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Main Canteen" required />
        </label>

        <div className="cm-row">
          <label className="cm-field">
            <span>Category</span>
            <select value={form.category} onChange={(e) => set('category', e.target.value)}>
              {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="cm-field cm-field-sm">
            <span>Icon (optional)</span>
            <input value={form.icon} onChange={(e) => set('icon', e.target.value)} placeholder="🍽️" />
          </label>
        </div>

        <div className="cm-row">
          <label className="cm-field">
            <span>Latitude</span>
            <input value={form.latitude} onChange={(e) => set('latitude', e.target.value)} placeholder="12.30410" required inputMode="decimal" />
          </label>
          <label className="cm-field">
            <span>Longitude</span>
            <input value={form.longitude} onChange={(e) => set('longitude', e.target.value)} placeholder="76.71130" required inputMode="decimal" />
          </label>
        </div>

        <div className="cm-row cm-coord-actions">
          <button type="button" className="cm-btn-ghost" onClick={onRequestPickPoint}>📍 Pick point on map</button>
          <button type="button" className="cm-btn-ghost" onClick={useMyLocation}>🎯 Use my location</button>
        </div>

        <div className="cm-row">
          <label className="cm-field">
            <span>Building</span>
            <input value={form.building} onChange={(e) => set('building', e.target.value)} placeholder="e.g. Library Block" />
          </label>
          <label className="cm-field">
            <span>Floor</span>
            <input value={form.floor} onChange={(e) => set('floor', e.target.value)} placeholder="e.g. Ground Floor" />
          </label>
        </div>

        <div className="cm-row">
          <label className="cm-field">
            <span>Opens</span>
            <input type="time" value={form.opening_time} onChange={(e) => set('opening_time', e.target.value)} />
          </label>
          <label className="cm-field">
            <span>Closes</span>
            <input type="time" value={form.closing_time} onChange={(e) => set('closing_time', e.target.value)} />
          </label>
        </div>

        <label className="cm-field">
          <span>Description</span>
          <textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What's here?" />
        </label>

        <div className="cm-modal-actions">
          {isEdit && (
            <button type="button" className="cm-btn-danger" onClick={handleDelete} disabled={saving}>Delete</button>
          )}
          <div style={{ flex: 1 }} />
          <button type="button" className="cm-btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="cm-btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}
