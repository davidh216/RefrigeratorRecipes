import React from 'react';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button } from '@/components/ui';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader>
        <ModalTitle>Keyboard Shortcuts</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">Navigation</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>← →</span>
                  <span>Navigate weeks</span>
                </div>
                <div className="flex justify-between">
                  <span>↑ ↓</span>
                  <span>Navigate meal slots</span>
                </div>
                <div className="flex justify-between">
                  <span>Enter</span>
                  <span>Edit selected slot</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Quick Actions</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>1</span>
                  <span>Copy last week</span>
                </div>
                <div className="flex justify-between">
                  <span>2</span>
                  <span>Auto-fill favorites</span>
                </div>
                <div className="flex justify-between">
                  <span>3</span>
                  <span>Clear week</span>
                </div>
                <div className="flex justify-between">
                  <span>4</span>
                  <span>Balance meals</span>
                </div>
                <div className="flex justify-between">
                  <span>5</span>
                  <span>Surprise me</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Copy & Paste</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Ctrl/Cmd + C</span>
                  <span>Copy meal</span>
                </div>
                <div className="flex justify-between">
                  <span>Ctrl/Cmd + V</span>
                  <span>Paste meal</span>
                </div>
                <div className="flex justify-between">
                  <span>Delete/Backspace</span>
                  <span>Remove meal</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Utilities</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>S</span>
                  <span>Generate shopping list</span>
                </div>
                <div className="flex justify-between">
                  <span>E</span>
                  <span>Export meal plan</span>
                </div>
                <div className="flex justify-between">
                  <span>/</span>
                  <span>Focus search</span>
                </div>
                <div className="flex justify-between">
                  <span>?</span>
                  <span>Show this help</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <p className="text-sm text-gray-600">
              <strong>Tip:</strong> Hold Shift while dragging to swap meals between slots instead of copying them.
            </p>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={onClose}
          className="w-full"
        >
          Got it!
        </Button>
      </ModalFooter>
    </Modal>
  );
};
