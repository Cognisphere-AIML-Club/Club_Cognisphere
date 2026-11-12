import React, { useState, useEffect } from 'react';
import { Megaphone, X, Check, AlertCircle, Edit3 } from 'lucide-react';

export default function AdminAnnouncementModal({ 
  isOpen, 
  onClose, 
  onPost, 
  onUpdate,
  initialAnnouncement = null,
  authorEmail 
}) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info'); // 'info' | 'urgent' | 'success'
  const [pinned, setPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialAnnouncement) {
      setTitle(initialAnnouncement.title || '');
      setMessage(initialAnnouncement.message || '');
      setType(initialAnnouncement.type || 'info');
      setPinned(Boolean(initialAnnouncement.pinned));
    } else {
      setTitle('');
      setMessage('');
      setType('info');
      setPinned(false);
    }
    setError('');
  }, [initialAnnouncement, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError('Please provide both a title and message.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      if (initialAnnouncement?.id && !initialAnnouncement.id.startsWith('default-')) {
        if (onUpdate) {
          await onUpdate(initialAnnouncement.id, {
            title: title.trim(),
            message: message.trim(),
            type,
            pinned
          });
        }
      } else {
        await onPost({
          title: title.trim(),
          message: message.trim(),
          type,
          pinned,
          authorEmail: authorEmail || 'admin'
        });
      }
      onClose();
    } catch (err) {
      console.error('Failed to save announcement:', err);
      setError(err.message || 'Failed to save announcement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface-container-lowest border border-surface-container rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-xl space-y-5 text-on-surface">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-surface-container border border-surface-container-high text-primary flex items-center justify-center">
              {initialAnnouncement ? <Edit3 className="w-4 h-4" /> : <Megaphone className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-on-surface">
                {initialAnnouncement ? 'Edit Announcement' : 'Post Event Announcement'}
              </h3>
              <p className="text-xs text-secondary">
                {initialAnnouncement ? 'Updates live on participant feed and projector screen' : 'Broadcasts to participant feed and projector big screen'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-error-container border border-error/20 text-on-error-container text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-error" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5">
              Announcement Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Reverse Prompt Stage 2 Started"
              className="w-full bg-surface-container-low border border-surface-container rounded-xl px-3.5 py-2.5 text-sm text-on-surface placeholder-secondary focus:outline-none focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5">
              Message Details
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Participants in Room 101 now have 25 minutes for image generation."
              className="w-full bg-surface-container-low border border-surface-container rounded-xl px-3.5 py-2.5 text-sm text-on-surface placeholder-secondary focus:outline-none focus:border-primary resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5">
                Priority Accent
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-surface-container-low border border-surface-container rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="info">Info (Default Blue)</option>
                <option value="urgent">Urgent / Alert (Amber)</option>
                <option value="success">Success / Milestone (Emerald)</option>
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer bg-surface-container-low border border-surface-container rounded-xl px-3 py-2 text-xs text-on-surface hover:border-surface-container-high">
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  className="rounded border-surface-container text-primary focus:ring-0"
                />
                <span className="font-medium">Pin to Top of Feed</span>
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-surface-container flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-secondary hover:text-on-surface bg-surface-container-low hover:bg-surface-container border border-surface-container transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-on-primary bg-primary hover:bg-primary-container disabled:opacity-50 transition-all shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? 'Saving...' : initialAnnouncement ? 'Save Changes' : 'Publish to All Screens'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

