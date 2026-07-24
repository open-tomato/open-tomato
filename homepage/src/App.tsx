import {
  CodeQuickstart,
  CommunityStrip,
  FeatureGrid,
  Footer,
  Header,
  Hero,
  Landing,
  type FooterColumn,
  type FooterSocial,
  type PortalNavLink,
} from '@open-tomato/ui-portal';

import { links } from './links';
import { useTheme } from './useTheme';

/** Marketing nav. In-page anchors resolve against the section ids slotted into
 *  <Landing> below; Docs leaves to the docs site (WS11). */
const NAV: readonly PortalNavLink[] = [
  { id: 'home', label: 'Home', href: '#home' },
  { id: 'features', label: 'Features', href: '#features' },
  { id: 'quickstart', label: 'Quickstart', href: '#quickstart' },
  { id: 'docs', label: 'Docs', href: links.docs },
  { id: 'community', label: 'Community', href: '#community' },
];

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: 'Product',
    links: [
      { label: 'Dashboard', href: links.auth },
      { label: 'CLI', href: `${links.docs}/concepts/cli` },
      { label: 'API reference', href: `${links.docs}/api` },
      { label: 'Changelog', href: `${links.github}/releases` },
    ],
  },
  {
    heading: 'Learn',
    links: [
      { label: 'Docs', href: links.docs },
      { label: 'Examples', href: `${links.docs}/examples` },
      { label: 'Concepts', href: `${links.docs}/concepts` },
    ],
  },
  {
    heading: 'Community',
    links: [
      { label: 'GitHub', href: links.github },
      { label: 'Discord', href: links.discord },
      { label: 'Support us', href: links.patreon },
      { label: 'Contribute', href: `${links.github}/blob/main/CONTRIBUTING.md` },
    ],
  },
  {
    heading: 'Open Tomato',
    links: [
      { label: 'Roadmap', href: `${links.github}/projects` },
      { label: 'License (MIT)', href: `${links.github}/blob/main/LICENSE` },
      { label: 'Sign in', href: links.auth },
    ],
  },
];

const FOOTER_SOCIAL: FooterSocial[] = [
  { name: 'github', label: 'GitHub', href: links.github },
  { name: 'discord', label: 'Discord', href: links.discord },
];

export const App = () => {
  const { theme, setTheme } = useTheme();

  return (
    <>
      <Header
        links={NAV}
        active="home"
        theme={theme}
        onToggleTheme={setTheme}
        githubHref={links.github}
        ctaLabel="Sign in"
        ctaHref={links.auth}
      />

      <main>
        <Landing
          hero={<Hero id="home" />}
          codeQuickstart={<CodeQuickstart id="quickstart" />}
          featureGrid={<FeatureGrid id="features" />}
          communityStrip={<CommunityStrip id="community" />}
        />
      </main>

      <Footer columns={FOOTER_COLUMNS} social={FOOTER_SOCIAL} />
    </>
  );
};
