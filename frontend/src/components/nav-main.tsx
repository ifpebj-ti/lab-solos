'use client';

import { type LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { ChevronRightIcon } from '@radix-ui/react-icons';

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
      isActive?: boolean;
    }[];
  }[];
}) {
  const location = useLocation();
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  // Carregar estado salvo do localStorage e inicializar estado correto
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-open-items');
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        setOpenItems(parsedState);
      } catch {
        // Se houver erro no parse, usar estado padrão
        setOpenItems({});
      }
    }

    // Garantir que itens com subitens ativos sejam expandidos na inicialização
    const initialState: Record<string, boolean> = {};
    items.forEach((item) => {
      if (item.items) {
        const hasActiveSubItem = item.items.some(
          (subItem) => location.pathname === subItem.url
        );

        if (hasActiveSubItem) {
          initialState[item.title] = true;
        }
      }
    });

    if (Object.keys(initialState).length > 0) {
      setOpenItems((prev) => {
        const newState = { ...prev, ...initialState };
        localStorage.setItem('sidebar-open-items', JSON.stringify(newState));
        return newState;
      });
    }
  }, [items, location.pathname]);

  // Função para alternar estado de um item
  const toggleItem = (itemTitle: string, forceOpen?: boolean) => {
    setOpenItems((prev) => {
      const newState = {
        ...prev,
        [itemTitle]: forceOpen !== undefined ? forceOpen : !prev[itemTitle],
      };
      localStorage.setItem('sidebar-open-items', JSON.stringify(newState));
      return newState;
    });
  };

  // Auto-expandir item se tiver subitem ativo
  useEffect(() => {
    items.forEach((item) => {
      if (item.items) {
        const hasActiveSubItem = item.items.some(
          (subItem) => location.pathname === subItem.url
        );

        if (hasActiveSubItem) {
          toggleItem(item.title, true);
        }
      }
    });
  }, [location.pathname, items]);

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            open={openItems[item.title] || item.isActive || false}
            onOpenChange={(open) => toggleItem(item.title, open)}
          >
            <SidebarMenuItem>
              {item.items?.length ? (
                // Item com subitens - apenas trigger de expansão
                <>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    className='hover:text-black/70'
                  >
                    <CollapsibleTrigger className='w-full'>
                      <item.icon />
                      <span>{item.title}</span>
                      <ChevronRightIcon className='ml-auto data-[state=open]:rotate-90 transition-transform' />
                    </CollapsibleTrigger>
                  </SidebarMenuButton>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location.pathname === subItem.url}
                            className={
                              location.pathname === subItem.url
                                ? 'text-black font-medium'
                                : 'hover:text-black/70'
                            }
                          >
                            <Link to={subItem.url}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              ) : (
                // Item sem subitens - navegação direta
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={location.pathname === item.url}
                  className={
                    location.pathname === item.url
                      ? 'text-black font-medium'
                      : 'hover:text-black/70'
                  }
                >
                  <Link to={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
