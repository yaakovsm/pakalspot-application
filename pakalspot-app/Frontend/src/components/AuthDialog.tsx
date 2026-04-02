import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { useAuthModal } from './AuthModalProvider';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  actionText?: string;
  cancelText?: string;
}

const AuthDialog: React.FC<AuthDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  actionText,
  cancelText,
}) => {
  const { t } = useTranslation();
  const { openAuthModal } = useAuthModal();

  const handleSignIn = () => {
    onOpenChange(false);
    openAuthModal('login');
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {title || t('auth.sign_in_required')}
          </DialogTitle>
          <DialogDescription className="text-center">
            {description || t('auth.sign_in_required_description')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="w-full sm:w-auto"
          >
            {cancelText || t('common.cancel')}
          </Button>
          <Button
            onClick={handleSignIn}
            className="w-full sm:w-auto"
          >
            {actionText || t('auth.sign_in')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;

