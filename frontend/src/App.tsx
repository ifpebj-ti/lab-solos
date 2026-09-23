import AppRoutes from './routes';
import { Toaster } from './components/ui/toaster';
import { ThemeProvider } from './theme/ThemeProvider';

function App() {
  return (
    <ThemeProvider>
      <Toaster />
      <AppRoutes />
    </ThemeProvider>
  );
}

export default App;
