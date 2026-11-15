import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Home,
  CalendarDays,
  Trophy,
  ClipboardCheck,
  QrCode,
  Award,
  User,
  Timer,
  ScanLine,
  Tv,
  Sun,
  Moon,
  LogOut,
  LogIn,
  ShieldCheck,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { subscribeToUserPassRequests } from '../services/passApprovalService';

export default function MobileDrawerNav({
  isOpen,
  onClose,
  user,
  profile,
  role = 'participant',
  isAdmin = false,
  isAdminUser = false,
  adminMode = false,
  onToggleAdminMode,
  isCoordinator = false,
  isJudge = false,
  isStaff = false,
  activeTab = 'home',
  onSelectTab,
  onOpenEditProfile,
  onLogout,
  onSignIn,
  onLaunchBigScreen,
  theme = 'light',
  onToggleTheme
}) {
  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Subscribe to real-time pass approval statuses
  const [userRequests, setUserRequests] = useState({});

  useEffect(() => {
    if (!user?.uid) {
      setUserRequests({});
      return;
    }
    const unsub = subscribeToUserPassRequests(user.uid, (map) => {
      setUserRequests(map);
    });
    return () => unsub();
  }, [user?.uid]);

  const passBadge = useMemo(() => {
    if (!user || !profile?.qrId) return null;
    if (isStaff) return 'Ready';

    const requestedList = Object.values(userRequests);
    const requestedCount = requestedList.length;
    const approvedCount = requestedList.filter(r => r.status === 'approved').length;

    if (approvedCount === 0) return null;
    if (approvedCount === requestedCount && requestedCount > 0) return 'Ready';
    return `${approvedCount}/${requestedCount}`;
  }, [user, profile?.qrId, isStaff, userRequests]);

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      show: true,
      badge: null
    },
    {
      id: 'events',
      label: 'Events Hub',
      icon: CalendarDays,
      show: true,
      badge: null
    },
    {
      id: 'leaderboard',
      label: 'Leaderboard',
      icon: Trophy,
      show: true,
      badge: 'Live'
    },
    {
      id: 'registrations',
      label: isStaff ? 'Registrations & Approvals' : 'Event Registrations',
      icon: ClipboardCheck,
      show: true,
      badge: isStaff ? 'Desk' : null
    },
    {
      id: 'pass',
      label: 'My QR Pass',
      icon: QrCode,
      show: Boolean(user),
      badge: passBadge
    },
    {
      id: 'certificates',
      label: 'Certificates',
      icon: Award,
      show: Boolean(user),
      badge: null
    },
    {
      id: 'profile',
      label: 'Profile Settings',
      icon: User,
      show: Boolean(user),
      badge: null
    },
    {
      id: 'timers',
      label: 'Timers Hub',
      icon: Timer,
      show: isStaff || isJudge,
      badge: null
    },
    {
      id: 'scan',
      label: 'Room Scanner',
      icon: ScanLine,
      show: isStaff,
      badge: 'Staff'
    },
  ];

  const roleLabel = isAdmin ? 'Admin' : isCoordinator ? 'Coordinator' : isJudge ? 'Judge' : 'Participant';

  return (
    <div className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        className={`fixed inset-y-0 right-0 w-[84%] max-w-sm bg-surface-container-lowest border-l border-surface-container text-on-surface shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* 1. Header with App Info & Close Button */}
        <div className="h-16 px-4 border-b border-surface-container flex items-center justify-between bg-surface-container-low shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-surface-container shadow-xs shrink-0">
              <img
                src="/Cognisphere-logo.jpeg"
                alt="Cognisphere Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xs tracking-wider leading-none">
                <span className="text-on-surface">COGNI</span>
                <span className="text-primary">SPHERE</span>
              </span>
              <span className="text-[7.5px] font-bold text-secondary tracking-widest uppercase mt-0.5 leading-none">
                AI &amp; ML CLUB
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-secondary hover:text-on-surface hover:bg-surface-container transition-colors active:scale-95"
            title="Close menu"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-on-surface" />
          </button>
        </div>

        {/* 2. User Info Card */}
        <div className="p-3.5 border-b border-surface-container bg-surface-container-low/50 shrink-0">
          {user ? (
            <div
              onClick={() => {
                onClose();
                onSelectTab('profile');
              }}
              className="flex items-center gap-3 p-2 rounded-2xl bg-surface-container hover:bg-surface-container-high border border-surface-container cursor-pointer transition-all active:scale-[0.98] group"
              title="View & Edit Profile"
            >
              {/* Avatar with Role Badge */}
              <div className="relative shrink-0">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-10 h-10 rounded-xl object-cover border border-surface-container-high group-hover:border-primary transition-all shadow-xs"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}

                {(isAdmin || isCoordinator || isJudge) && (
                  <span
                    className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black uppercase shadow-xs border-2 border-surface-container-lowest ${
                      isAdmin
                        ? 'bg-amber-600 text-white'
                        : isCoordinator
                        ? 'bg-primary text-on-primary'
                        : 'bg-purple-600 text-white'
                    }`}
                  >
                    {isAdmin ? 'A' : isCoordinator ? 'C' : 'J'}
                  </span>
                )}
              </div>

              {/* User text details */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-on-surface truncate">
                  {profile?.name || user.displayName || 'Club Participant'}
                </div>
                <div className="text-[10px] font-mono text-secondary truncate mt-0.5">
                  {profile?.usn || user.email}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                    isAdmin
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                      : isCoordinator
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : isJudge
                      ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30'
                      : 'bg-surface-container-high text-secondary border border-surface-container'
                  }`}>
                    {roleLabel}
                  </span>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-secondary group-hover:text-on-surface group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-surface-container border border-surface-container text-center space-y-2">
              <p className="text-xs font-semibold text-on-surface">Sign in to participate &amp; get your pass</p>
              <button
                onClick={() => {
                  onClose();
                  onSignIn();
                }}
                className="w-full py-2 px-3 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-xs active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In with Google</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. Navigation List (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 no-scrollbar">
          <div className="text-[10px] font-bold uppercase tracking-widest text-secondary px-3 py-1">
            Menu Navigation
          </div>

          {navItems
            .filter(item => item.show)
            .map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onClose();
                    onSelectTab(item.id);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-surface-container text-primary font-bold border-l-4 border-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low active:bg-surface-container'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-secondary'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                      isActive
                        ? 'bg-primary-container text-on-primary'
                        : item.badge === 'Ready'
                        ? 'bg-tertiary-container text-on-tertiary-container'
                        : item.badge === 'Waiting'
                        ? 'bg-surface-container text-secondary'
                        : 'bg-secondary-container text-on-secondary-container font-mono'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

          {/* Staff Projector Screen Button */}
          {isStaff && onLaunchBigScreen && (
            <div className="pt-2">
              <button
                onClick={() => {
                  onClose();
                  onLaunchBigScreen('hall');
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <Tv className="w-4 h-4 shrink-0 text-primary" />
                  <span>Projector Screen</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-60" />
              </button>
            </div>
          )}
        </div>

        {/* 4. Bottom Section: Theme Toggle & Logout */}
        <div className="p-3.5 border-t border-surface-container bg-surface-container-low space-y-2 shrink-0">
          {/* Mobile Theme Toggle Button inside the Menu */}
          {onToggleTheme && (
            <div
              onClick={onToggleTheme}
              className="p-2.5 rounded-2xl bg-surface-container hover:bg-surface-container-high border border-surface-container flex items-center justify-between cursor-pointer transition-all select-none active:scale-[0.98]"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggleTheme();
                }
              }}
            >
              <div className="flex items-center gap-2.5 text-xs font-semibold text-on-surface">
                {theme === 'dark' ? (
                  <Moon className="w-4 h-4 text-primary" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                )}
                <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
              </div>
              <div
                className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                  theme === 'dark' ? 'bg-primary justify-end' : 'bg-surface-container-high border border-outline-variant justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-xs block" />
              </div>
            </div>
          )}

          {/* Sign Out Button */}
          {user && (
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-secondary hover:text-error hover:bg-error-container/20 border border-transparent hover:border-error/20 transition-all active:scale-95"
            >
              <LogOut className="w-4 h-4 text-error" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

