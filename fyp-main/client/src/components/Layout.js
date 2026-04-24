import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationAPI } from '../utils/api';
import { getSocket } from '../utils/socket';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  FileText,
  ClipboardCheck,
  MessageSquare,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  Upload,
  Folder,
  Sparkles,
  Settings,
  Home,
  Calendar,
  BarChart2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    loadNotifications();
    
    const socket = getSocket();
    if (socket) {
      socket.on('notification', (notification) => {
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      });
    }

    return () => {
      if (socket) {
        socket.off('notification');
      }
    };
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await notificationAPI.getAll({ limit: 10 });
      setNotifications(response.data.data);
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

    const navigation = [
    { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard, roles: ['student', 'guide', 'coordinator', 'admin'] },
    { name: 'Schedule', href: '/app/schedule', icon: Calendar, roles: ['student', 'guide', 'coordinator', 'admin'] },
    { name: 'Analytics', href: '/app/analytics', icon: BarChart2, roles: ['guide', 'coordinator', 'admin'] },
    { name: 'Projects', href: '/app/projects', icon: FolderKanban, roles: ['student', 'guide', 'coordinator', 'admin'] },
    { name: 'Groups', href: '/app/groups', icon: Users, roles: ['student', 'guide', 'coordinator', 'admin'] },
    { name: 'Deliverables', href: '/app/reports', icon: FileText, roles: ['student', 'guide', 'coordinator', 'admin'] },
    { name: 'Weekly Reports', href: '/app/weekly-reports', icon: FileText, roles: ['student', 'guide', 'coordinator', 'admin'] },
    { name: 'Evaluations', href: '/app/evaluations', icon: ClipboardCheck, roles: ['student', 'guide', 'coordinator', 'admin'] },
    { name: 'Settings', href: '/app/settings', icon: Settings, roles: ['student', 'guide', 'coordinator', 'admin'] },
    { name: 'Users', href: '/app/users', icon: Users, roles: ['coordinator', 'admin'] },
    { name: 'Audit Logs', href: '/app/audit-logs', icon: ClipboardCheck, roles: ['coordinator', 'admin'] },
  ];

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(user?.role)
  );

  // Get current page name for breadcrumb
  const currentPage = filteredNavigation.find(item => item.href === location.pathname)?.name || 'Dashboard';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar — Dark Navy */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-[#0f172a] shadow-sidebar transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-white/10">
            <h1 className="text-xl font-bold">
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">APMS</span>
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  replace
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 relative ${
                    isActive
                      ? 'bg-indigo-600/15 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {/* Active indicator — left glow bar */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-indigo-400 to-indigo-600 rounded-r-full shadow-lg shadow-indigo-500/50" />
                  )}
                  <item.icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center ring-2 ring-indigo-400/30 overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-semibold text-sm">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={() => {
                navigate('/app/profile');
                setSidebarOpen(false);
              }}
              className="w-full flex items-center px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg mb-2 transition-colors"
            >
              <User className="w-4 h-4 mr-2" />
              Profile
            </button>
            <button
              onClick={logout}
              className="w-full flex items-center px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar — Frosted glass white */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-slate-200/80 shadow-nav">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-slate-600 hover:text-slate-800 transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>

              {/* Breadcrumb */}
              <div className="hidden sm:flex items-center space-x-2 text-sm">
                <span className="text-slate-400">Pages</span>
                <span className="text-slate-300">/</span>
                <span className="text-slate-700 font-semibold">{currentPage}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Home Button */}
              <Link
                to="/"
                className="p-2 text-slate-500 hover:text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors"
                title="Go to Home Page"
              >
                <Home className="w-5 h-5" />
              </Link>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-slate-500 hover:text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications dropdown */}
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-80 bg-white/90 backdrop-blur-xl rounded-2xl shadow-ambient border border-slate-200/80 z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-800">Notifications</h3>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-slate-400">
                            No notifications
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <div
                              key={notification._id}
                              onClick={() => handleMarkAsRead(notification._id)}
                              className={`p-4 border-b border-slate-50 hover:bg-indigo-50/50 cursor-pointer transition-colors ${
                                !notification.isRead ? 'bg-indigo-50/60 border-l-2 border-l-indigo-500' : ''
                              }`}
                            >
                              <p className="text-sm font-medium text-slate-700">
                                {notification.title}
                              </p>
                              <p className="text-xs text-slate-500 mt-1 whitespace-pre-line leading-relaxed">
                                {notification.message}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
