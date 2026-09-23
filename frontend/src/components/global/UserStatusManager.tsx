import { useEffect, useState } from 'react';

import { getCurrentUser, updateUserStatus } from '@/integration/Users';
import { OPERATION_IDS } from '@/errors/errorCatalog';
import { notifyError } from '@/errors/presentError';

import StatusConfirmationDialog from './StatusConfirmationDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UserStatusManagerProps {
  userId: number;
  currentStatus: string;
  userName?: string;
  onStatusUpdate?: (newStatus: string) => void;
}

const statusOptions = [
  { value: 'Habilitado', label: 'Habilitado' },
  { value: 'Desabilitado', label: 'Desabilitado' },
];

export default function UserStatusManager({
  userId,
  currentStatus,
  userName = 'Usuario',
  onStatusUpdate,
}: UserStatusManagerProps) {
  const [status, setStatus] = useState(currentStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('');

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  useEffect(() => {
    let isMounted = true;

    void getCurrentUser()
      .then((user) => {
        if (isMounted) setCurrentUserId(user.id);
      })
      .catch(() => {
        // The status control remains usable; the API still enforces ownership.
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleStatusChange = (newStatus: string) => {
    if (userId === currentUserId) {
      setStatus(currentStatus);
      return;
    }

    if (newStatus === currentStatus || newStatus === status) return;

    setPendingStatus(newStatus);
    setShowConfirmation(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!pendingStatus || isLoading) return;

    setIsLoading(true);
    try {
      await updateUserStatus({ userId, status: pendingStatus });
      setStatus(pendingStatus);
      onStatusUpdate?.(pendingStatus);
      setShowConfirmation(false);
    } catch (error) {
      notifyError(error, OPERATION_IDS.updateUserStatus);
      setStatus(currentStatus);
    } finally {
      setIsLoading(false);
      setPendingStatus('');
    }
  };

  const handleCancelStatusChange = () => {
    setShowConfirmation(false);
    setPendingStatus('');
    setStatus(currentStatus);
  };

  if (userId === currentUserId) {
    return (
      <div className='flex min-h-11 items-center gap-2 md:min-h-8'>
        <span className='text-sm font-inter-regular text-clt-2'>{status}</span>
        <span className='text-xs text-clt-1'>Seu usuário</span>
      </div>
    );
  }

  return (
    <>
      <Select
        value={status}
        onValueChange={handleStatusChange}
        disabled={isLoading}
      >
        <SelectTrigger
          aria-label={`Status de ${userName}`}
          className='min-h-11 w-full rounded-md border-borderMy text-sm md:min-h-8 md:w-36 md:text-xs'
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className='rounded-md border border-borderMy bg-surface font-inter-regular'>
          {statusOptions.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className='font-inter-regular text-xs hover:bg-surface-selected'
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <StatusConfirmationDialog
        isOpen={showConfirmation}
        onClose={handleCancelStatusChange}
        onConfirm={handleConfirmStatusChange}
        userName={userName}
        currentStatus={currentStatus}
        newStatus={pendingStatus}
        isLoading={isLoading}
      />
    </>
  );
}
