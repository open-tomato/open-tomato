import { DocsLayout } from '@open-tomato/ui-docs';
import { Footer, Header, type PortalNavLink } from '@open-tomato/ui-portal';
import { useEffect } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router';

import { FIRST_PAGE, NAV_SECTIONS, pageById } from './content';
import { links } from './links';
import { Markdown } from './Markdown';
import { useTheme } from './useTheme';

const HEADER_NAV: readonly PortalNavLink[] = [
  { id: 'home', label: 'Home', href: links.home },
  { id: 'docs', label: 'Docs', href: '/' },
];

const DocsPage = () => {
  const { category = '', slug = '' } = useParams();
  const navigate = useNavigate();
  const id = `${category}/${slug}`;
  const page = pageById(id);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [id]);

  if (!page) return <Navigate to={`/${FIRST_PAGE.id}`} replace />;

  return (
    <DocsLayout
      sections={NAV_SECTIONS}
      active={id}
      onNavigate={(pid) => navigate(`/${pid}`)}
      breadcrumb={[
        { key: 'docs', label: 'Docs' },
        { key: page.id, label: page.title },
      ]}
      title={page.title}
      lead={page.lead}
      anchors={page.anchors}
      editHref={page.editHref ?? undefined}
    >
      <Markdown>{page.body}</Markdown>
    </DocsLayout>
  );
};

const Chrome = () => {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <>
      <Header
        links={HEADER_NAV}
        active="docs"
        theme={theme}
        onToggleTheme={setTheme}
        githubHref={links.github}
        ctaLabel="Dashboard"
        ctaHref={links.auth}
        onNavigate={(id, e) => {
          // Brand + "Home" leave to the marketing site; "Docs" routes SPA-side.
          if (id === 'home') {
            e.preventDefault();
            window.location.href = links.home;
          } else if (id === 'docs') {
            e.preventDefault();
            navigate(`/${FIRST_PAGE.id}`);
          }
        }}
      />
      <main>
        <Routes>
          <Route path="/" element={<Navigate to={`/${FIRST_PAGE.id}`} replace />} />
          <Route path="/:category/:slug" element={<DocsPage />} />
          <Route path="*" element={<Navigate to={`/${FIRST_PAGE.id}`} replace />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
};

export const App = () => (
  <BrowserRouter>
    <Chrome />
  </BrowserRouter>
);
