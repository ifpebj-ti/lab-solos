import logo from './../../../public/images/logo.png';
import logoBlack from './../../../public/images/logoBlack.png';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Cookie from 'js-cookie';
import { X } from 'lucide-react';

import { NavMain } from '@/components/nav-main';
import { NavSecondary } from '@/components/nav-secondary';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import VersionDisplay from '@/components/VersionDisplay';
import { getUserById } from '@/integration/Users';
import { IUser } from '@/pages/Profile';
import { getNavigationGroups } from '@/navigation/navigationModel';
import { ThemeSwitch } from '@/theme/ThemeSwitch';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import { OPERATION_IDS } from '@/errors/errorCatalog';

type UserType = 'Administrador' | 'Mentor' | 'Mentorado' | 'Comum';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isMobile } = useSidebar();
  const [user, setUser] = useState<IUser>();
  const [loading, setLoading] = useState(true);
  const [userError, setUserError] = useState<unknown>();
  const [retryToken, setRetryToken] = useState(0);
  const location = useLocation();
  const id = Cookie.get('rankID')!;

  const isSubItemActive = (url: string): boolean =>
    location.pathname === url ||
    (location.pathname.startsWith(`${url}/`) && url !== '/');

  useEffect(() => {
    const fetchGetUserById = async () => {
      try {
        const response = await getUserById({ id });
        setUser(response);
        setUserError(undefined);
      } catch (error) {
        setUserError(error);
        setUser(undefined);
      } finally {
        setLoading(false);
      }
    };

    fetchGetUserById();
  }, [id, retryToken]);

  let userType: UserType = 'Comum';
  if (user?.nivelUsuario === 'Mentor') userType = 'Mentor';
  else if (user?.nivelUsuario === 'Mentorado') userType = 'Mentorado';
  else if (user?.nivelUsuario === 'Administrador') userType = 'Administrador';

  const data = {
    navMain: getNavigationGroups(userType).map((item) => ({
      title: item.label,
      url: item.to,
      icon: item.icon,
      isActive: false,
      items: item.children?.map((subItem) => ({
        title: subItem.label,
        url: subItem.to,
        isActive: isSubItemActive(subItem.to),
      })),
    })),
  };

  const sidebarIdentity = (
    <div className='flex w-full items-center gap-3'>
      <div className='relative flex h-12 w-12 items-center justify-center'>
        <img
          src={logo}
          className='h-full w-12 object-contain transition-opacity hover:opacity-0'
          alt='Logo'
        />
        <img
          src={logoBlack}
          className='absolute h-full w-full object-contain opacity-0 transition-opacity hover:opacity-100'
          alt='Logo alternativo'
        />
      </div>
      <div className='grid flex-1 text-left text-sm leading-tight'>
        <span className='truncate font-semibold'>{user?.nivelUsuario}</span>
        <span className='truncate text-xs'>
          Solos e Sustentabilidade Ambiental
        </span>
      </div>
    </div>
  );

  return (
    <Sidebar
      aria-label='Navegação principal'
      className='top-[--header-height] !h-[calc(100svh-var(--header-height))]'
      {...props}
    >
      <SidebarHeader>
        <div className='flex items-center justify-between gap-2'>
          <SidebarMenu>
            <SidebarMenuItem>
              {data.navMain[0] ? (
                <SidebarMenuButton size='lg' asChild>
                  <Link
                    to={data.navMain[0].url}
                    className='flex w-full items-center gap-3'
                  >
                    {sidebarIdentity}
                  </Link>
                </SidebarMenuButton>
              ) : (
                sidebarIdentity
              )}
            </SidebarMenuItem>
          </SidebarMenu>

          {isMobile && (
            <SheetClose asChild className='md:hidden bg-surface text-clt-2'>
              <Button variant='ghost' size='icon' aria-label='Fechar menu'>
                <X className='h-5 w-5' />
                <span className='sr-only'>Fechar menu</span>
              </Button>
            </SheetClose>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {userError ? (
          <div className='px-2 pt-2'>
            <ErrorFeedback
              error={userError}
              operationId={OPERATION_IDS.userById}
              onRetry={() => setRetryToken((token) => token + 1)}
            />
          </div>
        ) : null}
        <NavMain items={data.navMain} />
        <SidebarGroup className='px-2 py-0'>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <ThemeSwitch className='static right-auto top-auto z-auto w-full justify-start border-transparent bg-transparent px-2 text-sidebar-foreground shadow-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring focus-visible:ring-offset-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0' />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <NavSecondary items={[]} className='mt-auto' />
      </SidebarContent>

      <SidebarFooter>
        {!loading && user && (
          <NavUser
            user={{
              name: user.nomeCompleto,
              email: user.email,
              nivelUsuario: user.nivelUsuario,
            }}
          />
        )}
      </SidebarFooter>

      <div className='mt-auto mb-2 w-full'>
        <VersionDisplay />
      </div>
    </Sidebar>
  );
}
