'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Card, CardContent } from '@/components/ui';
import { clsx } from 'clsx';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector for the element to highlight
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface OnboardingTourProps {
  isVisible: boolean;
  onComplete: () => void;
  onSkip: () => void;
  className?: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Meal Planning! 🎉',
    description: 'Let\'s take a quick tour to help you get started with planning your weekly meals.',
    target: 'body',
    position: 'center'
  },
  {
    id: 'recipe-library',
    title: 'Recipe Library',
    description: 'Browse and search through our collection of delicious recipes. You can filter by ingredients, cooking time, and dietary preferences.',
    target: '[data-tour="recipe-library"]',
    position: 'left'
  },
  {
    id: 'drag-drop',
    title: 'Drag & Drop Recipes',
    description: 'Simply drag any recipe from the library and drop it into a meal slot on the calendar. It\'s that easy!',
    target: '[data-tour="meal-slot"]',
    position: 'right'
  },
  {
    id: 'meal-slots',
    title: 'Meal Slots',
    description: 'Each slot represents a meal for a specific day and time. Click on any slot to add or edit meal details.',
    target: '[data-tour="meal-slots"]',
    position: 'bottom'
  },
  {
    id: 'week-navigation',
    title: 'Navigate Weeks',
    description: 'Use the navigation buttons to move between different weeks and plan ahead.',
    target: '[data-tour="week-navigation"]',
    position: 'top'
  },
  {
    id: 'shopping-list',
    title: 'Generate Shopping List',
    description: 'Once you\'ve planned your meals, generate a shopping list with all the ingredients you\'ll need.',
    target: '[data-tour="shopping-list"]',
    position: 'left'
  },
  {
    id: 'complete',
    title: 'You\'re All Set! 🚀',
    description: 'You now know everything you need to start meal planning. Happy cooking!',
    target: 'body',
    position: 'center'
  }
];

const TourOverlay: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-40"
        />
      )}
    </AnimatePresence>
  );
};

const TourTooltip: React.FC<{
  step: OnboardingStep;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onComplete: () => void;
  isVisible: boolean;
}> = ({
  step,
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
  onComplete,
  isVisible
}) => {
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  const getPositionClasses = (position: string) => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-4';
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-4';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-4';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-4';
      case 'center':
        return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
      default:
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-4';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={clsx(
            "fixed z-50 max-w-sm",
            step.position === 'center' ? 'w-full max-w-md' : 'w-80',
            getPositionClasses(step.position)
          )}
        >
          <Card className="shadow-2xl border-2 border-primary-200 dark:border-primary-700">
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {step.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {step.description}
                    </p>
                  </div>
                  <button
                    onClick={onSkip}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label="Skip tour"
                  >
                    ×
                  </button>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Step {currentStep + 1} of {totalSteps}</span>
                    <span>{Math.round(((currentStep + 1) / totalSteps) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <motion.div
                      className="bg-primary-500 h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>

                {/* Action Button */}
                {step.action && (
                  <Button
                    size="sm"
                    onClick={() => {
                      step.action?.onClick();
                      onNext();
                    }}
                    className="w-full"
                  >
                    {step.action.label}
                  </Button>
                )}

                {/* Navigation */}
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onPrevious}
                    disabled={isFirst}
                    className="text-xs"
                  >
                    ← Previous
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onSkip}
                      className="text-xs"
                    >
                      Skip Tour
                    </Button>
                    
                    {isLast ? (
                      <Button
                        size="sm"
                        onClick={onComplete}
                        className="text-xs"
                      >
                        Get Started
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={onNext}
                        className="text-xs"
                      >
                        Next →
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const TourHighlight: React.FC<{ target: string; isVisible: boolean }> = ({ 
  target, 
  isVisible 
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });

  useEffect(() => {
    if (!isVisible || target === 'body') return;

    const updatePosition = () => {
      const element = document.querySelector(target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setPosition({
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
        });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [target, isVisible]);

  if (target === 'body' || !isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
      className="fixed z-30 pointer-events-none"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        height: position.height,
      }}
    >
      <div className="w-full h-full border-2 border-primary-500 rounded-lg shadow-lg bg-primary-50/20 dark:bg-primary-900/20" />
    </motion.div>
  );
};

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isVisible,
  onComplete,
  onSkip,
  className
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isTourVisible, setIsTourVisible] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsTourVisible(true);
      setCurrentStep(0);
    } else {
      setIsTourVisible(false);
    }
  }, [isVisible]);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsTourVisible(false);
    onComplete();
  };

  const handleSkip = () => {
    setIsTourVisible(false);
    onSkip();
  };

  const currentStepData = ONBOARDING_STEPS[currentStep];

  return (
    <>
      <TourOverlay isVisible={isTourVisible} />
      
      <TourHighlight 
        target={currentStepData.target} 
        isVisible={isTourVisible} 
      />
      
      <TourTooltip
        step={currentStepData}
        currentStep={currentStep}
        totalSteps={ONBOARDING_STEPS.length}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onSkip={handleSkip}
        onComplete={handleComplete}
        isVisible={isTourVisible}
      />
    </>
  );
};

// Hook to manage onboarding state
export const useOnboarding = () => {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [isOnboardingVisible, setIsOnboardingVisible] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('meal-planning-onboarding-seen');
    if (!seen) {
      setIsOnboardingVisible(true);
    }
  }, []);

  const completeOnboarding = () => {
    setHasSeenOnboarding(true);
    setIsOnboardingVisible(false);
    localStorage.setItem('meal-planning-onboarding-seen', 'true');
  };

  const skipOnboarding = () => {
    setHasSeenOnboarding(true);
    setIsOnboardingVisible(false);
    localStorage.setItem('meal-planning-onboarding-seen', 'true');
  };

  const resetOnboarding = () => {
    localStorage.removeItem('meal-planning-onboarding-seen');
    setIsOnboardingVisible(true);
  };

  return {
    hasSeenOnboarding,
    isOnboardingVisible,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
  };
};
