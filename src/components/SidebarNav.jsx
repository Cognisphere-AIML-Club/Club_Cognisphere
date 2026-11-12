import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Home,
  CalendarDays, 
  QrCode, 
  Timer, 
  ScanLine, 
  Award, 
  Tv, 
  LogOut, 
  LogIn,
  Sparkles,
  ShieldCheck,
  User,
  Sun,
  Moon
} from 'lucide-react';

export const SidebarNav = ({
  user,
  profile,
  role,
  isAdmin,
  isCoordinator,
  isJudge,
  isStaff,
  activeTab,
  onSelectTab,
  onOpenEditProfile,
  onLogout,
  onSignIn,
  onLaunchBigScreen,
  adminTheme = 'light',
  onToggleAdminTheme
}) => {
  // Persist sidebar collapsed state (default collapsed)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('club_games_sidebar_collapsed');
      return saved === 'false' ? false : true;
    } catch (e) {
      return true;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('club_games_sidebar_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

  const navItems = [
    {
      id: 'home',
      label: 'Club Home',
      icon: Home,
      show: true,
      badge: null
    },
    {
      id: 'events',
      label: 'Events & Hub',
      icon: CalendarDays,
      show: true,
      badge: null
    },
    {
      id: 'pass',
      label: 'My QR Pass',
      icon: QrCode,
      show: Boolean(user),
      badge: profile?.usn ? 'Ready' : 'Profile'
    },
    {
      id: 'certificates',
      label: 'Certificates',
      icon: Award,
      show: Boolean(user),
      badge: null
    },
    {
      id: 'timers',
      label: 'Timers Hub',
      icon: Timer,
      show: isStaff || isJudge,
      badge: 'Live'
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
    <aside
      className={`hidden md:flex flex-col h-screen sticky top-0 shrink-0 transition-all duration-300 z-30 select-none border-r ${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-surface-container-lowest border-surface-container text-on-surface shadow-xs`}
    >
      {/* 1. Header with Logo & Brand */}
      <div className={`h-16 flex items-center border-b border-surface-container px-3.5 transition-all ${
        isCollapsed ? 'justify-center' : 'justify-between'
      }`}>
        <div 
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-3 cursor-pointer overflow-hidden group"
          title="Cognisphere - AI & Machine Learning Club"
        >
          {/* Logo Squircle Badge */}
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-surface-container-high shadow-xs shrink-0 group-hover:scale-105 transition-transform">
            <img 
              src="/Cognisphere-logo.jpeg" 
              alt="Cognisphere Logo" 
              className="w-full h-full object-cover"
            />
          </div>

          {/* Logo Text (Expanded only) */}
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-base tracking-wider leading-none">
                <span className="text-on-surface">COGNI</span>
                <span className="text-primary">SPHERE</span>
              </span>
              <span className="text-[9px] font-bold tracking-widest text-secondary uppercase mt-0.5 leading-none">
                AI &amp; ML CLUB
              </span>
            </div>
          )}
        </div>

        {/* Collapse Toggle Button (when expanded) */}
        {!isCollapsed && (
          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {isCollapsed && (
        <div className="pt-2 px-3 flex justify-center">
          <button
            onClick={toggleCollapse}
            className="w-full py-1.5 flex items-center justify-center rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Navigation Items */}
      <nav className="flex-1 py-4 px-2.5 space-y-1.5 overflow-y-auto overflow-x-hidden">
        {navItems
          .filter(item => item.show)
          .map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={isCollapsed ? item.label : undefined}
                aria-label={item.label}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isCollapsed ? 'justify-center' : 'justify-between'
                } ${
                  isActive
                    ? 'bg-surface-container text-primary border-l-4 border-primary shadow-xs font-bold'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-secondary'}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!isCollapsed && item.badge && (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    isActive 
                      ? 'bg-primary-container text-on-primary' 
                      : 'bg-surface-container text-secondary'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

        {/* Staff Quick Action: Launch Projector Big Screen */}
        {isStaff && (
          <div className="pt-2">
            <button
              onClick={() => onLaunchBigScreen('hall')}
              title={isCollapsed ? "Projector Big Screen" : undefined}
              aria-label="Launch Projector Big Screen"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                isCollapsed ? 'justify-center' : 'justify-start'
              } bg-primary text-on-primary hover:bg-primary-container border-primary shadow-xs`}
            >
              <Tv className="w-4 h-4 text-on-primary shrink-0" />
              {!isCollapsed && <span>Projector Screen</span>}
            </button>
          </div>
        )}
      </nav>

      {/* 3. Bottom Left Profile Section OR Sign In / Sign Up Button */}
      <div className="p-3 border-t border-surface-container bg-surface-container-low">
        {user ? (
          <div>
            {/* Admin Theme Toggle Switch (Only visible for Admin) */}
            {isAdmin && onToggleAdminTheme && (
              !isCollapsed ? (
                <div 
                  onClick={onToggleAdminTheme}
                  className="mb-2.5 p-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-high flex items-center justify-between cursor-pointer transition-all select-none group"
                  title={`Switch to ${adminTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onToggleAdminTheme();
                    }
                  }}
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-on-surface">
                    {adminTheme === 'dark' ? (
                      <Moon className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                    )}
                    <span>{adminTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                  </div>
                  <div
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                      adminTheme === 'dark' ? 'bg-primary justify-end' : 'bg-surface-container-high border border-outline-variant justify-start'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow-xs block" />
                  </div>
                </div>
              ) : (
                <div className="mb-2.5 flex justify-center">
                  <button
                    type="button"
                    onClick={onToggleAdminTheme}
                    className="w-9 h-9 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-colors shadow-xs"
                    title={`Toggle Admin Theme (${adminTheme === 'dark' ? 'Dark' : 'Light'})`}
                    aria-label="Toggle Admin Theme"
                  >
                    {adminTheme === 'dark' ? (
                      <Moon className="w-4 h-4 text-primary" />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-500" />
                    )}
                  </button>
                </div>
              )
            )}

            {/* User Profile Overview */}
            {isCollapsed ? (
              <div className="flex flex-col items-center justify-center w-full">
                <div 
                  onClick={onOpenEditProfile}
                  className="cursor-pointer group flex items-center justify-center"
                  title={`${profile?.name || user.displayName || 'Participant'}${isAdmin || isCoordinator || isJudge ? ` (${roleLabel})` : ''}`}
                >
                  {/* Avatar with Role Bubble */}
                  <div className="relative shrink-0 flex items-center justify-center">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        className="w-9 h-9 rounded-xl object-cover border border-surface-container-high group-hover:border-primary group-hover:ring-2 group-hover:ring-primary/20 transition-all shadow-xs"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-xs shrink-0 shadow-xs group-hover:ring-2 group-hover:ring-primary transition-all">
                        {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}

                    {/* Role bubble */}
                    {(isAdmin || isCoordinator || isJudge) && (
                      <span 
                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black uppercase shadow-xs border-2 border-surface-container-lowest ${
                          isAdmin 
                            ? 'bg-amber-600 text-white' 
                            : isCoordinator 
                            ? 'bg-primary text-on-primary' 
                            : 'bg-purple-600 text-white'
                        }`}
                        title={roleLabel}
                      >
                        {isAdmin ? 'A' : isCoordinator ? 'C' : 'J'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Logout Button centered below avatar */}
                <div className="mt-2.5 flex justify-center w-full">
                  <button
                    type="button"
                    onClick={onLogout}
                    className="p-2 rounded-xl text-secondary hover:text-error hover:bg-error-container/30 transition-colors"
                    title="Sign Out"
                    aria-label="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2.5">
                <div 
                  onClick={onOpenEditProfile}
                  className="flex items-center gap-2.5 min-w-0 cursor-pointer group flex-1"
                  title="Profile Settings (Click to edit)"
                >
                  {/* Avatar with Role Bubble */}
                  <div className="relative shrink-0">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        className="w-9 h-9 rounded-xl object-cover border border-surface-container-high group-hover:border-primary group-hover:ring-2 group-hover:ring-primary/20 transition-all shadow-xs"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-xs shrink-0 shadow-xs group-hover:ring-2 group-hover:ring-primary transition-all">
                        {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}

                    {/* Role bubble */}
                    {(isAdmin || isCoordinator || isJudge) && (
                      <span 
                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black uppercase shadow-xs border-2 border-surface-container-lowest ${
                          isAdmin 
                            ? 'bg-amber-600 text-white' 
                            : isCoordinator 
                            ? 'bg-primary text-on-primary' 
                            : 'bg-purple-600 text-white'
                        }`}
                        title={roleLabel}
                      >
                        {isAdmin ? 'A' : isCoordinator ? 'C' : 'J'}
                      </span>
                    )}
                  </div>

                  {/* User Name & USN */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                      {profile?.name || user.displayName || 'Participant'}
                    </div>
                    {profile?.usn && (
                      <div className="text-[10px] font-mono text-secondary truncate">
                        {profile.usn}
                      </div>
                    )}
                  </div>
                </div>

                {/* Logout Button (when expanded) */}
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-2 rounded-xl text-secondary hover:text-error hover:bg-error-container/30 transition-colors shrink-0"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          /* When NOT signed in: Solid Sign In button (no gradients) */
          <div>
            {!isCollapsed ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={onSignIn}
                  className="w-full py-2.5 px-3 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-2 group active:scale-95"
                  title="Sign In / Sign Up with Google"
                >
                  <LogIn className="w-4 h-4 text-on-primary group-hover:scale-110 transition-transform" />
                  <span>Sign In / Sign Up</span>
                </button>
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-secondary font-medium">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span>Get your event QR pass</span>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={onSignIn}
                  className="w-10 h-10 rounded-xl bg-primary hover:bg-primary-container text-on-primary flex items-center justify-center shadow-xs active:scale-95 transition-all group"
                  title="Sign In / Sign Up"
                  aria-label="Sign In or Sign Up"
                >
                  <LogIn className="w-5 h-5 text-on-primary group-hover:scale-110 transition-transform" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
