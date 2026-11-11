import { useState, useEffect } from 'react';
import { 
  subscribeScoresForActivity, 
  publishScore, 
  unpublishScore, 
  fetchActivityAttendees 
} from '../services/scoreService';

export function useScores(activityId) {
  const [scores, setScores] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activityId) return;

    setLoading(true);
    const unsubscribe = subscribeScoresForActivity(activityId, (data) => {
      setScores(data);
      setLoading(false);
    });

    // Also fetch attendees for admin picking
    fetchActivityAttendees(activityId).then(setAttendees).catch(() => {});

    return () => unsubscribe();
  }, [activityId]);

  const refreshAttendees = async () => {
    if (activityId) {
      const list = await fetchActivityAttendees(activityId);
      setAttendees(list);
    }
  };

  const handlePublish = async (scoreData) => {
    return await publishScore({ ...scoreData, activityId });
  };

  const handleUnpublish = async (participantId) => {
    return await unpublishScore(activityId, participantId);
  };

  return {
    scores,
    attendees,
    loading,
    refreshAttendees,
    publishScore: handlePublish,
    unpublishScore: handleUnpublish
  };
}

