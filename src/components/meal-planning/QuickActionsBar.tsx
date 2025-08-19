'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MealSlot, Recipe } from '@/types';
import {
  Card,
  CardContent,
  Button,
  Flex,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  Badge,
  Loading,
  Alert,
  AlertTitle,
  AlertDescription,
} from '@/components/ui';

interface QuickActionsBarProps {
  onCopyLastWeek: () => Promise<void>;
  onAutoFillFavorites: () => Promise<void>;
  onClearWeek: () => Promise<void>;
  onBalanceMeals: () => Promise<void>;
  onSurpriseMe: () => Promise<void>;
  isLoading?: boolean;
  plannedMealsCount: number;
  totalMealsCount: number;
  className?: string;
}

interface ActionButtonProps {
  icon: string;
  label: string;
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'secondary';
}

const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  onClick,
  isLoading = false,
  disabled = false,
  variant = 'outline',
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Button
        variant={variant}
        onClick={onClick}
        disabled={disabled || isLoading}
        className="w-full p-3 flex items-center gap-3 text-left"
        size="sm"
      >
        {isLoading ? (
          <Loading className="w-4 h-4" />
        ) : (
          <span className="text-lg">{icon}</span>
        )}
        <span className="text-sm font-medium">{label}</span>
      </Button>
    </motion.div>
  );
};

export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({
  onCopyLastWeek,
  onAutoFillFavorites,
  onClearWeek,
  onBalanceMeals,
  onSurpriseMe,
  isLoading = false,
  plannedMealsCount,
  totalMealsCount,
  className,
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleAction = async (action: string, actionFn: () => Promise<void>) => {
    setActionLoading(action);
    try {
      await actionFn();
    } catch (error) {
      console.error(`Error in ${action}:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const isWeekEmpty = plannedMealsCount === 0;
  const isWeekFull = plannedMealsCount === totalMealsCount;

  return (
    <>
      {/* Floating Quick Actions Button */}
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-16 right-0 mb-2"
            >
              <Card className="shadow-xl border-2 border-primary-200 bg-white min-w-[200px]">
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="text-center mb-3">
                      <Badge variant="primary" className="text-xs">
                        {plannedMealsCount}/{totalMealsCount} planned
                      </Badge>
                    </div>
                    
                    <ActionButton
                      icon="📋"
                      label="Copy Last Week"
                      onClick={() => handleAction('copyLastWeek', onCopyLastWeek)}
                      isLoading={actionLoading === 'copyLastWeek'}
                      disabled={isLoading}
                    />

                    <ActionButton
                      icon="⭐"
                      label="Auto-fill Favorites"
                      onClick={() => handleAction('autoFillFavorites', onAutoFillFavorites)}
                      isLoading={actionLoading === 'autoFillFavorites'}
                      disabled={isLoading || isWeekFull}
                    />

                    <ActionButton
                      icon="⚖️"
                      label="Balance Meals"
                      onClick={() => handleAction('balanceMeals', onBalanceMeals)}
                      isLoading={actionLoading === 'balanceMeals'}
                      disabled={isLoading || isWeekEmpty}
                    />

                    <ActionButton
                      icon="🎲"
                      label="Surprise Me"
                      onClick={() => handleAction('surpriseMe', onSurpriseMe)}
                      isLoading={actionLoading === 'surpriseMe'}
                      disabled={isLoading || isWeekFull}
                      variant="primary"
                    />

                    <ActionButton
                      icon="🗑️"
                      label="Clear Week"
                      onClick={() => setShowClearConfirm(true)}
                      isLoading={actionLoading === 'clearWeek'}
                      disabled={isLoading || isWeekEmpty}
                      variant="secondary"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Lightning Button */}
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Button
            variant="primary"
            size="lg"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-14 h-14 rounded-full shadow-lg bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 border-2 border-white"
          >
            <span className="text-2xl">⚡</span>
          </Button>
        </motion.div>
      </div>

      {/* Clear Week Confirmation Modal */}
      <Modal isOpen={showClearConfirm} onClose={() => setShowClearConfirm(false)}>
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <span className="text-2xl">🗑️</span>
            Clear This Week?
          </ModalTitle>
        </ModalHeader>
        <ModalBody>
          <Alert variant="warning">
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              This will remove all {plannedMealsCount} planned meals from this week. 
              This action cannot be undone.
            </AlertDescription>
          </Alert>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>What will be cleared:</strong>
            </p>
            <ul className="mt-2 text-sm text-gray-600 space-y-1">
              <li>• All assigned recipes</li>
              <li>• Meal notes and customizations</li>
              <li>• Serving size adjustments</li>
            </ul>
          </div>
        </ModalBody>
        <ModalFooter>
          <Flex className="gap-3 w-full">
            <Button
              variant="outline"
              onClick={() => setShowClearConfirm(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowClearConfirm(false);
                handleAction('clearWeek', onClearWeek);
              }}
              className="flex-1"
            >
              Clear Week
            </Button>
          </Flex>
        </ModalFooter>
      </Modal>
    </>
  );
};
