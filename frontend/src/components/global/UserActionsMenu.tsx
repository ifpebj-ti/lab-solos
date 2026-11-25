import { useState } from 'react';

import ProfileContactForm, {
  type ProfileContactFields,
} from '@/components/auth/ProfileContactForm';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { UsuarioComum } from '@/contracts/user';

import UserStatusManager from './UserStatusManager';

interface UserActionsMenuProps {
  userId: number;
  currentStatus: string;
  userName?: string;
  userEmail: string;
  userPhone: string | null;
  onStatusUpdate?: (newStatus: string) => void;
  onEmailUpdate?: (email: string) => void;
}

export default function UserActionsMenu({
  userId,
  currentStatus,
  userName,
  userEmail,
  userPhone,
  onStatusUpdate,
  onEmailUpdate,
}: UserActionsMenuProps) {
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const targetUser: Pick<
    UsuarioComum,
    'id' | 'nomeCompleto' | 'email' | 'telefone'
  > = {
    id: userId,
    nomeCompleto: userName ?? 'Usuário',
    email: userEmail,
    telefone: userPhone,
  };

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
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <Button
          type='button'
          variant='outline'
          className='mt-2 min-h-9 w-full text-xs md:w-auto'
          aria-label={`Alterar e-mail de ${targetUser.nomeCompleto}`}
          onClick={() => setEmailDialogOpen(true)}
        >
          Alterar e-mail
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar e-mail de {targetUser.nomeCompleto}</DialogTitle>
            <DialogDescription>
              A mudança exige a senha atual do administrador que está realizando
              a ação.
            </DialogDescription>
          </DialogHeader>
          <ProfileContactForm
            mode='admin'
            user={targetUser}
            onSaved={async (fields: ProfileContactFields) => {
              onEmailUpdate?.(fields.email);
            }}
            onCancel={() => setEmailDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
