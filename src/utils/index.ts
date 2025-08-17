// Utility functions

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility for combining Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format time in minutes to human readable format
export function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  
  return `${hours} hr ${remainingMinutes} min`;
}

// Check if ingredients match recipe requirements
export function matchesIngredients(
  availableIngredients: string[],
  requiredIngredients: string[],
  minMatchPercentage: number = 0.7
): boolean {
  const matchCount = requiredIngredients.filter(ingredient =>
    availableIngredients.some(available =>
      available.toLowerCase().includes(ingredient.toLowerCase())
    )
  ).length;
  
  return matchCount / requiredIngredients.length >= minMatchPercentage;
}

// Ingredient utility functions
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getDaysUntilExpiration(expirationDate: Date): number {
  const today = new Date();
  const diffTime = expirationDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getExpirationStatus(expirationDate?: Date): 'fresh' | 'expiring-soon' | 'expired' {
  if (!expirationDate) return 'fresh';
  
  const daysUntilExpiration = getDaysUntilExpiration(expirationDate);
  
  if (daysUntilExpiration < 0) return 'expired';
  if (daysUntilExpiration <= 3) return 'expiring-soon';
  return 'fresh';
}

export function getExpirationBadgeVariant(status: string): 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'fresh': return 'success';
    case 'expiring-soon': return 'warning';
    case 'expired': return 'danger';
    default: return 'success';
  }
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}