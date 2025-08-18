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
  description: string;
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'secondary';
}

const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  description,
  onClick,
  isLoading = false,
  disabled = false,
  variant = 'outline',
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="flex-1 min-w-0"
    >
      <Button
        variant={variant}
        onClick={onClick}
        disabled={disabled || isLoading}
        className="w-full h-full p-4 flex flex-col items-center justify-center gap-2 text-center min-h-[120px]"
      >
        {isLoading ? (
          <Loading className="w-6 h-6" />
        ) : (
          <span className="text-2xl">{icon}</span>
        )}
        <div className="space-y-1">
          <p className="font-semibold text-sm">{label}</p>
          <p className="text-xs text-gray-600 opacity-75">{description}</p>
        </div>
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={className}
      >
        <Card className="shadow-lg border-2 border-primary-100 bg-gradient-to-r from-primary-50 to-white">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Header */}
              <div className="text-center">
                <h3 className="text-xl font-bold text-primary-900 mb-2">
                  Quick Actions
                </h3>
                <p className="text-primary-700 text-sm">
                  Power up your meal planning with these time-saving features
                </p>
                <div className="mt-3">
                  <Badge variant="primary" className="text-sm">
                    {plannedMealsCount} of {totalMealsCount} meals planned
                  </Badge>
                </div>
              </div>

              {/* Action Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <ActionButton
                  icon="📋"
                  label="Copy Last Week"
                  description="Duplicate your previous week's meals"
                  onClick={() => handleAction('copyLastWeek', onCopyLastWeek)}
                  isLoading={actionLoading === 'copyLastWeek'}
                  disabled={isLoading}
                />

                <ActionButton
                  icon="⭐"
                  label="Auto-fill Favorites"
                  description="Fill with your top 7 recipes"
                  onClick={() => handleAction('autoFillFavorites', onAutoFillFavorites)}
                  isLoading={actionLoading === 'autoFillFavorites'}
                  disabled={isLoading || isWeekFull}
                />

                <ActionButton
                  icon="🗑️"
                  label="Clear Week"
                  description="Remove all planned meals"
                  onClick={() => setShowClearConfirm(true)}
                  isLoading={actionLoading === 'clearWeek'}
                  disabled={isLoading || isWeekEmpty}
                  variant="secondary"
                />

                <ActionButton
                  icon="⚖️"
                  label="Balance Meals"
                  description="Distribute meal types evenly"
                  onClick={() => handleAction('balanceMeals', onBalanceMeals)}
                  isLoading={actionLoading === 'balanceMeals'}
                  disabled={isLoading || isWeekEmpty}
                />

                <ActionButton
                  icon="🎲"
                  label="Surprise Me"
                  description="Random recipes for empty slots"
                  onClick={() => handleAction('surpriseMe', onSurpriseMe)}
                  isLoading={actionLoading === 'surpriseMe'}
                  disabled={isLoading || isWeekFull}
                  variant="primary"
                />
              </div>

              {/* Progress Bar */}
              <div className="mt-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Planning Progress</span>
                  <span>{Math.round((plannedMealsCount / totalMealsCount) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    className="bg-primary-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(plannedMealsCount / totalMealsCount) * 100}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

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
