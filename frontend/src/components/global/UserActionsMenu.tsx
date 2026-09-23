import UserStatusManager from './UserStatusManager';

interface UserActionsMenuProps {
  userId: number;
  currentStatus: string;
  userName?: string;
  onStatusUpdate?: (newStatus: string) => void;
}

export default function UserActionsMenu({
  userId,
  currentStatus,
  userName,
  onStatusUpdate,
}: UserActionsMenuProps) {
  return (
    <div
      role='group'
      aria-label={`Ações de ${userName ?? 'usuário'}`}
      className='min-w-0'
    >
      <UserStatusManager
        userId={userId}
        currentStatus={currentStatus}
        userName={userName}
        onStatusUpdate={onStatusUpdate}
      />
    </div>
  );
}
