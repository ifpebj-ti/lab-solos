import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { toast as sonnerToast } from 'sonner';

import { ThemeProvider } from '@/theme/ThemeProvider';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Toaster as SonnerToaster } from './sonner';

describe('primitivas portais', () => {
  it('fecha o diálogo pelo teclado e devolve o foco ao acionador', async () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <button type='button'>Abrir detalhes</button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Detalhes do registro</DialogTitle>
          <p>Conteúdo do registro.</p>
        </DialogContent>
      </Dialog>
    );

    const trigger = screen.getByRole('button', { name: 'Abrir detalhes' });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = await screen.findByRole('dialog', {
      name: 'Detalhes do registro',
    });
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('abre o popover por teclado, usa superfície temática e devolve o foco', async () => {
    render(
      <Popover>
        <PopoverTrigger asChild>
          <button type='button'>Abrir opções</button>
        </PopoverTrigger>
        <PopoverContent>
          <button type='button'>Opção disponível</button>
        </PopoverContent>
      </Popover>
    );

    const trigger = screen.getByRole('button', { name: 'Abrir opções' });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'Enter', code: 'Enter' });
    fireEvent.keyUp(trigger, { key: 'Enter', code: 'Enter' });
    fireEvent.click(trigger);

    const option = await screen.findByRole('button', {
      name: 'Opção disponível',
    });
    const content = option.parentElement;
    expect(content).not.toBeNull();
    expect(content).toHaveClass('bg-surface', 'text-clt-2');

    fireEvent.keyDown(content!, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Opção disponível' })).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});

describe('sonner', () => {
  it('propaga o tema atual para o portal de notificações', async () => {
    window.localStorage.setItem('labon.theme.v1', 'dark');

    render(
      <ThemeProvider>
        <SonnerToaster />
      </ThemeProvider>
    );
    sonnerToast('Tema de teste');

    await waitFor(() =>
      expect(document.querySelector('[data-sonner-toaster]')).toHaveAttribute(
        'data-theme',
        'dark'
      )
    );
  });
});
