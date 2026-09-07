import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import TopDown from './TopDown';

it('nomeia inversão e comunica estado sem mudar callback', () => {
  const click = vi.fn();
  const { rerender } = render(<TopDown top onClick={click} />);
  const button = screen.getByRole('button', { name: 'Inverter ordem' });
  expect(button).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(button);
  expect(click).toHaveBeenCalledTimes(1);
  rerender(<TopDown top={false} onClick={click} />);
  expect(button).toHaveAttribute('aria-pressed', 'true');
});
