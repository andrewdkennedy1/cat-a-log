import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface WelcomeModalProps {
  isOpen: boolean;
  onDismiss: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onDismiss }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onDismiss}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex justify-center">
            <img src="/logo.png" alt="Cat-a-log Logo" className="w-24 h-24" />
          </div>
          <DialogTitle className="text-center text-2xl">Welcome to Cat-a-log!</DialogTitle>
          <DialogDescription className="text-center">
            Your personal cat encounter tracker.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <h3 className="font-semibold">How to use:</h3>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Log every cat you meet.</li>
            <li>See your encounters on the map.</li>
            <li>Connect your Google account in settings to sync your data across devices.</li>
          </ul>
          <p className="mt-4 text-sm">Have fun finding cats!</p>
        </div>
        <DialogFooter className="flex-col sm:flex-col sm:space-x-0">
            <Button onClick={onDismiss}>Get Started</Button>
            <div className="text-xs text-center mt-2">
                <Link to="/policy" className="underline">Privacy Policy</Link>
                &nbsp;&middot;&nbsp;
                <Link to="/tos" className="underline">Terms of Service</Link>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeModal;