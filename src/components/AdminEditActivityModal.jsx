import React, { useState, useEffect } from 'react';
import { X, Save, Edit3, Loader2 } from 'lucide-react';

export default function AdminEditActivityModal({ isOpen, onClose, activity, onSave }) {
  const [room, setRoom] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [status, setStatus] = useState('Upcoming');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (activity) {
      setRoom(activity.room || '');
      setScheduledTime(activity.scheduledTime || '10:00 AM');
      setStatus(activity.status || 'Upcoming');
      setDescription(activity.description || '');
      setError('');
    }
  }, [activity]);

  if (!isOpen || !activity) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setSaving(true);
      await onSave(activity.id, {
        room: room.trim(),
        scheduledTime: scheduledTime.trim(),
        status,
        description: description.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update activity');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fadeIn">
      <div className="max-w-md w-full bg-surface-container-lowest border border-surface-container rounded-3xl p-6 sm:p-7 shadow-xl relative text-on-surface">
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1.5">
                  Venue / Room
                </label>
                <input
                  type="text"
                  required
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="e.g. Room 101"
                  className="w-full bg-surface-container-low border border-surface-container focus:border-primary rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1.5">
                  Scheduled Time
                </label>
                <input
                  type="text"
                  required
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  placeholder="e.g. 10:30 AM"
                  className="w-full bg-surface-container-low border border-surface-container focus:border-primary rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">
                Current Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-surface-container-low border border-surface-container focus:border-primary rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none"
              >
                <option value="Upcoming">Upcoming</option>
                <option value="In Progress">In Progress (Live)</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">
                Description / Rules Synopsis
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief guidelines for participants..."
                className="w-full bg-surface-container-low border border-surface-container focus:border-primary rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none resize-none leading-relaxed"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-surface-container-low hover:bg-surface-container text-secondary hover:text-on-surface font-medium rounded-xl text-xs transition-colors border border-surface-container"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 px-4 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

