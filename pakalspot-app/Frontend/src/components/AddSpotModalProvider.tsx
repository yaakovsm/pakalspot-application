import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import AddSpotForm from './AddSpotForm';
import { useAuth } from '../hooks/useAuth';
import { useAuthModal } from './AuthModalProvider';
import { useSpots } from '../hooks/useSpots';

export interface OpenAddSpotOptions {
  initialLocation?: { lat: number; lng: number };
  onSuccess?: () => void;
}

interface AddSpotModalContextValue {
  openAddSpot: (options?: OpenAddSpotOptions) => void;
}

const AddSpotModalContext = createContext<AddSpotModalContextValue | undefined>(undefined);

export const useAddSpotModal = (): AddSpotModalContextValue => {
  const ctx = useContext(AddSpotModalContext);
  if (!ctx) {
    throw new Error('useAddSpotModal must be used inside AddSpotModalProvider');
  }
  return ctx;
};

export const AddSpotModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { fetchSpots } = useSpots();
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [initialLocation, setInitialLocation] = useState<{ lat: number; lng: number } | undefined>();
  const successCallbackRef = useRef<(() => void) | undefined>(undefined);

  const openAddSpot = useCallback(
    (options?: OpenAddSpotOptions) => {
      if (!isAuthenticated) {
        openAuthModal('login');
        return;
      }
      setInitialLocation(options?.initialLocation);
      successCallbackRef.current = options?.onSuccess;
      setFormKey((k) => k + 1);
      setOpen(true);
    },
    [isAuthenticated, openAuthModal]
  );

  const clearModalState = useCallback(() => {
    successCallbackRef.current = undefined;
    setInitialLocation(undefined);
  }, []);

  const handleFormSuccess = useCallback(() => {
    void fetchSpots();
    successCallbackRef.current?.();
    successCallbackRef.current = undefined;
    setInitialLocation(undefined);
    setOpen(false);
  }, [fetchSpots]);

  const handleClose = useCallback(() => {
    setOpen(false);
    clearModalState();
  }, [clearModalState]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) {
        clearModalState();
      }
    },
    [clearModalState]
  );

  const value = useMemo(() => ({ openAddSpot }), [openAddSpot]);

  return (
    <AddSpotModalContext.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          hideCloseButton
          className="max-w-4xl max-h-[90vh] overflow-y-auto p-0"
        >
          <AddSpotForm
            key={formKey}
            initialLocation={initialLocation}
            onClose={handleClose}
            onSuccess={handleFormSuccess}
          />
        </DialogContent>
      </Dialog>
    </AddSpotModalContext.Provider>
  );
};
