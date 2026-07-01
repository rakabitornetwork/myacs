import '../css/app.css';
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { Suspense } from 'react';

const pages = import.meta.glob('./Pages/**/*.jsx');

createInertiaApp({
  resolve: (name) => {
    const importPage = pages[`./Pages/${name}.jsx`];
    if (!importPage) {
      throw new Error(`Page not found: ${name}`);
    }
    return importPage();
  },
  setup({ el, App, props }) {
    createRoot(el).render(
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
          </div>
        }
      >
        <App {...props} />
      </Suspense>,
    );
  },
  progress: {
    color: '#2563eb',
    showSpinner: true,
  },
});
