import React, { useState, useEffect } from 'react';
import { X, Save, Edit3, Loader2, Calendar, Clock, MapPin } from 'lucide-react';
import AdminTimePicker from './AdminTimePicker';
import AdminDatePicker from './AdminDatePicker';

const VENUE_ROOM_OPTIONS = [
  'Room A107',
  'Room A108',
  'AIML Lab',
];

function parseTimeRange(str) {
  if (!str) return { startTime: '10:00', endTime: '11:30' };
  const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)?/gi;
  const matches = [...str.matchAll(timeRegex)];

  function to24h(h, m, meridiem) {
    let hours = parseInt(h, 10);
    const isPM = meridiem && meridiem.toUpperCase() === 'PM';
    const isAM = meridiem && meridiem.toUpperCase() === 'AM';
    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    return String(hours).padStart(2, '0') + ':' + m;
  }

  let startTime = '10:00';
  let endTime = '11:30';

  if (matches.length >= 1) {
    startTime = to24h(matches[0][1], matches[0][2], matches[0][3] || 'AM');
  }
  if (matches.length >= 2) {
    endTime = to24h(matches[1][1], matches[1][2], matches[1][3] || 'AM');
  }
  return { startTime, endTime };
}

function formatTimeRange(start24, end24) {
  function to12h(time24) {
    if (!time24) return '';
    const [h, m] = time24.split(':').map(Number);
    const meridiem = h >= 12 ? 'PM' : 'AM';
    const hours = h % 12 || 12;
    return `${hours}:${String(m).padStart(2, '0')} ${meridiem}`;
  }
  if (start24 && end24) {
    return `${to12h(start24)} – ${to12h(end24)}`;
  }
  if (start24) {
    return to12h(start24);
  }
  return '';
}

export default function AdminEditActivityModal({ isOpen, onClose, activity, onSave }) {
  const [eventDate, setEventDate] = useState('2026-11-24');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:30');
  const [room, setRoom] = useState(VENUE_ROOM_OPTIONS[0]);
  const [isCustomRoom, setIsCustomRoom] = useState(false);
  const [customRoomValue, setCustomRoomValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (activity) {
      const times = parseTimeRange(activity.scheduledTime);
      setStartTime(times.startTime);
      setEndTime(times.endTime);
      setEventDate(activity.eventDate || '2026-11-24');

      const isCustom = activity.room && !VENUE_ROOM_OPTIONS.includes(activity.room);
      setIsCustomRoom(Boolean(isCustom));
      setRoom(isCustom ? 'CUSTOM_OTHER' : (activity.room || VENUE_ROOM_OPTIONS[0]));
      setCustomRoomValue(isCustom ? activity.room : '');
      setError('');
    }
  }, [activity]);

  if (!isOpen || !activity) return null;

  const formattedTime = formatTimeRange(startTime, endTime);
  const effectiveRoom = isCustomRoom ? customRoomValue.trim() : room;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!effectiveRoom) {
      setError('Please select or specify a room/venue');
      return;
    }
    setError('');
    try {
      setSaving(true);
      await onSave(activity.id, {
        room: effectiveRoom,
        scheduledTime: formattedTime,
        eventDate: eventDate.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update activity');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 sm:pt-16 bg-black/40 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="max-w-md w-full bg-surface-container-lowest border border-surface-container rounded-3xl p-5 sm:p-6 shadow-2xl relative text-on-surface h-auto max-h-fit">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-secondary hover:text-on-surface rounded-xl hover:bg-surface-container transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-surface-container border border-surface-container-high text-primary flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-on-surface">Edit Activity Info</h2>
              <p className="text-xs text-secondary font-medium">{activity.name}</p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-error-container border border-error/20 text-xs text-on-error-container">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Top Row: Left is Date Picker (MUI), Right is Room/Venue Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>Event Date</span>
                </label>
                <AdminDatePicker
                  value={eventDate}
                  onChange={setEventDate}
                  label="Select Date"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span>Room / Venue</span>
                </label>
                <select
                  value={isCustomRoom ? 'CUSTOM_OTHER' : room}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'CUSTOM_OTHER') {
                      setIsCustomRoom(true);
                    } else {
                      setIsCustomRoom(false);
                      setRoom(val);
                    }
                  }}
                  className="w-full bg-surface-container-low border border-surface-container focus:border-primary rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none cursor-pointer"
                >
                  {VENUE_ROOM_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                  <option value="CUSTOM_OTHER">+ Other / Custom Room...</option>
                </select>

                {isCustomRoom && (
                  <input
                    type="text"
                    required
                    value={customRoomValue}
                    onChange={(e) => setCustomRoomValue(e.target.value)}
                    placeholder="Enter custom room name..."
                    className="mt-1.5 w-full bg-surface-container-low border border-surface-container focus:border-primary rounded-xl py-1 px-2 text-xs text-on-surface focus:outline-none animate-fadeIn"
                    autoFocus
                  />
                )}
              </div>
            </div>

            {/* Entire Bottom Half: Scheduled Time with MUI TimePicker */}
            <div className="pt-0.5">
              <label className="block text-xs font-semibold text-on-surface mb-0.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-secondary" />
                  <span>Scheduled Time (Start &amp; End)</span>
                </span>
                <span className="text-[10px] text-primary font-mono font-bold">
                  {formattedTime}
                </span>
              </label>
              <AdminTimePicker
                startTime={startTime}
                endTime={endTime}
                onChangeStart={setStartTime}
                onChangeEnd={setEndTime}
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-surface-container">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="py-2 px-4 rounded-xl border border-surface-container hover:bg-surface-container text-xs font-semibold text-secondary hover:text-on-surface transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="py-2 px-5 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-2 active:scale-95"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin text-on-primary" />}
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
