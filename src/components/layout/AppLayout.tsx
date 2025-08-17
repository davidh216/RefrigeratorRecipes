'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

  const navigationItems = [
    {
      href: '/',
      label: 'Home',
      icon: '🏠',
    },
    {
      href: '/ingredients',
      label: 'Ingredients',
      icon: '🥬',
    },
    {
      href: '/meal-planning',
      label: 'Meal Planning',
      icon: '📅',
    },
    {
      href: '/recipes',
      label: 'Recipes',
      icon: '📖',
    },
    {
      href: '/recommendations',
      label: 'Recommendations',
      icon: '🎯',
    },
    {
      href: '/shopping-list',
      label: 'Shopping List',
      icon: '🛒',
    },
  ];

  // Show navigation only on authenticated pages
  const showNavigation = user && pathname !== '/';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <Navbar className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <Container>
          <Flex align="center" justify="between" className="w-full">
            <NavbarBrand>
              <Link 
                href="/" 
                className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white"
              >
                <span className="text-2xl">🍽️</span>
                <span className="hidden sm:inline">Refrigerator Recipes</span>
                <span className="sm:hidden">RefrigeratorRecipes</span>
              </Link>
            </NavbarBrand>

            <NavbarContent>
              {showNavigation && (
                <div className="hidden md:flex items-center gap-1">
                  {navigationItems.slice(1).map((item) => (
                    <NavItem
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      isActive={pathname === item.href}
                    />
                  ))}
                </div>
              )}
              
              <UserProfile />
            </NavbarContent>
          </Flex>
        </Container>
      </Navbar>

      {/* Mobile Navigation */}
      {showNavigation && (
        <div className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <Container>
            <div className="flex items-center gap-1 py-2 overflow-x-auto">
              {navigationItems.slice(1).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-1 px-3 py-2 rounded-lg transition-colors whitespace-nowrap',
                    'hover:bg-gray-100 dark:hover:bg-gray-700',
                    pathname === item.href && 'bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                  )}
                >
                  <span>{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          </Container>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <Container>
          <div className="py-6">
            <Flex 
              align="center" 
              justify="between" 
              className="flex-col sm:flex-row gap-4 sm:gap-0"
            >
              <div className="text-center sm:text-left">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  © 2024 Refrigerator Recipes. Reduce food waste, cook delicious meals.
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <Link 
                  href="/privacy" 
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Privacy
                </Link>
                <Link 
                  href="/terms" 
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Terms
                </Link>
                <Link 
                  href="/support" 
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Support
                </Link>
              </div>
            </Flex>
          </div>
        </Container>
      </footer>
    </div>
  );
};