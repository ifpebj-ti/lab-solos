import { useState, useEffect } from 'react';
import { updateUserStatus, getCurrentUser } from '@/integration/Users';
import StatusConfirmationDialog from './StatusConfirmationDialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
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
  userName = 'Usuário',
  onStatusUpdate,
}: UserStatusManagerProps) {
  const [status, setStatus] = useState(currentStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>('');

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUserId(user.id);
      } catch (error) {
        console.error('Erro ao obter usuário atual:', error);
      }
    };
    fetchCurrentUser();
  }, []);

  const handleStatusChange = async (newStatus: string) => {
    if (userId === currentUserId) {
      alert('Você não pode alterar seu próprio status!');
      // Reverte a seleção no dropdown
      setStatus(currentStatus);
      return;
    }

    // Se o status é o mesmo, não faz nada
    if (newStatus === currentStatus) {
      return;
    }

    // Abrir popup de confirmação
    setPendingStatus(newStatus);
    setShowConfirmation(true);
  };

  const handleConfirmStatusChange = async () => {
    setIsLoading(true);
    try {
      await updateUserStatus({ userId, status: pendingStatus });
      setStatus(pendingStatus);
      onStatusUpdate?.(pendingStatus);
      setShowConfirmation(false);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status do usuário');
      // Reverte o status em caso de erro
      setStatus(currentStatus);
    } finally {
      setIsLoading(false);
      setPendingStatus('');
    }
  };

  const handleCancelStatusChange = () => {
    setShowConfirmation(false);
    setPendingStatus('');
    // Reverte a seleção no dropdown
    setStatus(currentStatus);
  };

  // Se o usuário está tentando alterar seu próprio status, mostrar apenas o status atual
  const isOwnProfile = userId === currentUserId;

  if (isOwnProfile) {
    return (
      <div className='flex items-center gap-2'>
        <span className='text-sm font-inter-regular text-clt-2'>{status}</span>
        <span className='text-xs text-gray-500'></span>
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
        <SelectTrigger className='w-32 h-8 text-xs border border-borderMy rounded-sm'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className='border border-borderMy rounded-md font-inter-regular bg-backgroundMy'>
          {statusOptions.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className='hover:bg-cl-table-item font-inter-regular text-xs'
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
