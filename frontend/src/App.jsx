import { BrowserRouter } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AppRoutes } from '@/app/routes';

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster richColors position="bottom-right" />
    </BrowserRouter>
  );
}

export default App;
