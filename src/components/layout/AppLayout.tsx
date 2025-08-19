'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Container,
  Button,
  Flex,
  Badge,
} from '@/components/ui';
import { UserProfile } from '@/components/auth';
import { useAuth } from '@/contexts/AuthContext';
import { clsx } from 'clsx';

interface AppLayoutProps {
  children: React.ReactNode;
}

interface NavItemProps {
  href: string;
  label: string;
  icon: string;
  isActive?: boolean;
  badge?: string | number;
}

const NavItem: React.FC<NavItemProps> = ({ href, label, icon, isActive, badge }) => {
  return (
    <NavbarItem>
      <Link
        href={href}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          isActive && 'bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
        )}
      >
        <span className="text-lg">{icon}</span>
        <span className="font-medium">{label}</span>
        {badge && (
          <Badge variant="secondary" className="ml-1 text-xs">
            {badge}
          </Badge>
        )}
      </Link>
    </NavbarItem>
  );
};

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigationItems = [
    {
      href: '/ingredients',
      label: 'Ingredients',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      href: '/meal-planning',
      label: 'Meal Planning',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      href: '/recipes',
      label: 'Recipes',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      href: '/recommendations',
      label: 'Recommendations',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
    {
      href: '/shopping-list',
      label: 'Shopping List',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v4a2 2 0 01-2 2H9a2 2 0 01-2-2v-4m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
        </svg>
      ),
    },
  ];

  // Show navigation only on authenticated pages
  const showNavigation = user && pathname !== '/';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Vertical Sidebar Navigation */}
      {showNavigation && (
        <div 
          className="fixed left-0 top-0 z-50 h-full"
          onMouseEnter={() => setSidebarOpen(true)}
          onMouseLeave={() => setSidebarOpen(false)}
        >
          <motion.div
            initial={false}
            animate={{ width: sidebarOpen ? 280 : 72 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="h-full bg-white shadow-xl border-r border-gray-200 flex flex-col"
          >
            {/* App Logo/Brand */}
            <div className="p-4 border-b border-gray-200">
              <Link href="/" className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-xl flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-sm">
                  🥬
                </div>
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15 }}
                      className="ml-4"
                    >
                      <h1 className="text-lg font-bold text-gray-900 whitespace-nowrap">Refrigerator Recipes</h1>
                      <p className="text-xs text-gray-500">Reduce waste, cook smart</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Link>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 p-4">
              <div className="space-y-2">
                {navigationItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        'w-full flex items-center px-3 py-3 rounded-xl text-left transition-all duration-200 group',
                        isActive
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 border border-blue-200 shadow-sm'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      <div className={clsx(
                        'w-6 h-6 shrink-0 flex items-center justify-center transition-colors',
                        isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'
                      )}>
                        {item.icon}
                      </div>
                      <AnimatePresence>
                        {sidebarOpen && (
                          <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.15 }}
                            className="ml-4 font-medium whitespace-nowrap"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {isActive && (
                        <motion.div
                          className="ml-auto w-2 h-2 bg-blue-600 rounded-full"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.2 }}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* User Profile Section */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center">
                <div className="shrink-0">
                  <UserProfile />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Main Content */}
      <main className={clsx(
        'min-h-screen transition-all duration-200',
        showNavigation ? 'ml-[72px]' : 'ml-0'
      )}>
        {children}
      </main>

      {/* Footer */}
      <footer className={clsx(
        'bg-white border-t border-gray-200 transition-all duration-200',
        showNavigation ? 'ml-[72px]' : 'ml-0'
      )}>
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <p className="text-sm text-gray-600">
                © 2024 Refrigerator Recipes. Reduce food waste, cook delicious meals.
              </p>
            </div>
            
            <div className="flex items-center gap-6">
              <Link 
                href="/privacy" 
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Privacy
              </Link>
              <Link 
                href="/terms" 
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Terms
              </Link>
              <Link 
                href="/support" 
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};