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
  Home,
  Sun,
  Moon
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

  // Admin-only Dark Theme preference (light by default for all users, toggleable exclusively for Admin)
  const [adminTheme, setAdminTheme] = useState(() => {
    try {
      return localStorage.getItem('cognisphere_admin_theme') || 'light';
    } catch (e) {
      return 'light';
    }
  });

  // Apply theme to DOM elements:
  // If user is NOT admin, dark mode is NEVER active (strictly forced to Light Mode).
  // Only if isAdmin is true and adminTheme is 'dark', apply .dark class and attributes.
  const applyThemeToDOM = (theme, adminStatus) => {
    const root = document.documentElement;
    const body = document.body;
    const isDark = adminStatus && theme === 'dark';

    if (isDark) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
      if (body) {
        body.classList.add('dark');
        body.setAttribute('data-theme', 'dark');
      }
    } else {
      root.classList.remove('dark');
      root.removeAttribute('data-theme');
      root.style.colorScheme = 'light';
      if (body) {
        body.classList.remove('dark');
        body.removeAttribute('data-theme');
      }
    }
  };

  useEffect(() => {
    applyThemeToDOM(adminTheme, isAdmin);
  }, [isAdmin, adminTheme]);

  const toggleAdminTheme = () => {
    const next = adminTheme === 'dark' ? 'light' : 'dark';
    setAdminTheme(next);
    try {
      localStorage.setItem('cognisphere_admin_theme', next);
    } catch (e) {}
    applyThemeToDOM(next, isAdmin);
  };

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
    <div className="min-h-screen bg-surface text-on-surface flex flex-col md:flex-row transition-colors duration-200">
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
        adminTheme={adminTheme}
        onToggleAdminTheme={toggleAdminTheme}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Mobile-Only Header */}
        <header className="md:hidden border-b border-surface-container bg-surface-container-lowest sticky top-0 z-40 transition-colors">
          <div className="px-4 h-16 flex items-center justify-between">
            {/* Mobile Logo & Club Name */}
            <div
              onClick={() => {
                setSelectedGame(null);
                setActiveTab('home');
              }}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-white p-0.5 border border-surface-container shadow-xs shrink-0">
                <img
                  src="/Cognisphere-logo.jpeg"
                  alt="Cognisphere Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-wider leading-none">
                  <span className="text-on-surface">COGNI</span>
                  <span className="text-primary">SPHERE</span>
                </span>
                <span className="text-[8px] font-bold text-secondary tracking-widest uppercase mt-0.5 leading-none">
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
                        className="w-7 h-7 rounded-full border border-surface-container object-cover group-hover:border-primary transition-colors"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-xs font-bold text-on-surface group-hover:ring-1 group-hover:ring-primary transition-all">
                        {user.displayName ? user.displayName.charAt(0) : 'U'}
                      </div>
                    )}

                    {/* Role bubble in bottom-right corner for Staff (Admin, Coordinator, Judge; NEVER for participants) */}
                    {(isAdmin || isCoordinator || isJudge) && (
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-black uppercase shadow-xs border border-surface-container-lowest ${
                          isAdmin
                            ? 'bg-primary text-on-primary'
                            : isCoordinator
                            ? 'bg-tertiary text-on-tertiary'
                            : 'bg-secondary text-on-secondary'
                        }`}
                        title={isAdmin ? 'Admin' : isCoordinator ? 'Coordinator' : 'Judge'}
                      >
                        {isAdmin ? 'A' : isCoordinator ? 'C' : 'J'}
                      </span>
                    )}
                  </div>
                  {/* Admin-only Theme Toggle in mobile header */}
                  {isAdmin && (
                    <button
                      onClick={toggleAdminTheme}
                      title={`Switch to ${adminTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
                      className="p-1.5 text-secondary hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors"
                      aria-label="Toggle Admin Theme"
                    >
                      {adminTheme === 'dark' ? (
                        <Moon className="w-4 h-4 text-primary" />
                      ) : (
                        <Sun className="w-4 h-4 text-amber-500" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    title="Sign out"
                    className="p-1.5 text-secondary hover:text-error rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className="py-1.5 px-3 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Sub-navigation Tabs */}
          <div className="border-t border-surface-container bg-surface-container-lowest px-3 py-1.5 overflow-x-auto flex items-center gap-1.5 no-scrollbar">
            <button
              onClick={() => {
                setSelectedGame(null);
                setActiveTab('home');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'home'
                  ? 'bg-surface-container text-primary font-bold border border-surface-container-high'
                  : 'text-secondary hover:text-on-surface'
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
                  ? 'bg-surface-container text-primary font-bold border border-surface-container-high'
                  : 'text-secondary hover:text-on-surface'
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
                    ? 'bg-surface-container text-primary font-bold border border-surface-container-high'
                    : 'text-secondary hover:text-on-surface'
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
                    ? 'bg-surface-container text-primary font-bold border border-surface-container-high'
                    : 'text-secondary hover:text-on-surface'
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
                    ? 'bg-surface-container text-primary font-bold border border-surface-container-high'
                    : 'text-secondary hover:text-on-surface'
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
                    ? 'bg-surface-container text-primary font-bold border border-surface-container-high'
                    : 'text-secondary hover:text-on-surface'
                  }`}
              >
                <ScanLine className="w-3.5 h-3.5" />
                <span>Scanner</span>
              </button>
            )}

            {isStaff && (
              <button
                onClick={() => handleOpenBigScreen('hall')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap bg-tertiary-container text-on-tertiary-container border border-tertiary"
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
            <div className="bg-error-container text-on-error-container border border-error/20 rounded-2xl p-4 text-xs flex items-start gap-3 shadow-xs mb-6">
              <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold">Setup Required: Firebase Credentials Missing</span>
                <p className="text-on-error-container/80">
                  Please configure your Firebase credentials in your <code className="bg-surface-container px-1 py-0.5 rounded text-on-surface">.env</code> file.
                </p>
              </div>
            </div>
          )}

          {/* Authentication or Profile Load Errors */}
          {(authError || profileError) && (
            <div className="bg-error-container text-on-error-container border border-error/20 rounded-2xl p-4 text-xs flex items-start gap-3 shadow-xs mb-6">
              <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{authError || profileError}</div>
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
        <footer className="border-t border-surface-container py-6 text-center text-xs text-secondary space-y-1.5 bg-surface-container-lowest mt-auto">
          <div className="font-semibold text-on-surface tracking-wide">
            Cognisphere &bull; AI & Machine Learning Club
          </div>
          <div className="text-xs text-secondary flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span className="text-secondary">Contact info:</span>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">LinkedIn</a>
            <span className="text-outline-variant">&bull;</span>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">GitHub</a>
            <span className="text-outline-variant">&bull;</span>
            <a href="mailto:cognisphere.club@gmail.com" className="hover:text-primary transition-colors">Mail</a>
            <span className="text-outline-variant">&bull;</span>
            <a href="https://instagram.com/cognisphereaiml" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Instagram</a>
          </div>
        </footer>
      </div>

      {/* PWA Mobile Add to Home Screen Prompt */}
      <InstallAppPrompt />
    </div>
  );
}
