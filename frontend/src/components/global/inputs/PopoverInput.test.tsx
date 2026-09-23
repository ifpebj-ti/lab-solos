import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import PopoverInput from './PopoverInput';

describe('PopoverInput real', () => {
  it('associa rótulo e erro ao combobox e não envia o formulário ao abrir', () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
    HTMLElement.prototype.scrollIntoView = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) =>
      event.preventDefault()
    );

    render(
      <form onSubmit={onSubmit}>
        <PopoverInput
          id='unidade-medida'
          title='Unidade de medida'
          unidades={[{ value: 'kg', label: 'Quilograma' }]}
          value=''
          onChange={vi.fn()}
          error='Selecione uma unidade de medida.'
        />
        <button type='submit'>Enviar formulário</button>
      </form>
    );

    const trigger = screen.getByRole('combobox', {
      name: 'Unidade de medida',
    });
    expect(trigger).toHaveAttribute('id', 'unidade-medida');
    expect(trigger).toHaveAttribute('type', 'button');
    expect(trigger).toHaveAttribute('aria-invalid', 'true');

    const describedBy = trigger.getAttribute('aria-describedby');
    expect(describedBy).toBe('unidade-medida-error');
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      'Selecione uma unidade de medida.'
    );

    fireEvent.click(trigger);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
