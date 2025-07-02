import logo from './../../../public/images/logo.png';

import * as React from 'react';
import {
  PackageSearch,
  ArrowLeftRight,
  Users,
  Send,
  Share2,
  House,
  Shield,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Cookie from 'js-cookie';

import { NavMain } from '@/components/nav-main';
import { NavSecondary } from '@/components/nav-secondary';
import { NavProjects } from '@/components/nav-projects';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { getUserById } from '@/integration/Users';
import { IUser } from '@/pages/Profile';

// Ajuste os tipos para refletir os valores reais do backend
type UserType = 'Administrador' | 'Mentor' | 'Mentorado' | 'Comum';

const menus = {
  Administrador: {
    navMain: [
      {
        title: 'inicio',
        url: '/admin/',
        icon: House,
        isActive: true,
      },
      {
        title: 'Produtos',
        url: '/admin/search-material',
        icon: PackageSearch,
        items: [
          {
            title: 'Meus Produtos',
            url: '/admin/search-material',
          },
          {
            title: 'Adicionar',
            url: '/admin/insert',
          },
          {
            title: 'Alertas',
            url: '/admin/follow-up',
          },
        ],
      },
      {
        title: 'Usuários',
        url: '/admin/users',
        icon: Users,
        items: [
          {
            title: 'Ver todos',
            url: '/admin/users',
          },
          {
            title: 'Aprovar/Reprovar',
            url: '/admin/register-request',
          },
        ],
      },
      {
        title: 'Emprestimos',
        url: '/admin/all-loans',
        icon: ArrowLeftRight,
        items: [
          {
            title: 'Solicitações',
            url: '/admin/loans-request',
          },
          {
            title: 'Histórico',
            url: '/admin/all-loans',
          },
        ],
      },
      {
        title: 'Auditoria',
        url: '/admin/auditoria',
        icon: Shield,
      },
    ],
    projects: [
      {
        name: 'Comunicação InterLab',
        url: '/admin/view-info',
        icon: Share2,
      },
    ],
  },
  Mentor: {
    navMain: [
      {
        title: 'Início',
        url: '/mentor/',
        icon: House,
        isActive: true,
      },
      {
        title: 'Histórico',
        url: '/mentor/history/class',
        icon: ArrowLeftRight,
      },
      {
        title: 'Criar Empréstimo',
        url: '/mentor/loan/creation',
        icon: Send,
      },
      {
        title: 'Solicitações',
        url: '/mentor/users-request',
        icon: Users,
      },
      {
        title: 'Pesquisar Material',
        url: '/mentor/search-material',
        icon: PackageSearch,
      },
    ],
    projects: [],
  },
  Mentorado: {
    navMain: [
      {
        title: 'Início',
        url: '/mentee/',
        icon: House,
        isActive: true,
      },
      {
        title: 'Pesquisar Material',
        url: '/mentee/search-material',
        icon: PackageSearch,
      },
      {
        title: 'Histórico Pessoal',
        url: '/mentee/history/mentoring',
        icon: ArrowLeftRight,
      },
    ],
    projects: [],
  },
  Comum: {
    navMain: [
      {
        title: 'Início',
        url: '/comum/',
        icon: House,
        isActive: true,
      },
      {
        title: 'Pesquisar Material',
        url: '/comum/search-material',
        icon: PackageSearch,
      },
    ],
    projects: [],
  },
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [user, setUser] = useState<IUser>();
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const id = Cookie.get('rankID')!;

  // Função para verificar se um subitem está ativo
  const isSubItemActive = (url: string): boolean => {
    return (
      location.pathname === url ||
      (location.pathname.startsWith(url) && url !== '/')
    );
  };

  useEffect(() => {
    const fetchGetUserById = async () => {
      try {
        const response = await getUserById({ id });
        setUser(response);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('Erro ao buscar usuários', error);
        }
        setUser(undefined);
      } finally {
        setLoading(false);
      }
    };
    fetchGetUserById();
  }, [id]);

  // Ajuste para os tipos reais
  let userType: UserType = 'Administrador';
  if (user && user.nivelUsuario) {
    if (user.nivelUsuario === 'Mentor') userType = 'Mentor';
    else if (user.nivelUsuario === 'Mentorado') userType = 'Mentorado';
    else if (user.nivelUsuario === 'Comum') userType = 'Comum';
    else userType = 'Administrador';
  }

  // Mapear os menus e marcar apenas subitens como ativos
  const data = {
    navMain: menus[userType].navMain.map((item) => ({
      ...item,
      // Itens principais não são mais navegáveis, então isActive sempre false
      isActive: false,
      items:
        'items' in item
          ? item.items?.map((subItem: { title: string; url: string }) => ({
              ...subItem,
              isActive: isSubItemActive(subItem.url),
            }))
          : undefined,
    })),
    projects: menus[userType].projects,
  };

  return (
    <Sidebar
      className='top-[--header-height] !h-[calc(100svh-var(--header-height))]'
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size='lg' asChild>
              <Link
                to={`/${userType.toLowerCase()}/`}
                className='flex items-center gap-3 w-full'
              >
                <div className='flex-shrink-0 w-12 h-12 flex items-center justify-center'>
                  <img
                    src={logo}
                    className='object-contain w-full h-full'
                    alt='Logo'
                  />
                </div>
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-semibold'>
                    {user?.nivelUsuario}
                  </span>
                  <span className='truncate text-xs'>
                    Solos e Sustentabilidade Ambiental
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {data.projects.length > 0 && <NavProjects projects={data.projects} />}
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
    </Sidebar>
  );
}
