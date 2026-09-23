import { ReactNode } from 'react';

interface ContainerI {
  children: ReactNode;
}

function Container({ children }: ContainerI) {
  return <section className='w-full min-w-0 overflow-x-auto'>{children}</section>;
}

export default Container;
