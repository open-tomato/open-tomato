import { createBrowserRouter, RouterProvider } from 'react-router';

import { authRoutes } from './routes/routes';
import { ThemeProvider } from './theme/ThemeProvider';
import { ThemeToggle } from './theme/ThemeToggle';

const router = createBrowserRouter(authRoutes);

export function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
      <ThemeToggle />
    </ThemeProvider>
  );
}
