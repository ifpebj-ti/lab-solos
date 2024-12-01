import AppRoutes from './routes';
import { Toaster } from './components/ui/toaster';

function App() {
  return (
    <>
      {/* O Toaster precisa estar no topo */}
      <Toaster />
      <AppRoutes />
    </>
  );
}

export default App;
