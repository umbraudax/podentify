export default function SitemapPage() {
  const links = [
    { name: 'Home', href: '/' },
    { name: 'Features', href: '/#features' },
    { name: 'Pricing', href: '/#pricing' },
    { name: 'About', href: '/about' },
    { name: 'Blog', href: '/blog' },
    { name: 'FAQ', href: '/faq' },
    { name: 'Contact', href: '/contact' },
    { name: 'Privacy', href: '/privacy' },
    { name: 'Terms', href: '/terms' },
  ];
  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-6">Sitemap</h1>
      <ul className="list-disc pl-6 space-y-2">
        {links.map(link => (
          <li key={link.href}>
            <a href={link.href} className="text-brand-primary">{link.name}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}

