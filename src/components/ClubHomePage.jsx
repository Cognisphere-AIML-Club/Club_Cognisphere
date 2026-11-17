import React, { useState } from 'react';
import QuoteOfTheDayCard from './QuoteOfTheDayCard';
import {
  ArrowRight,
  CalendarDays,
  QrCode,
  Instagram,
  LogIn,
  ClipboardCheck,
  ChevronDown,
  Play,
  ExternalLink,
  Youtube
} from 'lucide-react';

const VIDEO_SHORTS = [
  {
    title: 'Cognisphere Meetup',
    type: 'Post',
    platform: 'instagram',
    link: 'https://ig.me/m/cognisphereaiml',
    gradient: 'from-blue-600/30 to-indigo-950/80',
    tag: 'Campus AI Circle'
  },
  {
    title: 'HackSphere 24h Sprint',
    type: 'Short',
    platform: 'youtube',
    link: 'https://youtube.com',
    gradient: 'from-amber-600/30 to-purple-950/80',
    tag: 'Hackathon Aftermovie'
  },
  {
    title: 'On the Ground: AI Arena',
    type: 'Reel',
    platform: 'instagram',
    link: 'https://ig.me/m/cognisphereaiml',
    gradient: 'from-emerald-600/30 to-slate-950/80',
    tag: 'Game Day Energy'
  },
  {
    title: 'Project Demos & Highlights',
    type: 'Post',
    platform: 'instagram',
    link: 'https://ig.me/m/cognisphereaiml',
    gradient: 'from-fuchsia-600/30 to-slate-950/80',
    tag: 'Student Innovations'
  }
];

const FAQ_ITEMS = [
  {
    question: 'What is Cognisphere?',
    answer: 'Cognisphere is the premier student-led technical community under the Department of Artificial Intelligence & Machine Learning. We empower students to build real-world AI prototypes, participate in events, and master production ML workflows.'
  },
  {
    question: 'Where and when are Cognisphere events held?',
    answer: 'Our events are hosted at the department or within the campus. Dates and session schedules are announced via the Events Hub or through our official announcement channels.'
  },
  {
    question: 'How do I register for events?',
    answer: "Navigate to the 'Pass Registrations' button in the hero section, fill in your USN and student details, and submit. Once verified by campus coordinators, you can access your digital QR pass under 'My Pass'."
  },
  {
    question: 'What are the prerequisites in AI/ML to participate?',
    answer: 'No prerequisites are required for foundational workshops and introductory game rounds! For advanced hackathons and Coding sprints, basic familiarity with Python and core ML concepts is recommended.'
  },
  {
    question: 'How does shortlisting and pass verification work?',
    answer: 'Registrations are reviewed to ensure authentic student participation. Approved participants receive a verified digital pass with an encrypted QR token that coordinators scan for automated room check-in.'
  },
  // {
  //   question: 'I missed the intro session. Can I still participate?',
  //   answer: 'Yes! All session recordings, workshop presentation decks, and starter GitHub repositories are archived and made accessible to registered club members.'
  // },
  {
    question: 'When are the lists and schedules announced?',
    answer: 'Event dates, room allocations, and team slots are published dynamically on the Club Games dashboard and shared through our official announcement channels.'
  },
  {
    question: 'Are spot registrations or wild-card entries available?',
    answer: 'Spot registrations depend on venue capacity and room seating. We strongly advise pre-registering through the digital pass system to guarantee your entry.'
  }
];

const LEADERSHIP = [
  {
    name: 'Faculty Advisory Board',
    role: 'Dept. of AI & Machine Learning',
    desc: 'Guiding academic rigor, research opportunities, lab access, and institutional support.'
  },
  {
    name: 'Student Core Council',
    role: 'Executive & Technical Leads',
    desc: 'Driving technical workshops, hackathon operations, mentorship pipelines, and industry connect.'
  },
  {
    name: 'Domain Coordinators',
    role: 'Specialization Leads',
    desc: 'Mentoring peers across GenAI, Vision, Data Science, and Competitive Coding circles.'
  }
];

export default function ClubHomePage({
  onExploreGames,
  onOpenPass,
  onOpenRegistrations,
  onSignIn,
  user,
  showVideoShowcase = false
}) {
  const [openFaq, setOpenFaq] = useState(null);

  // Controlled via Admin toggle in ProfileEditPage (passConfig)
  const isVideoShowcaseVisible = Boolean(
    showVideoShowcase ||
    (typeof window !== 'undefined' && (() => {
      try {
        const cached = localStorage.getItem('cognisphere_pass_config');
        return cached ? JSON.parse(cached).showVideoShowcase === true : false;
      } catch {
        return false;
      }
    })())
  );

  return (
    <div className="space-y-10 animate-fadeIn max-w-7xl xl:max-w-[1400px] mx-auto w-full pb-12">
      {/* 1. Hero Showcase Section (Background strictly contained here) */}
      {/* 🎛️ TRANSPARENCY CONTROL #1: Card Base Opacity (edit /50 or /40 below) */}
      <section className="relative overflow-hidden bg-surface-container-lowest/50 dark:bg-surface-container-lowest/40 backdrop-blur-sm border border-surface-container/80 rounded-3xl p-6 sm:p-10 shadow-lg group">

        {/* Dynamic Arena Artwork Background Layer */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          {/* 🎛️ TRANSPARENCY CONTROL #2: Light Theme Image Opacity (edit opacity-85 sm:opacity-90) */}
          <img
            src="/cognisphere-hero-bg-light.jpg"
            alt="Cognisphere AI Arena Light"
            className="w-full h-full object-cover object-center dark:hidden opacity-5 sm:opacity-90 transition-transform duration-1000 ease-out group-hover:scale-[1.08]"
          />
          {/* 🎛️ TRANSPARENCY CONTROL #3: Dark Theme Image Opacity (edit opacity-85 sm:opacity-95) */}
          <img
            src="/cognisphere-hero-bg-dark.jpg"
            alt="Cognisphere AI Arena Dark"
            className="w-full h-full object-cover object-center hidden dark:block opacity-85 sm:opacity-95 transition-transform duration-1000 ease-out group-hover:scale-[1.08]"
          />
          {/* 🎛️ TRANSPARENCY CONTROL #4: Vertical Gradient Scrim (edit /60 and /50 to soften/harden contrast) */}
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest/60 via-transparent to-surface-container-lowest/50 dark:from-surface-container-lowest/65 dark:via-transparent dark:to-surface-container-lowest/50" />
          {/* 🎛️ TRANSPARENCY CONTROL #5: Horizontal Lateral Vignette (edit /40) */}
          <div className="absolute inset-0 bg-gradient-to-r from-surface-container-lowest/40 via-transparent to-surface-container-lowest/40" />
        </div>

        <div className="relative z-10 space-y-6 sm:space-y-8 flex flex-col items-center text-center">
          {/* Centered Logo & Name - Prominent emblem filling the hero arena apex */}
          <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4 pt-2 sm:pt-4">
            <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-3xl overflow-hidden border-2 border-slate-700/80 dark:border-white/20 shadow-2xl shadow-blue-950/40 shrink-0 bg-slate-950/95 dark:bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 transition-transform duration-300 hover:scale-105">
              <img
                src="/cognisphere-emblem.png"
                alt="Cognisphere Club Logo"
                className="w-full h-full object-contain drop-shadow-md"
              />
            </div>
            <div>
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-wider text-on-surface uppercase">
                  COGNI<span className="text-primary">SPHERE</span>
                </h1>
              </div>
              <p className="text-xs sm:text-base md:text-lg text-secondary font-semibold tracking-wider mt-1 sm:mt-2">
                Department of Artificial Intelligence &amp; Machine Learning
              </p>
            </div>
          </div>

          {/* Quick Actions (Centered with Single-Row Pass Controls on Mobile) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-xl mx-auto w-full">
            <button
              onClick={onExploreGames}
              className="w-full sm:w-auto py-3 px-5 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 active:scale-95"
            >
              <CalendarDays className="w-4 h-4 text-on-primary" />
              <span>Club Games</span>
              <ArrowRight className="w-4 h-4 text-on-primary" />
            </button>

            {/* Mobile: Single row side-by-side (grid-cols-2); Desktop: Inline flex */}
            <div className="grid grid-cols-2 gap-3 w-full sm:w-auto sm:flex sm:items-center">
              {onOpenRegistrations && (
                <button
                  onClick={onOpenRegistrations}
                  className="w-full sm:w-auto py-3 px-3 sm:px-5 bg-surface-container hover:bg-surface-container-high border border-surface-container-high text-on-surface font-semibold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 active:scale-95 text-center"
                >
                  <ClipboardCheck className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">Pass Registrations</span>
                </button>
              )}

              {user ? (
                <button
                  onClick={onOpenPass}
                  className="w-full sm:w-auto py-3 px-3 sm:px-5 bg-surface-container hover:bg-surface-container-high border border-surface-container-high text-on-surface font-semibold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 active:scale-95 text-center"
                >
                  <QrCode className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">My Pass</span>
                </button>
              ) : onSignIn && (
                <button
                  onClick={onSignIn}
                  className="w-full sm:w-auto py-3 px-3 sm:px-5 bg-surface-container hover:bg-surface-container-high border border-surface-container-high text-primary font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 active:scale-95 text-center"
                >
                  <LogIn className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">Sign In</span>
                </button>
              )}
            </div>
          </div>

          {/* Quote of the Day Section */}
          <div className="pt-6 sm:pt-7 max-w-3xl mx-auto w-full">
            <QuoteOfTheDayCard />
          </div>
        </div>
      </section>

      {/* Video Showcase / IRL Experience Section (Toggled in Profile Edit -> Admin Configuration) */}
      {isVideoShowcaseVisible && (
        <section className="space-y-6">
          <div>
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-secondary mb-1">
              DEPARTMENT OF AIML • FLAGSHIP COMMUNITY
            </p>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-on-surface uppercase">
              THIS IS WHAT COGNISPHERE <span className="text-amber-400 dark:text-yellow-400">LOOKS LIKE IRL.</span>
            </h2>
            <p className="text-xs sm:text-sm text-secondary mt-2 max-w-2xl">
              Here's a glimpse of the energy, connections, hackathons, and experiences waiting for you at Cognisphere.
            </p>
          </div>

          {/* Featured Video Frame */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs sm:text-sm font-semibold text-on-surface">
                  Cognisphere - Flagship Chapter - After Movie
                </span>
              </div>
              <a
                href="https://www.youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-surface-container bg-surface-container-lowest hover:bg-surface-container text-xs font-semibold text-secondary hover:text-on-surface transition-all active:scale-95"
              >
                <span>WATCH ON YOUTUBE</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="relative w-full aspect-video rounded-3xl overflow-hidden border border-surface-container/80 bg-slate-950 shadow-2xl">
              <iframe
                className="w-full h-full"
                src="https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?rel=0"
                title="Cognisphere Chapter Aftermovie"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>

          {/* Vertical Reels & Shorts Grid */}
          <div className="space-y-3 pt-2">
            <p className="text-[11px] font-bold tracking-widest text-pink-500 dark:text-pink-400 uppercase">
              COGNISPHERE ON INSTAGRAM &amp; YOUTUBE
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {VIDEO_SHORTS.map((short, idx) => (
                <a
                  key={idx}
                  href={short.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative rounded-2xl overflow-hidden border border-surface-container bg-surface-container-lowest hover:border-primary/50 transition-all duration-300 shadow-xs flex flex-col aspect-[9/14]"
                >
                  {/* Visual Poster / Thumbnail */}
                  <div className="relative flex-1 bg-gradient-to-b from-slate-800 to-slate-950 overflow-hidden flex items-center justify-center p-4">
                    <div className={`absolute inset-0 bg-gradient-to-br ${short.gradient} transition-transform duration-500 group-hover:scale-105`} />

                    {/* Subtle decorative badge */}
                    <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-md border border-white/10 text-[10px] font-medium text-white/80">
                      {short.tag}
                    </div>

                    {/* Center Play Icon Badge */}
                    <div className="relative z-10 w-11 h-11 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-110 shadow-lg">
                      <Play className="w-4 h-4 ml-0.5 fill-current text-white" />
                    </div>

                    {/* Gradient Scrim */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  </div>

                  {/* Card Info at Bottom */}
                  <div className="p-3 bg-surface-container-lowest border-t border-surface-container flex flex-col justify-between">
                    <h4 className="text-xs sm:text-sm font-bold text-on-surface line-clamp-1 group-hover:text-primary transition-colors">
                      {short.title}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-secondary">
                      {short.platform === 'youtube' ? (
                        <>
                          <Youtube className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span className="truncate">Short · Opens on YouTube ↗</span>
                        </>
                      ) : (
                        <>
                          <Instagram className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                          <span className="truncate">{short.type} · Opens on Instagram ↗</span>
                        </>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Leadership & Faculty Advisory */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
            Leadership &amp; Advisory
          </h2>
          <p className="text-xs sm:text-sm text-secondary">
            Backed by distinguished academic faculty and visionary student organizers
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {LEADERSHIP.map((lead, idx) => (
            <div
              key={idx}
              className="bg-surface-container-lowest border border-surface-container rounded-2xl p-5 space-y-2 shadow-xs"
            >
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
                {lead.role}
              </div>
              <h3 className="font-bold text-sm text-on-surface">
                {lead.name}
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {lead.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-surface-container-lowest border border-surface-container rounded-3xl p-6 sm:p-10 space-y-6 shadow-xs">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
            FAQ
          </p>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-on-surface">
            Questions, answered.
          </h2>
        </div>

        <div className="divide-y divide-surface-container border-t border-b border-surface-container">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="transition-colors">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full py-5 flex items-center justify-between text-left gap-4 group"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm sm:text-base font-semibold text-on-surface group-hover:text-primary transition-colors">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-secondary shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''
                      }`}
                  />
                </button>
                {isOpen && (
                  <div className="pb-5 pr-8 text-xs sm:text-sm text-on-surface-variant leading-relaxed animate-fadeIn">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
