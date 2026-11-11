import { useState, useEffect } from 'react';
import { 
  subscribeAnnouncements, 
  createAnnouncement, 
  deleteAnnouncement, 
  updateAnnouncement, 
  updateAnnouncementPin,
  getFilteredDefaultAnnouncements,
  sortAnnouncements
} from '../services/announcementService';

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState(() => sortAnnouncements(getFilteredDefaultAnnouncements()));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeAnnouncements((data) => {
      setAnnouncements(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const postAnnouncement = async ({ title, message, type, pinned, authorEmail }) => {
    return await createAnnouncement({ title, message, type, pinned, authorEmail });
  };

  const editAnnouncement = async (id, updates) => {
    // Instant optimistic update
    setAnnouncements(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, ...updates } : a);
      return sortAnnouncements(updated);
    });
    return await updateAnnouncement(id, updates);
  };

  const removeAnnouncement = async (id) => {
    // Instant optimistic update
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    return await deleteAnnouncement(id);
  };

  const togglePinAnnouncement = async (id, currentPinned) => {
    const targetItem = announcements.find(a => a.id === id);
    // Instant optimistic update
    setAnnouncements(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, pinned: !currentPinned } : a);
      return sortAnnouncements(updated);
    });
    return await updateAnnouncementPin(id, currentPinned, targetItem);
  };

  return {
    announcements,
    loading,
    postAnnouncement,
    editAnnouncement,
    removeAnnouncement,
    togglePinAnnouncement
  };
}
