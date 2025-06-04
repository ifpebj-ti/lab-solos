import AppRoutes from './routes';
import { Toaster } from './components/ui/toaster';
import { useEffect, useState } from 'react';
import NoResponsiveness from './pages/NoResponsiveness';

function App() {
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 900);

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 900);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <>
      <Toaster />
      {isLargeScreen ? <AppRoutes /> : <NoResponsiveness />}
    </>
  );
}

export default App;
