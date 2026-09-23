import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ThemeProvider } from './ThemeProvider';
import { ThemeSwitch } from './ThemeSwitch';

describe('ThemeSwitch', () => {
  it('names the next action and updates the theme accessibly', () => {
    render(
      <ThemeProvider>
        <ThemeSwitch />
      </ThemeProvider>
    );

    const switchButton = screen.getByRole('button', {
      name: 'Mudar para tema escuro',
    });

    expect(switchButton).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(switchButton);

    expect(
      screen.getByRole('button', { name: 'Mudar para tema claro' })
    ).toHaveAttribute('aria-pressed', 'true');
  });
});
