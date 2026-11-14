// Activities single source of truth as defined in club-games-pwa-plan.md Section 1
export const ACTIVITIES = [
  {
    id: 'reverse-prompt',
    name: 'Reverse Prompt Engineering',
    category: 'Technical',
    room: 'Room 101',
    eventDate: '2026-11-24',
    defaultDuration: 900, // 15 mins default round
    scheduledTime: '10:00 AM – 12:00 PM (120 Mins Total)',
    description: 'Deconstruct generated outputs to deduce original prompts through visual analysis and iterative AI prompt refinement.',
    totalDuration: '120 Minutes (2 Hours)',
    scheduleTimeline: [
      { time: '0:00 – 0:10', stage: 'Introduction, rules and platform login check', duration: '10 Minutes', durationSeconds: 600 },
      { time: '0:10 – 0:25', stage: 'Round 1 – Visual Analysis', duration: '15 Minutes', durationSeconds: 900 },
      { time: '0:25 – 0:50', stage: 'Round 2, Stage 1 – Prompt Creation and Submission', duration: '25 Minutes', durationSeconds: 1500 },
      { time: '0:50 – 1:15', stage: 'Round 2, Stage 2 – Image Generation and Refinement', duration: '25 Minutes', durationSeconds: 1500 },
      { time: '1:15 – 1:25', stage: 'Round 2, Stage 3 – Final Submission', duration: '10 Minutes', durationSeconds: 600 },
      { time: '1:25 – 1:50', stage: 'Final Evaluation – judging and finalist explanations', duration: '25 Minutes', durationSeconds: 1500 },
      { time: '1:50 – 2:00', stage: 'Reveal of original prompt, results and prizes', duration: '10 Minutes', durationSeconds: 600 }
    ]
  },
  {
    id: 'ui-ux-makeover',
    name: 'UI/UX Makeover for Websites',
    category: 'Technical',
    room: 'Room 102',
    eventDate: '2026-11-24',
    defaultDuration: 900, // 15 mins
    scheduledTime: '1:30 PM – 3:30 PM',
    description: 'Rapid design critique and redesign proposal'
  },
  {
    id: 'tech-quiz',
    name: 'Tech Quiz',
    category: 'Technical',
    room: 'Room 103',
    eventDate: '2026-11-25',
    defaultDuration: 60, // 1 min per round
    scheduledTime: '10:00 AM – 11:30 AM',
    description: 'Fast-paced technical trivia'
  },
  {
    id: 'sell-me-product',
    name: 'Sell Me This Product',
    category: 'Non-Technical',
    room: 'Room 201',
    eventDate: '2026-11-25',
    defaultDuration: 180, // 3 mins pitch
    scheduledTime: '12:00 PM – 1:30 PM',
    description: 'Impromptu persuasion and product pitching'
  },
  {
    id: 'jam',
    name: 'Just A Minute (JAM)',
    category: 'Non-Technical',
    room: 'Room 202',
    eventDate: '2026-11-25',
    defaultDuration: 60, // 1:00 strict
    scheduledTime: '2:30 PM – 4:00 PM',
    description: 'One minute of speech without hesitation, repetition, or deviation'
  }
];

export const getActivityById = (id) => ACTIVITIES.find(a => a.id === id) || ACTIVITIES[0];
