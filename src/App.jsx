import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useParticipantProfile } from './hooks/useParticipantProfile';
import { useActivities } from './hooks/useActivities';
import RegistrationModal from './components/RegistrationModal';
import ParticipantPass from './components/ParticipantPass';
import CoordinatorScanner from './components/CoordinatorScanner';
import EventLandingPage from './components/EventLandingPage';
import GameDetailPage from './components/GameDetailPage';
import TimersHub from './components/TimersHub';
import BigScreenView from './components/BigScreenView';
import CertificatesView from './components/CertificatesView';
import ClubHomePage from './components/ClubHomePage';
import LogoutConfirmModal from './components/LogoutConfirmModal';
import { SidebarNav } from './components/SidebarNav';
import { InstallAppPrompt } from './components/InstallAppPrompt';
import {
  ShieldCheck,
  LogOut,
  AlertCircle,
  Sparkles,
  Settings,
  QrCode,
  ScanLine,
  CalendarDays,
  LogIn,
  Timer,
  Tv,
  Award,
  Home
} from 'lucide-react';

export default function App() {
  const { user, role, roleData, loading: authLoading, error: authError, isConfigured, signInWithGoogle, logout } = useAuth();
  const { profile, loading: profileLoading, needsProfileCompletion, error: profileError, saveProfile } = useParticipantProfile(user);
  const { activities, updateActivity } = useActivities();

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'events' | 'pass' | 'timers' | 'scan' | 'certificates'
  const [selectedGame, setSelectedGame] = useState(null); // active GameDetailPage
  const [selectedPassGameId, setSelectedPassGameId] = useState(null);

  // Big Screen / Projector Route & Mode State
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const isScreenRoute = typeof window !== 'undefined' && (
    window.location.pathname === '/screen' ||
    searchParams.has('screen') ||
    window.location.hash === '#/screen'
  );
  const urlActivity = searchParams.get('activity');
  const urlRoom = searchParams.get('room');
  const initialMode = searchParams.get('mode') || (urlActivity || urlRoom ? 'room' : 'hall');

  const [showBigScreen, setShowBigScreen] = useState(isScreenRoute);
  const [bigScreenMode, setBigScreenMode] = useState(initialMode);
  const [bigScreenActivityId, setBigScreenActivityId] = useState(urlActivity || null);

  const isAdmin = role === 'admin';
  const isCoordinator = role === 'coordinator';
  const isJudge = role === 'judge';
  const isStaff = isAdmin || isCoordinator;

  const handleOpenBigScreen = (mode = 'hall', activityId = null) => {
    setBigScreenMode(mode);
    setBigScreenActivityId(activityId);
    setShowBigScreen(true);
  };

  const handleExitBigScreen = () => {
    setShowBigScreen(false);
    if (window.location.pathname === '/screen' || window.location.hash === '#/screen') {
      window.history.pushState(null, '', '/');
    }
  };

  const handleOpenPassForGame = (activityId) => {
    setSelectedPassGameId(activityId);
    setSelectedGame(null);
    setActiveTab('pass');
  };

  // If Big Screen / Projector mode is active, render only for staff (Coordinators and Admins)
  // Always renders in crisp, high-contrast projector Light Mode
  if (showBigScreen && isStaff) {
    return (
      <BigScreenView
        activities={activities}
        onExit={handleExitBigScreen}
        initialMode={bigScreenMode}
        initialActivityId={bigScreenActivityId}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row transition-colors duration-200">
      {/* 1. Desktop & Laptop Expandable / Contractable Sidebar with Profile at Bottom-Left */}
      <SidebarNav
        user={user}
        profile={profile}
        role={role}
        isAdmin={isAdmin}
        isCoordinator={isCoordinator}
        isJudge={isJudge}
        isStaff={isStaff}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setSelectedGame(null);
          setActiveTab(tab);
        }}
        onOpenEditProfile={() => setShowEditProfile(true)}
        onLogout={() => setShowLogoutConfirm(true)}
        onSignIn={signInWithGoogle}
        onLaunchBigScreen={(mode, actId) => handleOpenBigScreen(mode, actId)}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Mobile-Only Header */}
        <header className="md:hidden border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 transition-colors">
          <div className="px-4 h-16 flex items-center justify-between">
            {/* Mobile Logo & Club Name */}
            <div
              onClick={() => {
                setSelectedGame(null);
                setActiveTab('home');
              }}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-white p-0.5 border border-slate-700 shadow-xs shrink-0">
                <img
                  src="/Cognisphere-logo.jpeg"
                  alt="Cognisphere Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-wider leading-none">
                  <span className="text-white">COGNI</span>
                  <span className="text-cyan-400">SPHERE</span>
                </span>
                <span className="text-[8px] font-bold text-slate-400 tracking-widest uppercase mt-0.5 leading-none">
                  AI & ML CLUB
                </span>
              </div>
            </div>

            {/* Mobile Right Controls: User Auth */}
            <div className="flex items-center gap-2">
              {user ? (
                <div className="flex items-center gap-2">
                  <div
                    onClick={() => setShowEditProfile(true)}
                    className="relative cursor-pointer group"
                    title="Profile Settings (Click to edit)"
                  >
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="avatar"
                        className="w-7 h-7 rounded-full border border-slate-700 object-cover group-hover:border-cyan-400 transition-colors"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 group-hover:ring-1 group-hover:ring-cyan-400 transition-all">
                        {user.displayName ? user.displayName.charAt(0) : 'U'}
                      </div>
                    )}

                    {/* Role bubble in bottom-right corner for Staff (Admin, Coordinator, Judge; NEVER for participants) */}
                    {(isAdmin || isCoordinator || isJudge) && (
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-black uppercase shadow-xs border border-slate-900 ${
                          isAdmin
                            ? 'bg-amber-500 text-slate-950'
                            : isCoordinator
                            ? 'bg-blue-500 text-white'
                            : 'bg-purple-500 text-white'
                        }`}
                        title={isAdmin ? 'Admin' : isCoordinator ? 'Coordinator' : 'Judge'}
                      >
                        {isAdmin ? 'A' : isCoordinator ? 'C' : 'J'}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    title="Sign out"
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className="py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Sub-navigation Tabs */}
          <div className="border-t border-slate-800/80 bg-slate-900/40 px-3 py-1.5 overflow-x-auto flex items-center gap-1.5 no-scrollbar">
            <button
              onClick={() => {
                setSelectedGame(null);
                setActiveTab('home');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'home'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
                }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Club Home</span>
            </button>

            <button
              onClick={() => {
                setSelectedGame(null);
                setActiveTab('events');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'events'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
                }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Events Hub</span>
            </button>

            {user && (
              <button
                onClick={() => {
                  setSelectedGame(null);
                  setActiveTab('pass');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'pass'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                  }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>My Pass</span>
              </button>
            )}

            {user && (
              <button
                onClick={() => {
                  setSelectedGame(null);
                  setActiveTab('certificates');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'certificates'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                  }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Certificates</span>
              </button>
            )}

            {(isStaff || isJudge) && (
              <button
                onClick={() => {
                  setSelectedGame(null);
                  setActiveTab('timers');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'timers'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                  }`}
              >
                <Timer className="w-3.5 h-3.5" />
                <span>Timers</span>
              </button>
            )}

            {user && isStaff && (
              <button
                onClick={() => {
                  setSelectedGame(null);
                  setActiveTab('scan');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'scan'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                  }`}
              >
                <ScanLine className="w-3.5 h-3.5" />
                <span>Scanner</span>
              </button>
            )}

            {isStaff && (
              <button
                onClick={() => handleOpenBigScreen('hall')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Projector</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {/* Banner if Firebase is not yet configured */}
          {!isConfigured && (
            <div className="bg-amber-950/40 border border-amber-800/80 rounded-2xl p-4 text-xs text-amber-200 flex items-start gap-3 shadow-sm mb-6">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold">Setup Required: Firebase Credentials Missing</span>
                <p className="text-amber-300/80">
                  Please configure your Firebase credentials in your <code className="bg-amber-900/60 px-1 py-0.5 rounded text-amber-200">.env</code> file.
                </p>
              </div>
            </div>
          )}

          {/* Authentication or Profile Load Errors */}
          {(authError || profileError) && (
            <div className="bg-rose-950/40 border border-rose-800/80 rounded-2xl p-4 text-xs text-rose-200 flex items-start gap-3 shadow-sm mb-6">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">{authError || profileError}</div>
            </div>
          )}

          {/* Tab 0: Club Home Page & History */}
          {activeTab === 'home' && (
            <ClubHomePage
              user={user}
              onSignIn={signInWithGoogle}
              onExploreGames={() => {
                setSelectedGame(null);
                setActiveTab('events');
              }}
              onOpenPass={() => {
                setSelectedGame(null);
                setActiveTab('pass');
              }}
            />
          )}

          {/* Tab 1: Event Landing & Info Hub OR Dedicated Game Detail Page */}
          {activeTab === 'events' && (
            selectedGame ? (
              <GameDetailPage
                activity={activities.find(a => a.id === selectedGame.id) || selectedGame}
                isAdmin={isAdmin}
                isStaff={isStaff}
                role={role}
                roleData={roleData}
                user={user}
                profile={profile}
                onBack={() => setSelectedGame(null)}
                onOpenPass={handleOpenPassForGame}
                onUpdateActivity={updateActivity}
                onOpenBigScreen={(actId) => handleOpenBigScreen('room', actId)}
                onSignIn={signInWithGoogle}
              />
            ) : (
              <EventLandingPage
                activities={activities}
                isAdmin={isAdmin}
                user={user}
                profile={profile}
                onViewPass={handleOpenPassForGame}
                onSelectGame={(act) => setSelectedGame(act)}
                onUpdateActivity={updateActivity}
                onSignIn={signInWithGoogle}
              />
            )
          )}

          {/* Tab 2: My Attendance Pass */}
          {activeTab === 'pass' && user && (
            <div className="space-y-6">
              <ParticipantPass
                profile={profile}
                user={user}
                isStaff={isStaff}
                initialActivityId={selectedPassGameId}
                onEditProfile={() => setShowEditProfile(true)}
              />
            </div>
          )}

          {/* Tab 3: Room Timers Hub */}
          {activeTab === 'timers' && (
            <TimersHub
              activities={activities}
              role={role}
              roleData={roleData}
              user={user}
              onOpenBigScreen={(actId) => handleOpenBigScreen('room', actId)}
            />
          )}

          {/* Tab 4: Coordinator Scanner */}
          {activeTab === 'scan' && user && isStaff && (
            <CoordinatorScanner user={user} />
          )}

          {/* Tab 5: Participant Certificates with Admin Release Switch */}
          {activeTab === 'certificates' && user && (
            <CertificatesView
              user={user}
              profile={profile}
              isAdmin={isAdmin}
            />
          )}

          {/* Registration Modal: collects Name, verified USN, and Mobile with red error focus & text */}
          {user && (
            <RegistrationModal
              isOpen={needsProfileCompletion || showEditProfile}
              initialProfile={profile}
              onClose={!needsProfileCompletion ? () => setShowEditProfile(false) : undefined}
              onSubmit={async (details) => {
                await saveProfile(details);
                setShowEditProfile(false);
              }}
            />
          )}

          {/* Logout Confirmation Dialog: prevents accidental immediate sign-out */}
          <LogoutConfirmModal
            isOpen={showLogoutConfirm}
            onCancel={() => setShowLogoutConfirm(false)}
            onConfirm={async () => {
              setShowLogoutConfirm(false);
              await logout();
            }}
          />
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 space-y-1.5 bg-slate-950/50 mt-auto">
          <div className="font-semibold text-slate-300 tracking-wide">
            Cognisphere &bull; AI & Machine Learning Club
          </div>
          <div className="text-xs text-slate-400 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span className="text-slate-500">Contact info:</span>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">LinkedIn</a>
            <span className="text-slate-700">&bull;</span>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">GitHub</a>
            <span className="text-slate-700">&bull;</span>
            <a href="mailto:cognisphere.club@gmail.com" className="hover:text-cyan-400 transition-colors">Mail</a>
            <span className="text-slate-700">&bull;</span>
            <a href="https://instagram.com/cognisphereaiml" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">Instagram</a>
          </div>
        </footer>
      </div>

      {/* PWA Mobile Add to Home Screen Prompt */}
      <InstallAppPrompt />
    </div>
  );
}
