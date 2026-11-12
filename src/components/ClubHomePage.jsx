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
      color: 'text-primary',
      border: 'border-primary/20',
      bg: 'bg-primary-fixed/40'
    },
    {
      title: 'Computer Vision & Robotics',
      desc: 'Real-time object detection, image segmentation, facial recognition, visual SLAM, and spatial perceptual intelligence.',
      icon: EyeIcon,
      color: 'text-tertiary',
      border: 'border-tertiary/20',
      bg: 'bg-tertiary-fixed/40'
    },
    {
      title: 'Applied Machine Learning',
      desc: 'Predictive analytics, deep neural networks, time-series forecasting, Kaggle sprints, and production ML pipelines.',
      icon: Brain,
      color: 'text-primary-container',
      border: 'border-primary-container/20',
      bg: 'bg-surface-container'
    },
    {
      title: 'NLP & Audio Intelligence',
      desc: 'Transformer architectures, multilingual text understanding, speech-to-text processing, and sentiment analysis engines.',
      icon: Terminal,
      color: 'text-secondary',
      border: 'border-secondary/20',
      bg: 'bg-secondary-container/40'
    },
    {
      title: 'System Design & Deployments',
      desc: 'Containerization, scalable cloud APIs, edge AI inference on micro-controllers, and production MLOps workflows.',
      icon: Cpu,
      color: 'text-primary',
      border: 'border-primary/20',
      bg: 'bg-surface-container-high'
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
    <div className="space-y-10 animate-fadeIn max-w-5xl mx-auto w-full pb-12">
      {/* 1. Hero Showcase Section */}
      <section className="bg-surface-container-lowest border border-surface-container rounded-3xl p-6 sm:p-10 shadow-xs">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-surface-container p-1 border border-surface-container-high shadow-xs shrink-0">
                <img 
                  src="/Cognisphere-logo.jpeg" 
                  alt="Cognisphere Club Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-black tracking-wider text-on-surface">
                    COGNI<span className="text-primary">SPHERE</span>
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-secondary font-medium">
                  Department of Artificial Intelligence &amp; Machine Learning
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container text-xs text-primary font-bold">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Innovate • Build • Transcend</span>
            </div>
          </div>

          <div className="space-y-3 max-w-2xl">
            <h1 className="text-2xl sm:text-4xl font-black text-on-surface tracking-tight leading-tight">
              Empowering the Next Generation of <span className="text-primary">AI Pioneers</span>
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed font-normal">
              Cognisphere is the premier student-led technical community dedicated to advancing artificial intelligence, machine learning research, and high-impact engineering. We transform curiosity into production-grade intelligence.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onExploreGames}
              className="py-3 px-5 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs sm:text-sm transition-all shadow-xs flex items-center gap-2 active:scale-95"
            >
              <CalendarDays className="w-4 h-4 text-on-primary" />
              <span>Enter Club Games 2026</span>
              <ArrowRight className="w-4 h-4 text-on-primary" />
            </button>

            {user ? (
              <button
                onClick={onOpenPass}
                className="py-3 px-5 bg-surface-container hover:bg-surface-container-high border border-surface-container-high text-on-surface font-semibold rounded-xl text-xs sm:text-sm transition-all flex items-center gap-2 active:scale-95"
              >
                <QrCode className="w-4 h-4 text-primary" />
                <span>My Attendance Pass</span>
              </button>
            ) : onSignIn && (
              <button
                onClick={onSignIn}
                className="py-3 px-5 bg-surface-container hover:bg-surface-container-high border border-surface-container-high text-primary font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center gap-2 active:scale-95"
              >
                <LogIn className="w-4 h-4 text-primary" />
                <span>Sign Up / Sign In</span>
              </button>
            )}
          </div>

          {/* Stats Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-surface-container">
            <div className="bg-surface-container-low border border-surface-container rounded-2xl p-3 text-center">
              <div className="text-xl sm:text-2xl font-black text-primary">500+</div>
              <div className="text-[11px] text-secondary font-medium">Active Members</div>
            </div>
            <div className="bg-surface-container-low border border-surface-container rounded-2xl p-3 text-center">
              <div className="text-xl sm:text-2xl font-black text-tertiary">5</div>
              <div className="text-[11px] text-secondary font-medium">Research Domains</div>
            </div>
            <div className="bg-surface-container-low border border-surface-container rounded-2xl p-3 text-center">
              <div className="text-xl sm:text-2xl font-black text-primary-container">20+</div>
              <div className="text-[11px] text-secondary font-medium">Hackathons &amp; Meets</div>
            </div>
            <div className="bg-surface-container-low border border-surface-container rounded-2xl p-3 text-center">
              <div className="text-xl sm:text-2xl font-black text-on-surface">100%</div>
              <div className="text-[11px] text-secondary font-medium">Student Driven</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Club History & Mission */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-6 sm:p-7 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-surface-container text-primary flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-on-surface tracking-tight">
            Our Genesis &amp; Legacy
          </h2>
          <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
            Founded with the conviction that artificial intelligence should not remain confined to textbook theory, Cognisphere was established as an open crucible for engineers, mathematicians, and developers. Over successive batches, we have nurtured beginners into competitive data scientists and full-stack AI creators.
          </p>
          <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-primary">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Dedicated to ethical, transparent, and creative AI systems.</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-6 sm:p-7 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-tertiary-container text-on-tertiary flex items-center justify-center">
            <Target className="w-5 h-5" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-on-surface tracking-tight">
            Vision &amp; Core Mission
          </h2>
          <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
            To cultivate a fertile environment where every student has access to modern compute paradigms, mentorship, and peer review. We organize technical hackathons, open-source sprints, and interactive hands-on game arenas that test skill under real clock pressure.
          </p>
          <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-tertiary">
            <Zap className="w-4 h-4 text-tertiary" />
            <span>Fostering hands-on implementation over passive observation.</span>
          </div>
        </div>
      </section>

      {/* 3. Core AI Domains */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
              Specialization Verticals
            </h2>
            <p className="text-xs sm:text-sm text-secondary">
              The 5 specialized pillars driving technical initiatives in Cognisphere
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-[11px] text-secondary font-medium">
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>Multidisciplinary</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {domains.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx}
                className="bg-surface-container-lowest border border-surface-container hover:bg-surface-container-low rounded-2xl p-5 space-y-3 transition-all shadow-xs"
              >
                <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-on-surface">{item.title}</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Timeline / Historical Milestones */}
      <section className="bg-surface-container-lowest border border-surface-container rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
            Club Journey &amp; Milestones
          </h2>
          <p className="text-xs sm:text-sm text-secondary">
            How Cognisphere evolved across academic chapters
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {milestones.map((milestone, idx) => (
            <div 
              key={idx} 
              className="bg-surface-container-low border border-surface-container rounded-2xl p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-black font-mono text-primary">
                  {milestone.year}
                </span>
                <span className="w-2 h-2 rounded-full bg-primary" />
              </div>
              <h3 className="text-sm font-bold text-on-surface">
                {milestone.title}
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {milestone.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Ongoing Event Spotlight: Club Games 2026 */}
      <section className="bg-surface-container-low border border-surface-container-high rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-tertiary-container text-on-tertiary-container">
              <Rocket className="w-3 h-3 text-on-tertiary" />
              <span>Flagship Event</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-on-surface">
              Club Games 2026 is Underway!
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Experience 5 concurrent arena challenges running synchronously across campus classrooms. Verify your pass, track round timers, and climb the live podium.
            </p>
          </div>

          <button
            onClick={onExploreGames}
            className="py-3 px-6 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 whitespace-nowrap active:scale-95"
          >
            <span>View All Competitions</span>
            <ArrowRight className="w-4 h-4 text-on-primary" />
          </button>
        </div>
      </section>

      {/* 6. Leadership & Faculty Advisory */}
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
          {leadership.map((lead, idx) => (
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

      {/* 7. Connect & Social Footer */}
      <section className="bg-surface-container-lowest border border-surface-container rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-secondary shadow-xs">
        <div className="flex items-center gap-2">
          <HeartHandshake className="w-4 h-4 text-primary" />
          <span>Cognisphere • Built with passion by Department of AIML students</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-secondary">
          <span className="font-medium text-on-surface">Direct message us:</span>
          <a
            href={DIRECT_MESSAGE_LINKS.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors p-1.5 hover:bg-surface-container rounded-lg"
            title="Direct Message on Instagram"
            aria-label="Direct Message on Instagram"
          >
            <Instagram className="w-4 h-4" />
          </a>
          <a
            href={DIRECT_MESSAGE_LINKS.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors p-1.5 hover:bg-surface-container rounded-lg"
            title="Message on LinkedIn"
            aria-label="Message on LinkedIn"
          >
            <Linkedin className="w-4 h-4" />
          </a>
          <a
            href={DIRECT_MESSAGE_LINKS.mail}
            className="hover:text-primary transition-colors p-1.5 hover:bg-surface-container rounded-lg"
            title="Compose Email"
            aria-label="Compose Email"
          >
            <Mail className="w-4 h-4" />
          </a>
          <a
            href={DIRECT_MESSAGE_LINKS.github}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors p-1.5 hover:bg-surface-container rounded-lg"
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
