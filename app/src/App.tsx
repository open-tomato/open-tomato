import { createBrowserRouter, RouterProvider } from 'react-router';

import { appRoutes } from './routes/routes';
import { ThemeProvider } from './theme/ThemeProvider';

const router = createBrowserRouter(appRoutes);

export function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
