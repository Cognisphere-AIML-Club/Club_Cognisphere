import { GAME_GUIDES } from './gameGuides';

// Activities single source of truth as defined in club-games-pwa-plan.md Section 1
// Order: Tech Quiz placed on top as requested
export const ACTIVITIES = [
  {
    id: 'tech-quiz',
    name: 'Tech Quiz',
    theme: 'Test Your Mind. Beat the Clock.',
    category: 'Technical',
    room: 'Room 103',
    eventDate: '2026-11-25',
    defaultDuration: 60, // 1 min per question/round
    scheduledTime: '10:00 AM – 11:30 AM (90 Mins Total)',
    description: 'Fast-paced technical trivia testing foundational and modern knowledge across Artificial Intelligence, Machine Learning, Computer Science, and emerging technologies.',
    totalDuration: '90 Minutes',
    scheduleTimeline: [
      { time: '0:00 – 0:10', stage: 'Introduction and Rules Briefing', duration: '10 Minutes', durationSeconds: 600 },
      { time: '0:10 – 0:30', stage: 'Round 1 – Rapid Fire Technical Trivia', duration: '20 Minutes', durationSeconds: 1200 },
      { time: '0:30 – 0:55', stage: 'Round 2 – Audio-Visual & Code Debugging', duration: '25 Minutes', durationSeconds: 1500 },
      { time: '0:55 – 1:20', stage: 'Round 3 – Buzzer & Deductive Problem Solving', duration: '25 Minutes', durationSeconds: 1500 },
      { time: '1:20 – 1:30', stage: 'Tie-Breaker, Score Verification & Closing', duration: '10 Minutes', durationSeconds: 600 }
    ],
    guide: GAME_GUIDES['tech-quiz']
  },
  {
    id: 'reverse-prompt',
    name: 'PROMPT DECODE',
    theme: 'Reverse Prompt Engineering – AI Image Recreation Challenge',
    category: 'Technical',
    room: 'Room 101',
    eventDate: '2026-11-24',
    defaultDuration: 900, // 15 mins
    scheduledTime: '10:00 AM – 11:30 AM (90 Mins Total)',
    description: 'Deconstruct generated outputs to deduce original prompts through visual analysis and iterative AI prompt refinement.',
    totalDuration: '90 Minutes',
    scheduleTimeline: [
      { time: '0:00 – 0:10', stage: 'Introduction, rules and platform login check', duration: '10 Minutes', durationSeconds: 600 },
      { time: '0:10 – 0:25', stage: 'Round 1 – Visual Analysis', duration: '15 Minutes', durationSeconds: 900 },
      { time: '0:25 – 0:50', stage: 'Round 2, Stage 1 – Prompt Creation and Submission', duration: '25 Minutes', durationSeconds: 1500 },
      { time: '0:50 – 1:15', stage: 'Round 2, Stage 2 – Image Generation and Refinement', duration: '25 Minutes', durationSeconds: 1500 },
      { time: '1:15 – 1:30', stage: 'Round 2, Stage 3 – Final Submission', duration: '15 Minutes', durationSeconds: 900 }
    ],
    guide: GAME_GUIDES['reverse-prompt']
  },
  {
    id: 'ui-ux-makeover',
    name: 'UI/UX Makeover Challenge',
    theme: 'From Complicated to Convenient',
    category: 'Technical',
    room: 'Room 102',
    eventDate: '2026-11-24',
    defaultDuration: 900, // 15 mins
    scheduledTime: '1:30 PM – 3:00 PM (90 Mins Total)',
    description: 'Identify usability, navigation, and accessibility flaws on real-world website interfaces and craft modern, user-friendly redesigns.',
    totalDuration: '90 Minutes',
    scheduleTimeline: [
      { time: '0:00 – 0:10', stage: 'Introduction and Challenge Briefing', duration: '10 Minutes', durationSeconds: 600 },
      { time: '0:10 – 0:25', stage: 'Round 1 – UX Investigation', duration: '15 Minutes', durationSeconds: 900 },
      { time: '0:25 – 1:00', stage: 'Round 2 – Design Makeover', duration: '35 Minutes', durationSeconds: 2100 },
      { time: '1:00 – 1:20', stage: 'Round 3 – Design Presentation', duration: '20 Minutes', durationSeconds: 1200 },
      { time: '1:20 – 1:30', stage: 'Final Submission and Closing', duration: '10 Minutes', durationSeconds: 600 }
    ],
    guide: GAME_GUIDES['ui-ux-makeover']
  },
  {
    id: 'sell-me-product',
    name: 'Sell Me This Product',
    theme: 'The Art of Persuasion',
    category: 'Non-Technical',
    room: 'Room 201',
    eventDate: '2026-11-25',
    defaultDuration: 180, // 3 mins
    scheduledTime: '12:00 PM – 1:30 PM (90 Mins Total)',
    description: 'Transform an ordinary or unusual mystery product into something desirable by highlighting its value, creating an interesting sales pitch, and persuading customers.',
    totalDuration: '90 Minutes',
    scheduleTimeline: [
      { time: '0:00 – 0:10', stage: 'Introduction and Event Briefing', duration: '10 Minutes', durationSeconds: 600 },
      { time: '0:10 – 0:15', stage: 'Product Allocation and Preparation', duration: '5 Minutes', durationSeconds: 300 },
      { time: '0:15 – 0:55', stage: 'Round 1 – The Sales Pitch', duration: '40 Minutes', durationSeconds: 2400 },
      { time: '0:55 – 1:20', stage: 'Round 2 – The Customer Challenge', duration: '25 Minutes', durationSeconds: 1500 },
      { time: '1:20 – 1:30', stage: 'Final Score Verification and Closing', duration: '10 Minutes', durationSeconds: 600 }
    ],
    guide: GAME_GUIDES['sell-me-product']
  },
  {
    id: 'jam',
    name: 'Just A Minute (JAM)',
    theme: 'Think Fast. Speak Smart.',
    category: 'Non-Technical',
    room: 'Room 202',
    eventDate: '2026-11-25',
    defaultDuration: 60, // 1:00 strict
    scheduledTime: '2:30 PM – 4:00 PM (90 Mins Total)',
    description: 'Impromptu speaking activity testing spontaneity, fluency, and thought organization under strict time pressure without hesitation, repetition, or deviation.',
    totalDuration: '90 Minutes',
    scheduleTimeline: [
      { time: '0:00 – 0:10', stage: 'Introduction and Event Briefing', duration: '10 Minutes', durationSeconds: 600 },
      { time: '0:10 – 0:15', stage: 'Topic Allocation and Preparation', duration: '5 Minutes', durationSeconds: 300 },
      { time: '0:15 – 0:55', stage: 'Round 1 – The One-Minute Challenge', duration: '40 Minutes', durationSeconds: 2400 },
      { time: '0:55 – 1:20', stage: 'Round 2 – The Advanced JAM Challenge', duration: '25 Minutes', durationSeconds: 1500 },
      { time: '1:20 – 1:30', stage: 'Final Score Verification and Closing', duration: '10 Minutes', durationSeconds: 600 }
    ],
    guide: GAME_GUIDES['jam']
  }
];

export const getActivityById = (id) => ACTIVITIES.find(a => a.id === id) || ACTIVITIES[0];
