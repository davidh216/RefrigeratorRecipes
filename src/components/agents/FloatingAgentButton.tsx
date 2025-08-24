import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AgentInterface } from './AgentInterface';
import { Button } from '@/components/ui';

export interface FloatingAgentButtonProps {
  /** Custom class name */
  className?: string;
  /** Position of the floating button */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Initial context for the agent */
  initialContext?: string;
  /** Whether to show notification badges for suggestions */
  showNotifications?: boolean;
  /** Number of unread suggestions/notifications */
  notificationCount?: number;
}

export const FloatingAgentButton: React.FC<FloatingAgentButtonProps> = ({
  className = '',
  position = 'bottom-right',
  initialContext,
  showNotifications = true,
  notificationCount = 0
}) => {
  console.log('FloatingAgentButton loaded - NEW VERSION v2.0');
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const getPositionClasses = () => {
    const positions = {
      'bottom-right': 'bottom-6 right-6',
      'bottom-left': 'bottom-6 left-6',
      'top-right': 'top-6 right-6',
      'top-left': 'top-6 left-6'
    };
    return positions[position];
  };

  const toggleModal = () => {
    if (!isOpen) {
      setIsOpen(true);
      setTimeout(() => setIsAnimating(true), 50); // Small delay for smooth slide-in
    } else {
      setIsAnimating(false);
      setTimeout(() => setIsOpen(false), 300); // Match animation duration
    }
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => setIsOpen(false), 300);
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // Cleanup effect for panel
  useEffect(() => {
    // No body scroll prevention needed for side panel
  }, [isOpen]);

  const floatingButton = (
    <>
      {/* Floating Action Button */}
      <button
        ref={buttonRef}
        onClick={toggleModal}
        className={`
          fixed ${getPositionClasses()} z-50 
          w-14 h-14 
          bg-gradient-to-r from-blue-500 to-purple-600
          hover:from-blue-600 hover:to-purple-700 
          text-white rounded-full shadow-lg hover:shadow-xl
          flex items-center justify-center
          transition-all duration-300 ease-in-out
          transform hover:scale-110 active:scale-95
          focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2
          group
          ${className}
        `}
        aria-label="Open Sous Chef Agent"
        title="Open Sous Chef Agent"
      >
        {/* Chef Hat Icon */}
        <svg
          className="w-7 h-7 transition-transform duration-300 group-hover:rotate-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>

        {/* Notification Badge */}
        {showNotifications && notificationCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold border-2 border-white">
            {notificationCount > 9 ? '9+' : notificationCount}
          </span>
        )}

        {/* Pulse animation for notifications */}
        {showNotifications && notificationCount > 0 && (
          <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20"></span>
        )}
      </button>

      {/* Side Panel Portal */}
      {isOpen && createPortal(
        <>
          {/* Backdrop */}
          <div
            className={`
              fixed inset-0 z-40 bg-black transition-opacity duration-300 ease-in-out
              ${isAnimating ? 'bg-opacity-20' : 'bg-opacity-0'}
            `}
            onClick={handleClose}
          />
          
          {/* Side Panel */}
          <div
            ref={modalRef}
            className={`
              fixed top-0 right-0 z-50 h-full w-96 bg-white shadow-2xl
              transform transition-transform duration-300 ease-in-out
              ${isAnimating ? 'translate-x-0' : 'translate-x-full'}
              flex flex-col
            `}
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-600">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-white">Sous Chef Agent</h2>
              </div>
              
              <button
                onClick={handleClose}
                className="text-white hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-white hover:bg-opacity-20"
                aria-label="Close panel"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Agent Interface */}
            <div className="flex-1 overflow-hidden">
              <AgentInterface
                className="h-full"
                initialContext={initialContext}
                onClose={handleClose}
                compact={true}
              />
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );

  return floatingButton;
};

// Hook for easy integration
export const useFloatingAgent = (options: {
  enabled?: boolean;
  position?: FloatingAgentButtonProps['position'];
  initialContext?: string;
}) => {
  const [isEnabled, setIsEnabled] = useState(options.enabled ?? true);
  const [context, setContext] = useState(options.initialContext);

  return {
    FloatingAgent: isEnabled ? (
      <FloatingAgentButton
        position={options.position}
        initialContext={context}
      />
    ) : null,
    setEnabled: setIsEnabled,
    setContext,
    isEnabled
  };
};

export default FloatingAgentButton;