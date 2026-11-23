import { GAME_GUIDES } from './gameGuides';

// Activities single source of truth as defined in club-games-pwa-plan.md Section 1
// Order: Tech Quiz placed on top as requested
export const ACTIVITIES = [
  {
    id: 'tech-quiz',
    name: 'Tech Quiz',
    theme: 'Test Your Mind. Beat the Clock.',
    category: 'Technical',
    room: 'Room A108',
    eventDate: '2026-11-24',
    defaultDuration: 60, // 1 min per question/round
    scheduledTime: '12:00 PM – 1:00 PM',
    description: 'Fast-paced technical trivia testing foundational and modern knowledge across Artificial Intelligence, Machine Learning, Computer Science, and emerging technologies.',
    totalDuration: '60 Minutes',
    scheduleTimeline: [
      { time: '0:00 – 0:10', stage: 'Introduction and Rules Briefing', duration: '10 Minutes', durationSeconds: 600 },
      { time: '0:10 – 0:35', stage: 'Round 1 – Rapid Fire Technical Trivia', duration: '25 Minutes', durationSeconds: 1500 },
      { time: '0:35 – 0:50', stage: 'Round 2 – Buzzer & Deductive Problem Solving', duration: '15 Minutes', durationSeconds: 900 },
      { time: '0:50 – 1:00', stage: 'Score Verification & Closing', duration: '10 Minutes', durationSeconds: 600 }
    ],
    guide: GAME_GUIDES['tech-quiz']
  },
  {
    id: 'reverse-prompt',
    name: 'Reverse Prompt Engineering',
    theme: 'Reverse Prompt Engineering – AI Image Recreation Challenge',
    category: 'Technical',
    room: 'Room A108',
    eventDate: '2026-11-24',
    defaultDuration: 1500, // 25 mins
    scheduledTime: '1:00 PM – 1:30 PM',
    description: 'Deconstruct generated outputs to deduce original prompts through visual analysis and iterative AI prompt refinement.',
    totalDuration: '45 Minutes',
    scheduleTimeline: [
      { time: '0:00 – 0:10', stage: 'Introduction, rules and platform login check', duration: '10 Minutes', durationSeconds: 600 },
      { time: '0:10 – 0:15', stage: 'Round 1 – Visual Analysis', duration: '5 Minutes', durationSeconds: 300 },
      { time: '0:15 – 0:40', stage: 'Round 2 – Prompt Creation and Submission', duration: '25 Minutes', durationSeconds: 1500 },
      { time: '0:40 – 0:45', stage: 'Score Verification & Closing', duration: '5 Minutes', durationSeconds: 300 }
    ],
    guide: GAME_GUIDES['reverse-prompt']
  },
  {
    id: 'ui-ux-makeover',
    name: 'UI/UX Design Challenge',
    theme: 'Reinventing Interfaces with Purpose',
    category: 'Technical',
    room: 'Room A108',
    eventDate: '2026-11-24',
    defaultDuration: 900, // 15 mins
    scheduledTime: '2:15 PM – 3:25 PM',
    description: 'Identify usability, navigation, and accessibility flaws on real-world website interfaces and craft modern, user-friendly redesigns.',
    totalDuration: '70 Minutes',
    scheduleTimeline: [
      { time: '0:00 – 0:10', stage: 'Introduction and Challenge Briefing', duration: '10 Minutes', durationSeconds: 600 },
      { time: '0:10 – 0:20', stage: 'Round 1 – UX Investigation', duration: '10 Minutes', durationSeconds: 600 },
      { time: '0:20 – 0:45', stage: 'Round 2 – UI/UX Design', duration: '25 Minutes', durationSeconds: 1500 },
      { time: '0:45 – 1:00', stage: 'Round 3 – Design Presentation', duration: '15 Minutes', durationSeconds: 900 },
      { time: '1:00 – 1:10', stage: 'Final Submission and Closing', duration: '10 Minutes', durationSeconds: 600 }
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

let currentActivities = [...ACTIVITIES];

export function setCurrentActivities(newActs) {
  if (Array.isArray(newActs) && newActs.length > 0) {
    currentActivities = newActs;
  }
}

export function getCurrentActivities() {
  return currentActivities;
}

export const getActivityById = (id, dynamicActivities = null) => {
  const list = (dynamicActivities && dynamicActivities.length > 0) ? dynamicActivities : currentActivities;
  return list.find(a => a.id === id) || list[0] || ACTIVITIES[0];
};
