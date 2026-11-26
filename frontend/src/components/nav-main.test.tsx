import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Home } from 'lucide-react';
import { NavMain } from './nav-main';
import { SidebarProvider, useSidebar } from './ui/sidebar';
import type { ComponentProps } from 'react';

type NavItem = ComponentProps<typeof NavMain>['items'][number];

function LocationDisplay() {
  const location = useLocation();
  return <output data-testid='location'>{location.pathname}</output>;
}

function MobileSidebarControls() {
  const { openMobile, setOpenMobile } = useSidebar();

  return (
    <>
      <button type='button' onClick={() => setOpenMobile(true)}>
        Abrir navegação móvel
      </button>
      <output data-testid='mobile-sidebar-open'>{String(openMobile)}</output>
    </>
  );
}

function renderNavMain(
  items: NavItem[],
  initialPath = '/',
  mobile = false
) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: mobile ? 375 : 1024,
  });

  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <SidebarProvider>
        <NavMain items={items} />
        <MobileSidebarControls />
      </SidebarProvider>
      <LocationDisplay />
    </MemoryRouter>
  );
}

describe('NavMain', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: window.innerWidth < 768,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
  });

  it('renders direct links and marks only the current route active', () => {
    renderNavMain(
      [
        { title: 'Painel', url: '/painel', icon: Home },
        { title: 'Ajuda', url: '/ajuda', icon: Home, items: [] },
      ],
      '/painel'
    );

    expect(screen.getByRole('link', { name: 'Painel' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('link', { name: 'Ajuda' })).not.toHaveAttribute(
      'aria-current'
    );

    fireEvent.click(screen.getByRole('link', { name: 'Ajuda' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/ajuda');
  });

  it('opens the active submenu and persists its initial state', async () => {
    const items: NavItem[] = [
      {
        title: 'Produtos',
        url: '/produtos',
        icon: Home,
        items: [
          { title: 'Químicos', url: '/produtos/quimicos' },
          { title: 'Vidrarias', url: '/produtos/vidrarias' },
        ],
      },
    ];

    renderNavMain(items, '/produtos/quimicos');

    expect(
      await screen.findByRole('link', { name: 'Químicos' })
    ).toHaveAttribute('aria-current', 'page');
    expect(JSON.parse(localStorage.getItem('sidebar-open-items') ?? '{}')).toEqual({
      Produtos: true,
    });
  });

  it('restores a saved submenu state and persists user toggles', async () => {
    localStorage.setItem('sidebar-open-items', JSON.stringify({ Produtos: true }));
    renderNavMain(
      [
        {
          title: 'Produtos',
          url: '/produtos',
          icon: Home,
          items: [{ title: 'Químicos', url: '/produtos/quimicos' }],
        },
      ],
      '/painel'
    );

    expect(await screen.findByRole('link', { name: 'Químicos' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: /Produtos/ }));
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'Químicos' })).not.toBeInTheDocument()
    );
    expect(JSON.parse(localStorage.getItem('sidebar-open-items') ?? '{}')).toEqual({
      Produtos: false,
    });

    fireEvent.click(screen.getByRole('button', { name: /Produtos/ }));
    expect(await screen.findByRole('link', { name: 'Químicos' })).toBeVisible();
    expect(JSON.parse(localStorage.getItem('sidebar-open-items') ?? '{}')).toEqual({
      Produtos: true,
    });
  });

  it('recovers from malformed saved state while expanding an active submenu', async () => {
    localStorage.setItem('sidebar-open-items', '{invalid json');
    renderNavMain(
      [
        {
          title: 'Produtos',
          url: '/produtos',
          icon: Home,
          items: [{ title: 'Químicos', url: '/produtos/quimicos' }],
        },
      ],
      '/produtos/quimicos'
    );

    expect(await screen.findByRole('link', { name: 'Químicos' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(JSON.parse(localStorage.getItem('sidebar-open-items') ?? '{}')).toEqual({
      Produtos: true,
    });
  });

  it('keeps an explicitly active group open without an active child route', async () => {
    renderNavMain(
      [
        {
          title: 'Produtos',
          url: '/produtos',
          icon: Home,
          isActive: true,
          items: [{ title: 'Químicos', url: '/produtos/quimicos' }],
        },
      ],
      '/painel'
    );

    expect(await screen.findByRole('link', { name: 'Químicos' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Químicos' })).not.toHaveAttribute(
      'aria-current'
    );
  });

  it('closes mobile navigation after following a link', async () => {
    renderNavMain(
      [{ title: 'Painel', url: '/painel', icon: Home }],
      '/',
      true
    );

    fireEvent.click(screen.getByRole('button', { name: 'Abrir navegação móvel' }));
    expect(screen.getByTestId('mobile-sidebar-open')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('link', { name: 'Painel' }));

    await waitFor(() =>
      expect(screen.getByTestId('mobile-sidebar-open')).toHaveTextContent('false')
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/painel');
  });
});
