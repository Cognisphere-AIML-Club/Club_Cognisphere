import React from 'react';
import { 
  Sparkles, 
  Brain, 
  Cpu, 
  Layers, 
  Globe, 
  Users, 
  Award, 
  BookOpen, 
  Terminal, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Target, 
  Rocket, 
  CalendarDays,
  QrCode,
  Github,
  Linkedin,
  Instagram,
  Mail,
  HeartHandshake,
  LogIn
} from 'lucide-react';

// Direct message deep-links for instant communication
export const DIRECT_MESSAGE_LINKS = {
  instagram: 'https://ig.me/m/cognisphereaiml',
  linkedin: 'https://www.linkedin.com/messaging/',
  mail: 'mailto:cognisphere.club@gmail.com?subject=Contact%20Cognisphere%20Team',
  github: 'https://github.com'
};

export default function ClubHomePage({ onExploreGames, onOpenPass, onSignIn, user }) {
  const domains = [
    {
      title: 'Generative AI & LLMs',
      desc: 'Exploring foundational models, prompt engineering, Retrieval-Augmented Generation (RAG), and agentic autonomous systems.',
      icon: Sparkles,
      color: 'text-amber-400',
      border: 'border-amber-500/20',
      bg: 'bg-amber-500/10'
    },
    {
      title: 'Computer Vision & Robotics',
      desc: 'Real-time object detection, image segmentation, facial recognition, visual SLAM, and spatial perceptual intelligence.',
      icon: EyeIcon,
      color: 'text-cyan-400',
      border: 'border-cyan-500/20',
      bg: 'bg-cyan-500/10'
    },
    {
      title: 'Applied Machine Learning',
      desc: 'Predictive analytics, deep neural networks, time-series forecasting, Kaggle sprints, and production ML pipelines.',
      icon: Brain,
      color: 'text-emerald-400',
      border: 'border-emerald-500/20',
      bg: 'bg-emerald-500/10'
    },
    {
      title: 'NLP & Audio Intelligence',
      desc: 'Transformer architectures, multilingual text understanding, speech-to-text processing, and sentiment analysis engines.',
      icon: Terminal,
      color: 'text-purple-400',
      border: 'border-purple-500/20',
      bg: 'bg-purple-500/10'
    },
    {
      title: 'System Design & Deployments',
      desc: 'Containerization, scalable cloud APIs, edge AI inference on micro-controllers, and production MLOps workflows.',
      icon: Cpu,
      color: 'text-rose-400',
      border: 'border-rose-500/20',
      bg: 'bg-rose-500/10'
    }
  ];

  const milestones = [
    {
      year: '2023',
      title: 'Genesis & Founding',
      description: 'Established under the Department of Artificial Intelligence & Machine Learning to bridge collegiate academics with real-world AI industry engineering.'
    },
    {
      year: '2024',
      title: 'HackSphere & Community Surge',
      description: 'Organized our first 36-hour flagship hackathon hosting 450+ participants across 28 collegiate institutions with 15 deployed AI prototypes.'
    },
    {
      year: '2025',
      title: 'Kaggle Grandmaster Sprint',
      description: 'Conducted comprehensive hands-on bootcamps covering PyTorch deep learning, LLM fine-tuning, and algorithmic optimization.'
    },
    {
      year: '2026',
      title: 'Club Games & Beyond',
      description: 'Pioneered synchronized multi-room campus competition platforms with real-time digital pass verification and live projectorial telemetry.'
    }
  ];

  const leadership = [
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

  return (
    <div className="space-y-12 animate-fadeIn max-w-5xl mx-auto w-full pb-12">
      {/* 1. Hero Showcase Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-white p-1 border border-slate-700 shadow-lg shrink-0">
                <img 
                  src="/Cognisphere-logo.jpeg" 
                  alt="Cognisphere Club Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-black tracking-wider text-white">
                    COGNI<span className="text-cyan-400">SPHERE</span>
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  Department of Artificial Intelligence & Machine Learning
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Innovate &bull; Build &bull; Transcend</span>
            </div>
          </div>

          <div className="space-y-3 max-w-2xl">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Empowering the Next Generation of <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">AI Pioneers</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Cognisphere is the premier student-led technical community dedicated to advancing artificial intelligence, machine learning research, and high-impact engineering. We transform curiosity into production-grade intelligence.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onExploreGames}
              className="py-3 px-5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-all shadow-lg flex items-center gap-2 active:scale-95"
            >
              <CalendarDays className="w-4 h-4" />
              <span>Enter Club Games 2026</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {user ? (
              <button
                onClick={onOpenPass}
                className="py-3 px-5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold rounded-xl text-xs sm:text-sm transition-all flex items-center gap-2 active:scale-95"
              >
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>My Attendance Pass</span>
              </button>
            ) : onSignIn && (
              <button
                onClick={onSignIn}
                className="py-3 px-5 bg-slate-800 hover:bg-slate-700 border border-cyan-500/40 text-cyan-300 font-semibold rounded-xl text-xs sm:text-sm transition-all flex items-center gap-2 active:scale-95 shadow-sm"
              >
                <LogIn className="w-4 h-4 text-cyan-400" />
                <span>Sign Up / Sign In</span>
              </button>
            )}
          </div>

          {/* Stats Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800/80">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 text-center">
              <div className="text-xl sm:text-2xl font-black text-cyan-400">500+</div>
              <div className="text-[11px] text-slate-400 font-medium">Active Members</div>
            </div>
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 text-center">
              <div className="text-xl sm:text-2xl font-black text-emerald-400">5</div>
              <div className="text-[11px] text-slate-400 font-medium">Research Domains</div>
            </div>
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 text-center">
              <div className="text-xl sm:text-2xl font-black text-amber-400">20+</div>
              <div className="text-[11px] text-slate-400 font-medium">Hackathons & Meets</div>
            </div>
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 text-center">
              <div className="text-xl sm:text-2xl font-black text-purple-400">100%</div>
              <div className="text-[11px] text-slate-400 font-medium">Student Driven</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Club History & Mission */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Our Genesis & Legacy
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Founded with the conviction that artificial intelligence should not remain confined to textbook theory, Cognisphere was established as an open crucible for engineers, mathematicians, and developers. Over successive batches, we have nurtured beginners into competitive data scientists and full-stack AI creators.
          </p>
          <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-cyan-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Dedicated to ethical, transparent, and creative AI systems.</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Target className="w-5 h-5" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Vision & Core Mission
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            To cultivate a fertile environment where every student has access to modern compute paradigms, mentorship, and peer review. We organize technical hackathons, open-source sprints, and interactive hands-on game arenas that test skill under real clock pressure.
          </p>
          <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <Zap className="w-4 h-4" />
            <span>Fostering hands-on implementation over passive observation.</span>
          </div>
        </div>
      </section>

      {/* 3. Core AI Domains */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Specialization Verticals
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              The 5 specialized pillars driving technical initiatives in Cognisphere
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Multidisciplinary</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {domains.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 transition-all hover:-translate-y-1 shadow-md"
              >
                <div className={`w-10 h-10 rounded-xl ${item.bg} border ${item.border} ${item.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-white">{item.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Timeline / Historical Milestones */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Club Journey & Milestones
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            How Cognisphere evolved across academic chapters
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {milestones.map((milestone, idx) => (
            <div 
              key={idx} 
              className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2 relative"
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-black font-mono text-cyan-400">
                  {milestone.year}
                </span>
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
              </div>
              <h3 className="text-sm font-bold text-white">
                {milestone.title}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {milestone.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Ongoing Event Spotlight: Club Games 2026 */}
      <section className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/40 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Rocket className="w-3 h-3" />
              <span>Flagship Event</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              Club Games 2026 is Underway!
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Experience 5 concurrent arena challenges running synchronously across campus classrooms. Verify your pass, track round timers, and climb the live podium.
            </p>
          </div>

          <button
            onClick={onExploreGames}
            className="py-3 px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 whitespace-nowrap active:scale-95"
          >
            <span>View All Competitions</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* 6. Leadership & Faculty Advisory */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Leadership & Advisory
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Backed by distinguished academic faculty and visionary student organizers
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {leadership.map((lead, idx) => (
            <div 
              key={idx}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2"
            >
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                {lead.role}
              </div>
              <h3 className="font-bold text-sm text-white">
                {lead.name}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {lead.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Connect & Social Footer */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <HeartHandshake className="w-4 h-4 text-cyan-400" />
          <span>Cognisphere &bull; Built with passion by Department of AIML students</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-slate-400">
          <span className="font-medium text-slate-300">Direct message us:</span>
          <a
            href={DIRECT_MESSAGE_LINKS.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-cyan-400 transition-colors p-1.5 hover:bg-slate-800 rounded-lg"
            title="Direct Message on Instagram"
            aria-label="Direct Message on Instagram"
          >
            <Instagram className="w-4 h-4" />
          </a>
          <a
            href={DIRECT_MESSAGE_LINKS.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-cyan-400 transition-colors p-1.5 hover:bg-slate-800 rounded-lg"
            title="Message on LinkedIn"
            aria-label="Message on LinkedIn"
          >
            <Linkedin className="w-4 h-4" />
          </a>
          <a
            href={DIRECT_MESSAGE_LINKS.mail}
            className="hover:text-cyan-400 transition-colors p-1.5 hover:bg-slate-800 rounded-lg"
            title="Compose Email"
            aria-label="Compose Email"
          >
            <Mail className="w-4 h-4" />
          </a>
          <a
            href={DIRECT_MESSAGE_LINKS.github}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-cyan-400 transition-colors p-1.5 hover:bg-slate-800 rounded-lg"
            title="GitHub"
            aria-label="GitHub"
          >
            <Github className="w-4 h-4" />
          </a>
        </div>
      </section>
    </div>
  );
}

// Simple fallback icon for Vision
function EyeIcon(props) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

