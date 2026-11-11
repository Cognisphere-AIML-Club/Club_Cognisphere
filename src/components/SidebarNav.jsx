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
  User
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
  onLaunchBigScreen
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
      } bg-slate-900 border-slate-800 text-slate-100 shadow-xl`}
    >
      {/* 1. Header with Logo & Brand */}
      <div className={`h-16 flex items-center border-b border-slate-800 px-3.5 transition-all ${
        isCollapsed ? 'justify-center' : 'justify-between'
      }`}>
        <div 
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-3 cursor-pointer overflow-hidden group"
          title="Cognisphere - AI & Machine Learning Club"
        >
          {/* Logo Squircle Badge */}
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white p-0.5 border border-slate-700 shadow-sm shrink-0 group-hover:scale-105 transition-transform">
            <img 
              src="/Cognisphere-logo.jpeg" 
              alt="Cognisphere Logo" 
              className="w-full h-full object-contain"
            />
          </div>

          {/* Logo Text (Expanded only) */}
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-base tracking-wider leading-none">
                <span className="text-white">COGNI</span>
                <span className="text-cyan-400">SPHERE</span>
              </span>
              <span className="text-[9px] font-bold tracking-widest text-slate-500 uppercase mt-0.5 leading-none">
                AI & ML CLUB
              </span>
            </div>
          )}
        </div>

        {/* Collapse Toggle Button (when expanded) */}
        {!isCollapsed && (
          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
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
            className="w-full py-1.5 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
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
                    ? 'bg-slate-800/90 text-cyan-400 border-l-4 border-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                  {!isCollapsed && <span className="truncate font-medium">{item.label}</span>}
                </div>

                {!isCollapsed && item.badge && (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    isActive 
                      ? 'bg-cyan-500/20 text-cyan-300' 
                      : 'bg-slate-800 text-slate-400'
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
              } bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-xs`}
            >
              <Tv className="w-4 h-4 text-emerald-400 shrink-0" />
              {!isCollapsed && <span>Projector Screen</span>}
            </button>
          </div>
        )}
      </nav>

      {/* 3. Bottom Left Profile Section OR Sign In / Sign Up Button */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        {user ? (
          <div>
            {/* User Profile Overview: Avatar directly triggers Profile Settings */}
            <div className={`flex items-center gap-2.5 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
              <div 
                onClick={onOpenEditProfile}
                className="flex items-center gap-2.5 min-w-0 cursor-pointer group flex-1"
                title={isCollapsed ? `${profile?.name || user.displayName || 'Participant'}${isAdmin || isCoordinator || isJudge ? ` (${roleLabel})` : ''}` : "Profile Settings (Click to edit)"}
              >
                {/* Avatar with Role Bubble in Bottom Right Corner (Only for Staff roles) */}
                <div className="relative shrink-0">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-9 h-9 rounded-xl object-cover border border-slate-700 group-hover:border-cyan-400 group-hover:ring-2 group-hover:ring-cyan-500/20 transition-all shadow-xs"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm group-hover:ring-2 group-hover:ring-cyan-400 transition-all">
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}

                  {/* Role bubble in bottom right corner (only for Admin, Coordinator, Judge; NEVER for participants) */}
                  {(isAdmin || isCoordinator || isJudge) && (
                    <span 
                      className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black uppercase shadow-md border-2 border-slate-900 ${
                        isAdmin 
                          ? 'bg-amber-500 text-slate-950' 
                          : isCoordinator 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-purple-500 text-white'
                      }`}
                      title={roleLabel}
                    >
                      {isAdmin ? 'A' : isCoordinator ? 'C' : 'J'}
                    </span>
                  )}
                </div>

                {/* User Name & USN (Expanded only) */}
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate group-hover:text-cyan-400 transition-colors">
                      {profile?.name || user.displayName || 'Participant'}
                    </div>
                    {profile?.usn && (
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        {profile.usn}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Logout Button (when expanded) */}
              {!isCollapsed && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* When collapsed, render Logout button centered below avatar */}
            {isCollapsed && (
              <div className="mt-2.5 flex justify-center">
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          /* When NOT signed in: Sign In / Sign Up Button in place of profile */
          <div>
            {!isCollapsed ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={onSignIn}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 group active:scale-95"
                  title="Sign In / Sign Up with Google"
                >
                  <LogIn className="w-4 h-4 text-slate-950 group-hover:scale-110 transition-transform" />
                  <span>Sign In / Sign Up</span>
                </button>
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>Get your event QR pass</span>
                </div>
              </div>
            ) : (
              /* When collapsed: Glowing Sign In Button with compact native hover like direct message icons */
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={onSignIn}
                  className="w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 flex items-center justify-center shadow-lg active:scale-95 transition-all group"
                  title="Sign In / Sign Up"
                  aria-label="Sign In or Sign Up"
                >
                  <LogIn className="w-5 h-5 text-slate-950 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
