import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import LeaderboardPage from './components/LeaderboardPage';
import { SidebarNav } from './components/SidebarNav';
import MobileDrawerNav from './components/MobileDrawerNav';
import { InstallAppPrompt } from './components/InstallAppPrompt';
import { subscribeToPassConfig } from './services/passApprovalService';
import { subscribeToCoordinatorConfig, getCachedCoordinatorConfig } from './services/coordinatorConfigService';
import { MenuIcon } from './components/AnimatedIcons';
import { ThemeToggleButton } from './components/ThemeToggleButton';
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
  User,
  Trophy,
  Menu,
  X
} from 'lucide-react';

export default function App() {
  const { user, role, roleData, loading: authLoading, error: authError, isConfigured, signInWithGoogle, logout } = useAuth();
  const { profile, loading: profileLoading, needsProfileCompletion, error: profileError, saveProfile } = useParticipantProfile(user);
  const { activities, updateActivity } = useActivities();

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);
  const [pendingProfileExitTab, setPendingProfileExitTab] = useState(null);

  // Path-Based Clean Routing Helper
  const getTabFromPath = () => {
    if (typeof window === 'undefined') return 'home';
    const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
    const hash = window.location.hash.replace(/^#\/?/, '');
    const search = new URLSearchParams(window.location.search);

    // Exact path matches (e.g. /events, /leaderboard, /registrations, /pass)
    if (pathname === '/events' || hash === 'events') return 'events';
    if (pathname === '/leaderboard' || hash === 'leaderboard') return 'leaderboard';
    if (pathname === '/registrations' || hash === 'registrations') return 'registrations';
    if (pathname === '/pass' || hash === 'pass') return 'pass';
    if (pathname === '/certificates' || hash === 'certificates') return 'certificates';
    if (pathname === '/timers' || hash === 'timers') return 'timers';
    if (pathname === '/scan' || hash === 'scan') return 'scan';
    if (pathname === '/profile' || hash === 'profile') return 'profile';

    // Query parameter fallback support (?tab=events)
    const tabParam = search.get('tab');
    if (tabParam && ['home', 'events', 'leaderboard', 'registrations', 'pass', 'certificates', 'timers', 'scan', 'profile'].includes(tabParam)) {
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

  const [activeTab, setActiveTab] = useState(getTabFromPath); // 'home' | 'events' | 'leaderboard' | 'registrations' | 'pass' | 'timers' | 'scan' | 'certificates' | 'profile'
  const [selectedGame, setSelectedGame] = useState(null); // active GameDetailPage
  const [selectedPassGameId, setSelectedPassGameId] = useState(null);
  const [selectedLeaderboardGameId, setSelectedLeaderboardGameId] = useState(() => searchParams.get('game') || null);

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
  const createStackEntry = ({ tab, game = null, passGameId = null, leaderboardGameId = null, path = null, scrollY = 0 }) => ({
    id: `nav_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    tab,
    game,
    passGameId,
    leaderboardGameId,
    path: path || (game ? `/events?game=${game.id}` : (tab === 'leaderboard' && leaderboardGameId ? `/leaderboard?game=${leaderboardGameId}` : getPathForTab(tab))),
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

  // Coordinator Configuration & Permissions State (Admin controlled)
  const [coordinatorConfig, setCoordinatorConfig] = useState(getCachedCoordinatorConfig);
  useEffect(() => {
    const unsub = subscribeToCoordinatorConfig((cfg) => {
      if (cfg) setCoordinatorConfig(cfg);
    });
    return () => unsub();
  }, []);

  const isAdmin = role === 'admin' || roleData?.role === 'admin' || roleData?.isAdmin === true;

  // Coordinator identification dynamically pulled from Firestore role document
  const isCoordinatorUser = 
    role === 'coordinator' || 
    roleData?.role === 'coordinator' || 
    roleData?.baseRole === 'coordinator' || 
    roleData?.coordinatorState !== undefined;

  // Admin controls coordinator state: 'coordinator' vs 'participant'
  // When set to 'participant', coordinators can participate in other games without staff controls.
  // We resolve the active state dynamically from config activeStates and Firestore roleData.
  const coordinatorActiveState = useMemo(() => {
    if (!isCoordinatorUser) return 'participant';

    const states = coordinatorConfig?.activeStates || {};
    const normEmail = user?.email ? user.email.trim().toLowerCase() : '';
    const normUsn = profile?.usn ? profile.usn.trim().toUpperCase() : '';

    if (normEmail && states[normEmail] !== undefined) return states[normEmail];
    if (normUsn && states[normUsn] !== undefined) return states[normUsn];

    if (roleData?.coordinatorState) return roleData.coordinatorState;
    if (role === 'coordinator') return 'coordinator';

    return 'coordinator';
  }, [isCoordinatorUser, coordinatorConfig, user?.email, profile?.usn, roleData, role]);

  const isCoordinatorActive = isCoordinatorUser && coordinatorActiveState === 'coordinator';

  const isJudge = role === 'judge';

  // Admin Mode: toggle between Admin Mode (ON) and default Participant view (OFF)
  const [adminMode, setAdminMode] = useState(() => {
    try {
      return localStorage.getItem('cognisphere_admin_mode') === 'true';
    } catch (e) {
      return false;
    }
  });

  // When adminMode is true and user is admin, admin controls are enabled.
  // When adminMode is false (the default), admin sees the participant view!
  const effectiveIsAdmin = isAdmin && adminMode;
  const effectiveIsCoordinator = !effectiveIsAdmin && isCoordinatorActive;
  const effectiveIsJudge = isJudge;
  const effectiveIsStaff = effectiveIsAdmin || effectiveIsCoordinator;
  const effectiveRole = isAdmin 
    ? (adminMode ? 'admin' : 'participant') 
    : (effectiveIsCoordinator ? 'coordinator' : 'participant');

  // Default operations for coordinators: scanner, timerHub, and bigScreen are always available when active
  const coordinatorPermissions = coordinatorConfig.permissions || {};
  const canCoordinatorScan = effectiveIsCoordinator;
  const canCoordinatorTimers = effectiveIsCoordinator;
  const canCoordinatorBigScreen = effectiveIsCoordinator;
  const canCoordinatorDesk = effectiveIsCoordinator && Boolean(coordinatorPermissions.registrationDesk ?? true);
  const canCoordinatorLeaderboard = effectiveIsCoordinator && Boolean(coordinatorPermissions.leaderboardEntries ?? true);

  // Resolve assigned activity ID for the logged-in coordinator from database roleData
  const coordinatorAssignedActivityId = useMemo(() => {
    if (!roleData) return null;
    if (roleData.activityId) return roleData.activityId;
    if (roleData.assignedEvent) {
      const match = activities.find(
        a => a.id === roleData.assignedEvent || 
             a.name.toLowerCase() === roleData.assignedEvent.toLowerCase()
      );
      if (match) return match.id;
    }
    if (roleData.assignedRoom) {
      const match = activities.find(
        a => a.room.toLowerCase() === roleData.assignedRoom.toLowerCase()
      );
      if (match) return match.id;
    }
    return null;
  }, [roleData, activities]);

  // Theme preference:
  // If in admin mode and was previously dark, start as dark; otherwise light by default
  const [theme, setTheme] = useState(() => {
    try {
      const savedAdminMode = localStorage.getItem('cognisphere_admin_mode') === 'true';
      if (savedAdminMode) {
        const wasDark = localStorage.getItem('cognisphere_admin_was_dark') === 'true' ||
          localStorage.getItem('cognisphere_admin_theme') === 'dark' ||
          localStorage.getItem('cognisphere_theme') === 'dark';
        return wasDark ? 'dark' : 'light';
      }
      return localStorage.getItem('cognisphere_theme') || 'light';
    } catch (e) {
      return 'light';
    }
  });

  // Apply theme to DOM elements:
  const applyThemeToDOM = (currentTheme) => {
    const root = document.documentElement;
    const body = document.body;
    const isDark = currentTheme === 'dark';

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
    applyThemeToDOM(theme);
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('cognisphere_theme', next);
      localStorage.setItem('cognisphere_admin_theme', next);
      if (adminMode) {
        localStorage.setItem('cognisphere_admin_was_dark', String(next === 'dark'));
      }
    } catch (e) { }
    applyThemeToDOM(next);
  };

  const toggleAdminMode = () => {
    setAdminMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem('cognisphere_admin_mode', String(next));
      } catch (e) { }

      if (!next) {
        // Switching to Participant mode:
        // Remember if admin theme was dark, and switch to light mode
        const wasDark = theme === 'dark';
        try {
          localStorage.setItem('cognisphere_admin_was_dark', String(wasDark));
          localStorage.setItem('cognisphere_theme', 'light');
        } catch (e) { }
        setTheme('light');
        applyThemeToDOM('light');
      } else {
        // Switching back to Admin mode:
        // Check if theme was dark in admin mode, and restore if so
        let wasDark = false;
        try {
          wasDark = localStorage.getItem('cognisphere_admin_was_dark') === 'true' ||
            localStorage.getItem('cognisphere_admin_theme') === 'dark';
        } catch (e) { }
        if (wasDark) {
          try {
            localStorage.setItem('cognisphere_theme', 'dark');
          } catch (e) { }
          setTheme('dark');
          applyThemeToDOM('dark');
        }
      }

      return next;
    });
  };

  // Competition Leaderboard Visibility State (Admin controlled via passConfig)
  const [showLeaderboard, setShowLeaderboard] = useState(() => {
    try {
      const cached = localStorage.getItem('cognisphere_pass_config');
      return cached ? JSON.parse(cached).showLeaderboard ?? true : true;
    } catch {
      return true;
    }
  });

  // Home Page Video Showcase Visibility State (Admin controlled via passConfig)
  const [showVideoShowcase, setShowVideoShowcase] = useState(() => {
    try {
      const cached = localStorage.getItem('cognisphere_pass_config');
      return cached ? JSON.parse(cached).showVideoShowcase ?? false : false;
    } catch {
      return false;
    }
  });

  // Navigation Theme Switcher Visibility State (Admin controlled via passConfig)
  const [enableThemeToggle, setEnableThemeToggle] = useState(() => {
    try {
      const cached = localStorage.getItem('cognisphere_pass_config');
      return cached ? JSON.parse(cached).enableThemeToggle ?? true : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const unsub = subscribeToPassConfig((cfg) => {
      if (cfg && typeof cfg.showLeaderboard === 'boolean') {
        setShowLeaderboard(cfg.showLeaderboard);
      }
      if (cfg && typeof cfg.showVideoShowcase === 'boolean') {
        setShowVideoShowcase(cfg.showVideoShowcase);
      }
      if (cfg && typeof cfg.enableThemeToggle === 'boolean') {
        setEnableThemeToggle(cfg.enableThemeToggle);
      }
    });
    return () => unsub();
  }, []);

  const handleOpenBigScreen = (mode = 'hall', activityId = null) => {
    const isRestrictedCoordinator = !effectiveIsAdmin && Boolean(coordinatorAssignedActivityId);
    const targetMode = isRestrictedCoordinator ? 'room' : mode;
    const targetActivityId = isRestrictedCoordinator ? coordinatorAssignedActivityId : activityId;

    setBigScreenMode(targetMode);
    setBigScreenActivityId(targetActivityId);
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
    showLeaveConfirm,
    mobileMenuOpen,
    profileDirty
  });

  useEffect(() => {
    currentNavRef.current = {
      activeTab,
      selectedGame,
      showBigScreen,
      showEditProfile,
      showLogoutConfirm,
      showLeaveConfirm,
      mobileMenuOpen,
      profileDirty
    };
  }, [activeTab, selectedGame, showBigScreen, showEditProfile, showLogoutConfirm, showLeaveConfirm, mobileMenuOpen, profileDirty]);

  // Push new page onto stack with scroll position remembered from the current page
  const pushNavEntry = ({ tab, game = null, passGameId = null, leaderboardGameId = null, path = null }) => {
    setMobileMenuOpen(false);
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
    const newEntry = createStackEntry({ tab, game, passGameId, leaderboardGameId, path, scrollY: 0 });
    nextStack.push(newEntry);
    const newIndex = nextStack.length - 1;

    setNavStack(nextStack);
    setStackIndex(newIndex);
    setActiveTab(tab);
    setSelectedGame(game);
    setSelectedPassGameId(passGameId);
    setSelectedLeaderboardGameId(leaderboardGameId);

    // 4. Update browser history
    try {
      window.history.pushState({
        cognisphere: true,
        stackIndex: newIndex,
        entryId: newEntry.id,
        tab,
        gameId: game?.id || null,
        passGameId: passGameId || null,
        leaderboardGameId: leaderboardGameId || null
      }, '', newEntry.path);
    } catch (e) { }

    // 5. Scroll new page layer to top
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
  };

  const navigateToTab = (tab) => {
    if (activeTab === 'profile' && profileDirty && tab !== 'profile') {
      setPendingProfileExitTab(tab);
      return;
    }
    pushNavEntry({ tab, game: null, passGameId: null, leaderboardGameId: null });
  };

  const navigateToHomeContact = () => {
    if (activeTab !== 'home') {
      navigateToTab('home');
    }
    setTimeout(() => {
      const el = document.getElementById('contact');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150);
  };

  const handleProfileNavigate = (targetTab) => {
    setProfileDirty(false);
    currentNavRef.current.profileDirty = false;
    setPendingProfileExitTab(null);
    if (targetTab === '__back__') {
      if (navStackRef.current.index > 0) {
        triggerBackAction();
      } else {
        navigateToTab('home');
      }
    } else {
      pushNavEntry({ tab: targetTab || 'home', game: null, passGameId: null, leaderboardGameId: null });
    }
  };

  const navigateToGame = (game) => {
    if (activeTab === 'profile' && profileDirty) {
      setPendingProfileExitTab('events');
      return;
    }
    pushNavEntry({ tab: 'events', game, passGameId: null, leaderboardGameId: null, path: `/events?game=${game?.id}` });
  };

  const handleOpenPassForGame = (activityId) => {
    pushNavEntry({ tab: 'pass', game: null, passGameId: activityId, leaderboardGameId: null, path: '/pass' });
  };

  const handleOpenLeaderboardForGame = (activityId) => {
    pushNavEntry({
      tab: 'leaderboard',
      game: null,
      passGameId: null,
      leaderboardGameId: activityId,
      path: activityId ? `/leaderboard?game=${activityId}` : '/leaderboard'
    });
  };

  // Automatically navigate away from leaderboard if it gets hidden by an admin
  useEffect(() => {
    if (!showLeaderboard && activeTab === 'leaderboard') {
      navigateToTab('home');
    }
  }, [showLeaderboard, activeTab]);

  // Back Navigation: Moves back along the layer stack, restoring the remembered scroll position
  const triggerBackAction = () => {
    const current = currentNavRef.current;

    // 0. Dismiss Mobile Drawer if open
    if (current.mobileMenuOpen) {
      setMobileMenuOpen(false);
      return;
    }

    // 0.5. Prompt if on profile edit page with unsaved changes
    if (current.activeTab === 'profile' && current.profileDirty) {
      setPendingProfileExitTab('__back__');
      return;
    }

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
      setSelectedLeaderboardGameId(targetEntry.leaderboardGameId || null);

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
      setSelectedLeaderboardGameId(targetEntry.leaderboardGameId || null);

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
      const current = currentNavRef.current;

      // Intercept browser back / swipe gesture if on profile edit page with unsaved changes
      if (current.activeTab === 'profile' && current.profileDirty) {
        // Re-push profile route so history position is retained and app doesn't leave unexpectedly
        try {
          window.history.pushState(
            { cognisphere: true, tab: 'profile', stackIndex: index },
            '',
            window.location.pathname + window.location.search
          );
        } catch (err) { }
        setPendingProfileExitTab('__back__');
        return;
      }

      // Close open modals and mobile menu when navigating back/forward
      setMobileMenuOpen(false);
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
        setSelectedLeaderboardGameId(targetEntry.leaderboardGameId || null);

        // Restore remembered position
        restoreScrollPosition(targetEntry.scrollY);
        return;
      }

      // Check current browser pathname directly
      const currentTab = getTabFromPath();

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
        setSelectedLeaderboardGameId(targetEntry.leaderboardGameId || null);
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
        if (current.mobileMenuOpen) {
          setMobileMenuOpen(false);
        } else if (current.showLeaveConfirm) {
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
        initialActivityId={effectiveIsAdmin ? bigScreenActivityId : (coordinatorAssignedActivityId || bigScreenActivityId)}
        showLeaderboard={showLeaderboard}
        isAdmin={effectiveIsAdmin}
        assignedActivityId={coordinatorAssignedActivityId}
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
        adminTheme={theme}
        theme={theme}
        onToggleAdminTheme={toggleTheme}
        onToggleTheme={toggleTheme}
        showLeaderboard={showLeaderboard}
        enableThemeToggle={enableThemeToggle}
        canScan={effectiveIsAdmin || canCoordinatorScan}
        canTimers={effectiveIsAdmin || canCoordinatorTimers || effectiveIsJudge}
        canDesk={effectiveIsAdmin || canCoordinatorDesk}
        canBigScreen={effectiveIsAdmin || canCoordinatorBigScreen}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Mobile-Only Header */}
        <header className="md:hidden border-b border-surface-container bg-surface-container-lowest sticky top-0 z-40 transition-colors">
          <div className="px-4 h-16 flex items-center justify-between">
            {/* Mobile Logo */}
            <div
              onClick={() => {
                setMobileMenuOpen(false);
                navigateToTab('home');
              }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-surface-container shadow-xs shrink-0 bg-white/5 flex items-center justify-center p-0.5">
                <img
                  src="/cognisphere-emblem.png"
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

            {/* Mobile Right Controls: Admin Toggle (left side of hamburger menu) + Hamburger Button */}
            <div className="flex items-center gap-2">
              {/* Admin Mode Toggle Button (placed strictly on the left side of the menu) */}
              {isAdmin && (
                <button
                  onClick={toggleAdminMode}
                  title={`Admin Mode: ${adminMode ? 'ON (Active)' : 'OFF (Participant View)'}`}
                  className={`px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95 ${adminMode
                    ? 'bg-primary text-on-primary border-primary shadow-xs'
                    : 'text-on-surface bg-surface-container border-surface-container-high hover:bg-surface-container-high'
                    }`}
                  aria-label="Admin Mode Toggle"
                >
                  <ShieldCheck className={`w-3.5 h-3.5 ${adminMode ? 'text-on-primary' : 'text-primary'}`} />
                  <span className="text-[11px]">{adminMode ? 'Admin ON' : 'Admin'}</span>
                </button>
              )}

              {/* Theme Switch Button (placed to the left of menu button, controlled by enableThemeToggle) */}
              {enableThemeToggle && (
                <ThemeToggleButton
                  isDark={theme === 'dark'}
                  onToggle={toggleTheme}
                  size={18}
                  className="w-9 h-9 !rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-surface-container transition-all active:scale-95 shadow-xs"
                  title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                />
              )}

              {/* Hamburger Menu Button — Skiper99 animated MenuIcon */}
              <button
                onClick={() => setMobileMenuOpen(prev => !prev)}
                className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-surface-container transition-all active:scale-95"
                title={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
              >
                <MenuIcon
                  size={20}
                  isOpen={mobileMenuOpen}
                  onToggle={() => { }}
                  className="w-5 h-5"
                />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Slide-out Drawer Navigation */}
        <MobileDrawerNav
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
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
          theme={theme}
          onToggleTheme={toggleTheme}
          showLeaderboard={showLeaderboard}
          canScan={effectiveIsAdmin || canCoordinatorScan}
          canTimers={effectiveIsAdmin || canCoordinatorTimers || effectiveIsJudge}
          canDesk={effectiveIsAdmin || canCoordinatorDesk}
          canBigScreen={effectiveIsAdmin || canCoordinatorBigScreen}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl xl:max-w-[1400px] w-full mx-auto px-3 sm:px-5 lg:px-6 py-4 sm:py-6">
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
                  showVideoShowcase={showVideoShowcase}
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
                    onOpenLeaderboard={showLeaderboard ? handleOpenLeaderboardForGame : null}
                    onUpdateActivity={updateActivity}
                    onOpenBigScreen={(actId) => handleOpenBigScreen('room', actId)}
                    onSignIn={signInWithGoogle}
                    showLeaderboard={showLeaderboard}
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

              {/* Tab: Dedicated Leaderboard Page with Multi-Event Selector */}
              {activeTab === 'leaderboard' && (
                showLeaderboard ? (
                  <LeaderboardPage
                    activities={activities}
                    initialActivityId={selectedLeaderboardGameId}
                    user={user}
                    isAdmin={effectiveIsAdmin}
                    isCoordinator={effectiveIsCoordinator}
                    isStaff={effectiveIsStaff}
                    canEditLeaderboard={effectiveIsAdmin || canCoordinatorLeaderboard}
                    onBack={triggerBackAction}
                    onNavigateToEvent={(actId) => {
                      const act = activities.find(a => a.id === actId);
                      if (act) navigateToGame(act);
                    }}
                  />
                ) : null
              )}

              {/* Tab: Dedicated Event Registrations & Approvals Portal */}
              {activeTab === 'registrations' && (
                <RegistrationsHub
                  user={user}
                  profile={profile}
                  isAdmin={effectiveIsAdmin}
                  isCoordinator={effectiveIsCoordinator}
                  isStaff={effectiveIsStaff}
                  canManageDesk={effectiveIsAdmin || canCoordinatorDesk}
                  activities={activities}
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
              {activeTab === 'timers' && (effectiveIsAdmin || canCoordinatorTimers || effectiveIsJudge) && (
                <TimersHub
                  activities={activities}
                  role={effectiveRole}
                  roleData={roleData}
                  user={user}
                  isAdmin={effectiveIsAdmin}
                  assignedActivityId={coordinatorAssignedActivityId}
                  onOpenBigScreen={(actId) => handleOpenBigScreen('room', actId)}
                />
              )}

              {/* Tab 4: Coordinator Scanner */}
              {activeTab === 'scan' && user && (effectiveIsAdmin || canCoordinatorScan) && (
                <CoordinatorScanner
                  user={user}
                  activities={activities}
                  isAdmin={effectiveIsAdmin}
                  assignedActivityId={coordinatorAssignedActivityId}
                />
              )}

              {/* Tab 5: Participant Certificates with Admin Release Switch */}
              {activeTab === 'certificates' && user && (
                <CertificatesView
                  user={user}
                  profile={profile}
                  isAdmin={effectiveIsAdmin}
                  activities={activities}
                />
              )}

              {/* Tab 6: Dedicated Profile Editing Page */}
              {activeTab === 'profile' && user && (
                <ProfileEditPage
                  user={user}
                  profile={profile}
                  role={effectiveRole}
                  isAdmin={isAdmin}
                  adminMode={adminMode}
                  onToggleAdminMode={toggleAdminMode}
                  activities={activities}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                  onBack={() => {
                    setProfileDirty(false);
                    currentNavRef.current.profileDirty = false;
                    setPendingProfileExitTab(null);
                    if (navStackRef.current.index > 0) {
                      triggerBackAction();
                    } else {
                      navigateToTab('home');
                    }
                  }}
                  onNavigate={handleProfileNavigate}
                  onDirtyChange={(isDirty) => {
                    setProfileDirty(isDirty);
                    currentNavRef.current.profileDirty = isDirty;
                  }}
                  pendingExitTab={pendingProfileExitTab}
                  onCancelExit={() => setPendingProfileExitTab(null)}
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
            <span className="text-secondary">Have questions or want to reach out?</span>
            <button
              type="button"
              onClick={navigateToHomeContact}
              className="text-primary font-bold hover:underline cursor-pointer transition-colors inline-flex items-center gap-1"
            >
              <span>Contact Us</span>
              <span>&rarr;</span>
            </button>
          </div>
        </footer>
      </div>

      {/* PWA Mobile Add to Home Screen Prompt */}
      <InstallAppPrompt />
    </div>
  );
}
