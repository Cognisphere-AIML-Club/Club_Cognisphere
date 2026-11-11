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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 text-white">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              {initialAnnouncement ? <Edit3 className="w-4 h-4" /> : <Megaphone className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {initialAnnouncement ? 'Edit Announcement' : 'Post Event Announcement'}
              </h3>
              <p className="text-xs text-slate-400">
                {initialAnnouncement ? 'Updates live on participant feed and projector screen' : 'Broadcasts to participant feed and projector big screen'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Announcement Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Reverse Prompt Stage 2 Started"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Message Details
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Participants in Room 101 now have 25 minutes for image generation."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Priority Accent
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="info">Info (Default Blue)</option>
                <option value="urgent">Urgent / Alert (Amber)</option>
                <option value="success">Success / Milestone (Emerald)</option>
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span className="font-medium">Pin to Top of Feed</span>
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 transition-all shadow-md flex items-center gap-1.5"
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

