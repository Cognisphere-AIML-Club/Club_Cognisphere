import { useState, useEffect } from 'react';
import dayjs from 'dayjs';

/**
 * Parses time strings like "10:00 AM – 11:30 AM (90 Mins Total)" or "1:30 PM"
 * into 24-hour { startTime: '10:00', endTime: '11:30' } format.
 */
export function parseTimeRange(str) {
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

/**
 * Formats 24h start and end times into standard "10:00 AM – 11:30 AM" format.
 */
export function formatTimeRange(start24, end24) {
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

/**
 * Calculates real-time activity status dynamically based on date and scheduled time.
 * - Greater than 5 hours until start: "Upcoming"
 * - Within 5 hours until start: Hour & minute countdown (e.g. "In 3h 15m")
 * - Ongoing (between start & end): "In Progress" (Live)
 * - Past end: "Completed"
 */
export function getActivityStatus(activity, now = new Date()) {
  if (!activity) {
    return { status: 'Upcoming', label: 'Upcoming', isLive: false, isCountdown: false };
  }

  const dateStr = activity.eventDate || '2026-11-24';
  const { startTime, endTime } = parseTimeRange(activity.scheduledTime);

  const start = dayjs(`${dateStr}T${startTime}:00`);
  const end = dayjs(`${dateStr}T${endTime}:00`);
  const current = dayjs(now);

  if (!start.isValid() || !end.isValid()) {
    return { status: 'Upcoming', label: 'Upcoming', isLive: false, isCountdown: false };
  }

  if (current.isBefore(start)) {
    const diffMs = start.diff(current);
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours > 5) {
      return { status: 'Upcoming', label: 'Upcoming', isLive: false, isCountdown: false };
    } else {
      const h = Math.floor(diffMs / (1000 * 60 * 60));
      const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const countdownText = h > 0 ? `In ${h}h ${m}m` : `In ${m}m`;
      return { status: 'Upcoming', label: countdownText, isLive: false, isCountdown: true };
    }
  }

  if (current.isAfter(end)) {
    return { status: 'Completed', label: 'Completed', isLive: false, isCountdown: false };
  }

  return { status: 'In Progress', label: 'In Progress', isLive: true, isCountdown: false };
}

/**
 * React hook to automatically keep activity status & countdown ticking live
 */
export function useActivityStatus(activity) {
  const [statusInfo, setStatusInfo] = useState(() => getActivityStatus(activity));

  useEffect(() => {
    setStatusInfo(getActivityStatus(activity));
    const interval = setInterval(() => {
      setStatusInfo(getActivityStatus(activity));
    }, 30000); // 30s tick
    return () => clearInterval(interval);
  }, [activity?.eventDate, activity?.scheduledTime]);

  return statusInfo;
}

