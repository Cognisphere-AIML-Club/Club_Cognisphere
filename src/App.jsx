import React, { useState, useEffect, useRef } from 'react';
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
import RegistrationsHub from './components/RegistrationsHub';
import LogoutConfirmModal from './components/LogoutConfirmModal';
import LeaveSiteConfirmModal from './components/LeaveSiteConfirmModal';
import ProfileEditPage from './components/ProfileEditPage';
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
  ClipboardCheck,
  LogIn,
  Timer,
  Tv,
  Award,
  Home,
  Sun,
  Moon,
  UserCheck,
  User
} from 'lucide-react';

export default function App() {
  const { user, role, roleData, loading: authLoading, error: authError, isConfigured, signInWithGoogle, logout } = useAuth();
  const { profile, loading: profileLoading, needsProfileCompletion, error: profileError, saveProfile } = useParticipantProfile(user);
  const { activities, updateActivity } = useActivities();

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Path-Based Clean Routing Helper
  const getTabFromPath = () => {
    if (typeof window === 'undefined') return 'home';
    const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
    const hash = window.location.hash.replace(/^#\/?/, '');
    const search = new URLSearchParams(window.location.search);

    // Exact path matches (e.g. /events, /registrations, /pass)
    if (pathname === '/events' || hash === 'events') return 'events';
    if (pathname === '/registrations' || hash === 'registrations') return 'registrations';
    if (pathname === '/pass' || hash === 'pass') return 'pass';
    if (pathname === '/certificates' || hash === 'certificates') return 'certificates';
    if (pathname === '/timers' || hash === 'timers') return 'timers';
    if (pathname === '/scan' || hash === 'scan') return 'scan';
    if (pathname === '/profile' || hash === 'profile') return 'profile';

    // Query parameter fallback support (?tab=events)
    const tabParam = search.get('tab');
    if (tabParam && ['home', 'events', 'registrations', 'pass', 'certificates', 'timers', 'scan', 'profile'].includes(tabParam)) {
      return tabParam;
    }

    return 'home';
  };

  const getPathForTab = (tab) => {
    if (!tab || tab === 'home') return '/';
    return `/${tab}`;
  };

  // Big Screen / Projector Route & Mode State
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const isScreenRoute = typeof window !== 'undefined' && (
    window.location.pathname === '/screen' ||
    searchParams.has('screen') ||
    window.location.hash === '#/screen'
  );

  const [activeTab, setActiveTab] = useState(getTabFromPath); // 'home' | 'events' | 'registrations' | 'pass' | 'timers' | 'scan' | 'certificates' | 'profile'
  const [selectedGame, setSelectedGame] = useState(null); // active GameDetailPage
  const [selectedPassGameId, setSelectedPassGameId] = useState(null);

  // Helper to safely get window scroll position
  const getWindowScrollY = () => {
    if (typeof window === 'undefined') return 0;
    return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
  };

  // Helper to reliably restore scroll position after layout renders
  const restoreScrollPosition = (targetY) => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({
          top: targetY || 0,
          behavior: 'instant'
        });
      });
    });
  };

  // Create an entry in the navigation stack
  const createStackEntry = ({ tab, game = null, passGameId = null, path = null, scrollY = 0 }) => ({
    id: `nav_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    tab,
    game,
    passGameId,
    path: path || (game ? `/events?game=${game.id}` : getPathForTab(tab)),
    scrollY: scrollY || 0,
    timestamp: Date.now()
  });

  // Navigation Stack: Tracks each page click as an isolated layer with remembered scroll position
  const [navStack, setNavStack] = useState(() => {
    const initialTab = getTabFromPath();
    const initialPath = (typeof window !== 'undefined' && window.location.pathname + window.location.search) || getPathForTab(initialTab);
    return [createStackEntry({ tab: initialTab, path: initialPath, scrollY: 0 })];
  });
  const [stackIndex, setStackIndex] = useState(0);

  const navStackRef = useRef({
    stack: navStack,
    index: stackIndex
  });

  useEffect(() => {
    navStackRef.current = {
      stack: navStack,
      index: stackIndex
    };
  }, [navStack, stackIndex]);

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

  // Admin Mode: toggle between Admin Mode (ON) and default Participant view (OFF)
  const [adminMode, setAdminMode] = useState(() => {
    try {
      return localStorage.getItem('cognisphere_admin_mode') === 'true';
    } catch (e) {
      return false;
    }
  });

  const toggleAdminMode = () => {
    setAdminMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem('cognisphere_admin_mode', String(next));
      } catch (e) {}
      return next;
    });
  };

  // When adminMode is true and user is admin, admin controls are enabled.
  // When adminMode is false (the default), admin sees the participant view!
  const effectiveIsAdmin = isAdmin && adminMode;
  const effectiveIsCoordinator = isCoordinator;
  const effectiveIsJudge = isJudge;
  const effectiveIsStaff = (effectiveIsAdmin || isCoordinator);
  const effectiveRole = isAdmin ? (adminMode ? 'admin' : 'participant') : role;

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
    } catch (e) { }
    applyThemeToDOM(next, isAdmin);
  };

  const handleOpenBigScreen = (mode = 'hall', activityId = null) => {
    setBigScreenMode(mode);
    setBigScreenActivityId(activityId);
    setShowBigScreen(true);
    try {
      window.history.pushState({ cognisphere: true, bigScreen: true }, '', '/screen');
    } catch (e) { }
  };

  const handleExitBigScreen = () => {
    setShowBigScreen(false);
    if (window.location.pathname === '/screen' || window.location.hash === '#/screen') {
      window.history.pushState(null, '', '/');
    }
  };

  // Keep a synchronized ref of active navigation state for popstate & keyboard shortcuts
  const currentNavRef = useRef({
    activeTab,
    selectedGame,
    showBigScreen,
    showEditProfile,
    showLogoutConfirm,
    showLeaveConfirm
  });

  useEffect(() => {
    currentNavRef.current = {
      activeTab,
      selectedGame,
      showBigScreen,
      showEditProfile,
      showLogoutConfirm,
      showLeaveConfirm
    };
  }, [activeTab, selectedGame, showBigScreen, showEditProfile, showLogoutConfirm, showLeaveConfirm]);

  // Push new page onto stack with scroll position remembered from the current page
  const pushNavEntry = ({ tab, game = null, passGameId = null, path = null }) => {
    const fromScrollY = getWindowScrollY();
    const { stack, index } = navStackRef.current;

    // 1. Remember scroll position of the page from which the click was made
    const updatedStack = stack.map((entry, idx) => {
      if (idx === index) {
        return { ...entry, scrollY: fromScrollY };
      }
      return entry;
    });

    // 2. Truncate any forward history ahead of current index (standard stack behavior)
    const nextStack = updatedStack.slice(0, index + 1);

    // 3. Create and push new layer entry
    const newEntry = createStackEntry({ tab, game, passGameId, path, scrollY: 0 });
    nextStack.push(newEntry);
    const newIndex = nextStack.length - 1;

    setNavStack(nextStack);
    setStackIndex(newIndex);
    setActiveTab(tab);
    setSelectedGame(game);
    setSelectedPassGameId(passGameId);

    // 4. Update browser history
    try {
      window.history.pushState({
        cognisphere: true,
        stackIndex: newIndex,
        entryId: newEntry.id,
        tab,
        gameId: game?.id || null,
        passGameId: passGameId || null
      }, '', newEntry.path);
    } catch (e) { }

    // 5. Scroll new page layer to top
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
  };

  const navigateToTab = (tab) => {
    pushNavEntry({ tab, game: null, passGameId: null });
  };

  const navigateToGame = (game) => {
    pushNavEntry({ tab: 'events', game, passGameId: null, path: `/events?game=${game?.id}` });
  };

  const handleOpenPassForGame = (activityId) => {
    pushNavEntry({ tab: 'pass', game: null, passGameId: activityId, path: '/pass' });
  };

  // Back Navigation: Moves back along the layer stack, restoring the remembered scroll position
  const triggerBackAction = () => {
    const current = currentNavRef.current;

    // 1. Dismiss Leave Confirmation Modal if open
    if (current.showLeaveConfirm) {
      setShowLeaveConfirm(false);
      return;
    }

    // 2. Dismiss Logout Confirmation Modal if open
    if (current.showLogoutConfirm) {
      setShowLogoutConfirm(false);
      return;
    }

    // 3. Dismiss Edit Profile Modal if open
    if (current.showEditProfile) {
      setShowEditProfile(false);
      return;
    }

    // 4. Exit Big Screen Projector mode if active
    if (current.showBigScreen) {
      handleExitBigScreen();
      return;
    }

    // 5. Backward Navigation along the stack
    const { stack, index } = navStackRef.current;
    if (index > 0) {
      if (typeof window !== 'undefined' && window.history && window.history.length > 1) {
        window.history.back();
        return;
      }

      // Fallback
      const currentScroll = getWindowScrollY();
      const targetIndex = index - 1;
      const targetEntry = stack[targetIndex];

      const updatedStack = stack.map((entry, idx) => {
        if (idx === index) {
          return { ...entry, scrollY: currentScroll };
        }
        return entry;
      });

      setNavStack(updatedStack);
      setStackIndex(targetIndex);
      setActiveTab(targetEntry.tab);
      setSelectedGame(targetEntry.game);
      setSelectedPassGameId(targetEntry.passGameId);

      restoreScrollPosition(targetEntry.scrollY);
      return;
    }

    // 6. At root of the navigation stack: Prompt leave confirmation dialog
    setShowLeaveConfirm(true);
  };

  // Forward Navigation: Moves forward along the layer stack, restoring the forward page and position
  const triggerForwardAction = () => {
    const { stack, index } = navStackRef.current;

    // If user changes mind and decides to move forward
    if (index < stack.length - 1) {
      if (typeof window !== 'undefined' && window.history) {
        window.history.forward();
        return;
      }

      const currentScroll = getWindowScrollY();
      const targetIndex = index + 1;
      const targetEntry = stack[targetIndex];

      const updatedStack = stack.map((entry, idx) => {
        if (idx === index) {
          return { ...entry, scrollY: currentScroll };
        }
        return entry;
      });

      setNavStack(updatedStack);
      setStackIndex(targetIndex);
      setActiveTab(targetEntry.tab);
      setSelectedGame(targetEntry.game);
      setSelectedPassGameId(targetEntry.passGameId);

      restoreScrollPosition(targetEntry.scrollY);
    }
  };

  const handleConfirmLeaveSite = () => {
    setShowLeaveConfirm(false);
    if (window.history.length > 2) {
      window.history.go(-2);
    } else {
      window.history.back();
    }
  };

  // Global Navigation Listener for Mobile Back & Desktop (Cmd+[ / Ctrl+[ / Cmd+] / Ctrl+])
  useEffect(() => {
    const handlePopState = (e) => {
      const { stack, index } = navStackRef.current;
      const targetIndex = e?.state?.stackIndex;

      // Close open modals when navigating back/forward
      setShowLeaveConfirm(false);
      setShowLogoutConfirm(false);
      setShowEditProfile(false);

      // When browser back / forward or Opera/Safari gestures fire popstate with a known stack index
      if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex < stack.length) {
        const currentScroll = getWindowScrollY();
        const targetEntry = stack[targetIndex];

        const updatedStack = stack.map((entry, idx) => {
          if (idx === index) return { ...entry, scrollY: currentScroll };
          return entry;
        });

        setNavStack(updatedStack);
        setStackIndex(targetIndex);
        setActiveTab(targetEntry.tab);
        setSelectedGame(targetEntry.game);
        setSelectedPassGameId(targetEntry.passGameId);

        // Restore remembered position
        restoreScrollPosition(targetEntry.scrollY);
        return;
      }

      // Check current browser pathname directly
      const currentTab = getTabFromPath();
      const current = currentNavRef.current;

      // If at root with no modals and no subview, trap and prompt leave confirmation
      if (
        index === 0 &&
        !current.showLeaveConfirm &&
        !current.showLogoutConfirm &&
        !current.showEditProfile &&
        !current.showBigScreen &&
        !current.selectedGame &&
        current.activeTab === 'home'
      ) {
        try {
          window.history.pushState({ cognisphere: true, root: true, stackIndex: 0 }, '', '/');
        } catch (err) { }
        setShowLeaveConfirm(true);
        return;
      }

      if (index > 0) {
        const targetIdx = index - 1;
        const targetEntry = stack[targetIdx];
        setStackIndex(targetIdx);
        setActiveTab(targetEntry.tab);
        setSelectedGame(targetEntry.game);
        setSelectedPassGameId(targetEntry.passGameId);
        restoreScrollPosition(targetEntry.scrollY);
      }
    };

    const handleKeyDown = (e) => {
      // Check for Back: Cmd+[ (Mac), Ctrl+[ (Windows), Alt+Left
      const isBack =
        ((e.metaKey || e.ctrlKey) && (e.key === '[' || e.code === 'BracketLeft')) ||
        (e.altKey && e.key === 'ArrowLeft');

      // Check for Forward: Cmd+] (Mac), Ctrl+] (Windows), Alt+Right
      const isForward =
        ((e.metaKey || e.ctrlKey) && (e.key === ']' || e.code === 'BracketRight')) ||
        (e.altKey && e.key === 'ArrowRight');

      if (isBack) {
        e.preventDefault();
        triggerBackAction();
      } else if (isForward) {
        e.preventDefault();
        triggerForwardAction();
      } else if (e.key === 'Escape') {
        const current = currentNavRef.current;
        if (current.showLeaveConfirm) {
          setShowLeaveConfirm(false);
        } else if (current.showLogoutConfirm) {
          setShowLogoutConfirm(false);
        } else if (current.showEditProfile) {
          setShowEditProfile(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);

    // Seed root history entry with explicit stackIndex: 0
    try {
      const initialEntry = navStackRef.current.stack[0];
      if (!window.history.state || typeof window.history.state.stackIndex !== 'number') {
        window.history.replaceState({
          cognisphere: true,
          root: true,
          stackIndex: 0,
          entryId: initialEntry?.id,
          tab: initialEntry?.tab || 'home',
          gameId: initialEntry?.game?.id || null,
          passGameId: initialEntry?.passGameId || null
        }, '', initialEntry?.path || (window.location.pathname + window.location.search));
      }
    } catch (err) { }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

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
        role={effectiveRole}
        isAdmin={effectiveIsAdmin}
        isAdminUser={isAdmin}
        adminMode={adminMode}
        onToggleAdminMode={toggleAdminMode}
        isCoordinator={effectiveIsCoordinator}
        isJudge={effectiveIsJudge}
        isStaff={effectiveIsStaff}
        activeTab={activeTab}
        onSelectTab={navigateToTab}
        onOpenEditProfile={() => navigateToTab('profile')}
        onLogout={() => setShowLogoutConfirm(true)}
        onSignIn={signInWithGoogle}
        onLaunchBigScreen={(mode, actId) => handleOpenBigScreen(mode, actId)}
        adminTheme={adminTheme}
        onToggleAdminTheme={toggleAdminTheme}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Admin Mode Active Floating Banner */}
        {isAdmin && adminMode && (
          <div className="bg-primary text-on-primary px-4 py-2 text-xs font-bold flex items-center justify-between shadow-xs sticky top-0 z-50 animate-fadeIn">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-on-primary shrink-0" />
              <span>Admin Mode is ON: Administrative controls and editing are active</span>
            </div>
            <button
              onClick={toggleAdminMode}
              className="bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all active:scale-95"
            >
              Switch to Participant View
            </button>
          </div>
        )}

        {/* Mobile-Only Header */}
        <header className="md:hidden border-b border-surface-container bg-surface-container-lowest sticky top-0 z-40 transition-colors">
          <div className="px-4 h-16 flex items-center justify-between">
            {/* Mobile Logo & History Stack Navigation */}
            <div className="flex items-center gap-2">
              <div
                onClick={() => navigateToTab('home')}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-surface-container shadow-xs shrink-0">
                  <img
                    src="/Cognisphere-logo.jpeg"
                    alt="Cognisphere Logo"
                    className="w-full h-full object-cover"
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
            </div>

            {/* Mobile Right Controls: User Auth & Admin Switch */}
            <div className="flex items-center gap-2">
              {user ? (
                <div className="flex items-center gap-2">
                  <div
                    onClick={() => navigateToTab('profile')}
                    className="relative cursor-pointer group"
                    title="Profile Settings"
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

                    {/* Role bubble in bottom-right corner for Staff */}
                    {(effectiveIsAdmin || effectiveIsCoordinator || effectiveIsJudge) && (
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-black uppercase shadow-xs border border-surface-container-lowest ${effectiveIsAdmin
                            ? 'bg-primary text-on-primary'
                            : effectiveIsCoordinator
                              ? 'bg-tertiary text-on-tertiary'
                              : 'bg-secondary text-on-secondary'
                          }`}
                        title={effectiveIsAdmin ? 'Admin' : effectiveIsCoordinator ? 'Coordinator' : 'Judge'}
                      >
                        {effectiveIsAdmin ? 'A' : effectiveIsCoordinator ? 'C' : 'J'}
                      </span>
                    )}
                  </div>

                  {/* Admin Mode Toggle in mobile header */}
                  {isAdmin && (
                    <button
                      onClick={toggleAdminMode}
                      title={`Admin Mode: ${adminMode ? 'ON' : 'OFF (Participant View)'}`}
                      className={`p-1.5 rounded-lg border transition-colors flex items-center gap-1.5 text-[10px] font-bold ${
                        adminMode 
                          ? 'bg-primary text-on-primary border-primary shadow-xs' 
                          : 'text-secondary hover:text-on-surface bg-surface-container border-surface-container-high'
                      }`}
                      aria-label="Admin Mode"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Admin Mode</span>
                    </button>
                  )}

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

          {/* Mobile Sub-navigation Tabs (Projector Page Removed from Mobile View) */}
          <div className="border-t border-surface-container bg-surface-container-lowest px-3 py-1.5 overflow-x-auto flex items-center gap-1.5 no-scrollbar">
            <button
              onClick={() => navigateToTab('home')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'home'
                ? 'bg-surface-container text-primary font-bold border border-surface-container-high'
                : 'text-secondary hover:text-on-surface'
                }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>

            <button
              onClick={() => navigateToTab('events')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'events'
                ? 'bg-surface-container text-primary font-bold border border-surface-container-high'
                : 'text-secondary hover:text-on-surface'
                }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Events Hub</span>
            </button>

            <button
              onClick={() => navigateToTab('registrations')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'registrations'
                ? 'bg-surface-container text-primary font-bold border border-surface-container-high'
                : 'text-secondary hover:text-on-surface'
                }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>{effectiveIsStaff ? 'Registrations & Approvals' : 'Registrations'}</span>
            </button>

            {user && (
              <button
                onClick={() => navigateToTab('pass')}
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
                onClick={() => navigateToTab('certificates')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'certificates'
                  ? 'bg-surface-container text-primary font-bold border border-surface-container-high'
                  : 'text-secondary hover:text-on-surface'
                  }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Certificates</span>
              </button>
            )}

            {user && (
              <button
                onClick={() => navigateToTab('profile')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'profile'
                  ? 'bg-surface-container text-primary font-bold border border-surface-container-high'
                  : 'text-secondary hover:text-on-surface'
                  }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Profile</span>
              </button>
            )}

            {(effectiveIsStaff || effectiveIsJudge) && (
              <button
                onClick={() => navigateToTab('timers')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'timers'
                  ? 'bg-surface-container text-primary font-bold border border-surface-container-high'
                  : 'text-secondary hover:text-on-surface'
                  }`}
              >
                <Timer className="w-3.5 h-3.5" />
                <span>Timers</span>
              </button>
            )}

            {user && effectiveIsStaff && (
              <button
                onClick={() => navigateToTab('scan')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'scan'
                  ? 'bg-surface-container text-primary font-bold border border-surface-container-high'
                  : 'text-secondary hover:text-on-surface'
                  }`}
              >
                <ScanLine className="w-3.5 h-3.5" />
                <span>Scanner</span>
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

          {/* Hardware-Accelerated Navigation Stage & Page Layers (Safari Compositor Stack) */}
          <div className="nav-layer-stage">
            <div className="nav-page-layer" key={`layer_${stackIndex}_${activeTab}_${selectedGame?.id || 'main'}`}>
              {/* Tab 0: Club Home Page & History */}
              {activeTab === 'home' && (
                <ClubHomePage
                  user={user}
                  onSignIn={signInWithGoogle}
                  onExploreGames={() => navigateToTab('events')}
                  onOpenPass={() => navigateToTab('pass')}
                  onOpenRegistrations={() => navigateToTab('registrations')}
                />
              )}

              {/* Tab 1: Event Landing & Info Hub OR Dedicated Game Detail Page */}
              {activeTab === 'events' && (
                selectedGame ? (
                  <GameDetailPage
                    activity={activities.find(a => a.id === selectedGame.id) || selectedGame}
                    isAdmin={effectiveIsAdmin}
                    isStaff={effectiveIsStaff}
                    role={effectiveRole}
                    roleData={roleData}
                    user={user}
                    profile={profile}
                    onBack={triggerBackAction}
                    onOpenPass={handleOpenPassForGame}
                    onUpdateActivity={updateActivity}
                    onOpenBigScreen={(actId) => handleOpenBigScreen('room', actId)}
                    onSignIn={signInWithGoogle}
                  />
                ) : (
                  <EventLandingPage
                    activities={activities}
                    isAdmin={effectiveIsAdmin}
                    user={user}
                    profile={profile}
                    onViewPass={handleOpenPassForGame}
                    onSelectGame={navigateToGame}
                    onUpdateActivity={updateActivity}
                    onSignIn={signInWithGoogle}
                  />
                )
              )}

              {/* Tab: Dedicated Event Registrations & Approvals Portal */}
              {activeTab === 'registrations' && (
                <RegistrationsHub
                  user={user}
                  profile={profile}
                  isAdmin={effectiveIsAdmin}
                  isCoordinator={effectiveIsCoordinator}
                  isStaff={effectiveIsStaff}
                  onViewPass={handleOpenPassForGame}
                  onSignIn={signInWithGoogle}
                />
              )}

              {/* Tab 2: My Attendance Pass */}
              {activeTab === 'pass' && user && (
                <div className="space-y-6">
                  <ParticipantPass
                    profile={profile}
                    user={user}
                    isStaff={effectiveIsStaff}
                    isAdmin={effectiveIsAdmin}
                    activities={activities}
                    initialActivityId={selectedPassGameId}
                    onEditProfile={() => navigateToTab('profile')}
                    onGoToEvents={() => navigateToTab('events')}
                  />
                </div>
              )}

              {/* Tab 3: Room Timers Hub (Only accessible to Coordinators, Judges & Admins) */}
              {activeTab === 'timers' && (effectiveIsStaff || effectiveIsJudge) && (
                <TimersHub
                  activities={activities}
                  role={effectiveRole}
                  roleData={roleData}
                  user={user}
                  onOpenBigScreen={(actId) => handleOpenBigScreen('room', actId)}
                />
              )}

              {/* Tab 4: Coordinator Scanner */}
              {activeTab === 'scan' && user && effectiveIsStaff && (
                <CoordinatorScanner user={user} />
              )}

              {/* Tab 5: Participant Certificates with Admin Release Switch */}
              {activeTab === 'certificates' && user && (
                <CertificatesView
                  user={user}
                  profile={profile}
                  isAdmin={effectiveIsAdmin}
                />
              )}

              {/* Tab 6: Dedicated Profile Editing Page */}
              {activeTab === 'profile' && user && (
                <ProfileEditPage
                  user={user}
                  profile={profile}
                  role={effectiveRole}
                  onBack={() => navigateToTab('home')}
                  onSave={async (details) => {
                    await saveProfile(details);
                  }}
                />
              )}

              {activeTab === 'profile' && !user && (
                <div className="max-w-md mx-auto p-8 rounded-3xl border border-surface-container bg-surface-container-lowest text-center space-y-4 my-10 shadow-xs">
                  <User className="w-12 h-12 text-primary mx-auto" />
                  <h2 className="text-xl font-bold text-on-surface">Sign In Required</h2>
                  <p className="text-xs text-secondary">Please sign in with your Google account to view and edit your profile.</p>
                  <button
                    onClick={signInWithGoogle}
                    className="py-2.5 px-5 bg-primary text-on-primary font-bold rounded-2xl text-xs inline-flex items-center gap-2 shadow-xs"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Sign In with Google</span>
                  </button>
                </div>
              )}
            </div>
          </div>

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

          {/* Leave Site Confirmation Dialog: intercepts back navigation at root */}
          <LeaveSiteConfirmModal
            isOpen={showLeaveConfirm}
            onStay={() => setShowLeaveConfirm(false)}
            onConfirmLeave={handleConfirmLeaveSite}
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
