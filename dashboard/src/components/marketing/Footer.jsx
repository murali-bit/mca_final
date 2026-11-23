import { Link } from 'react-router-dom';

const footerLinks = [
  {
    heading: 'Product',
    links: ['Features', 'Pricing', 'Changelog', 'Roadmap'],
    paths: ['/features', '/pricing', '/changelog', '/roadmap'],
  },
  {
    heading: 'Company',
    links: ['About', 'Blog', 'Careers', 'Press'],
    paths: ['/about', '/blog', '/careers', '/press'],
  },
  {
    heading: 'Developers',
    links: ['Docs', 'API Reference', 'SDKs', 'Status'],
    paths: ['/docs', '/docs/api', '/docs/sdks', '/status'],
  },
  {
    heading: 'Legal',
    links: ['Privacy', 'Terms', 'Cookie Policy', 'Security'],
    paths: ['/privacy', '/terms', '/cookies', '/security'],
  },
];

const GeometricIcon = () => (
  <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" fill="none" stroke="#0A0A0A" strokeWidth="2" />
    <polygon points="14,7 21,11 21,17 14,21 7,17 7,11" fill="#0A0A0A" opacity="0.12" stroke="#0A0A0A" strokeWidth="1.5" />
    <circle cx="14" cy="14" r="3" fill="#6366f1" />
  </svg>
);

export default function Footer() {
  return (
    <footer className="bg-[#f9fafb] border-t border-black/5 relative overflow-hidden">
      {/* Dot grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #00000018 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        {/* Top section */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 mb-14">
          {/* Brand column */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <GeometricIcon />
              <span className="text-lg font-bold text-[#0A0A0A]">Germin8</span>
            </Link>
            <p className="text-sm text-[#0A0A0A]/55 leading-relaxed max-w-[200px]">
              Automate your MCA compliance with AI-powered intelligence.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-black/5 text-[#0A0A0A]/50 hover:text-[#0A0A0A] transition-all"
                aria-label="GitHub"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-black/5 text-[#0A0A0A]/50 hover:text-[#0A0A0A] transition-all"
                aria-label="Twitter"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-black/5 text-[#0A0A0A]/50 hover:text-[#0A0A0A] transition-all"
                aria-label="LinkedIn"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
              </a>
            </div>
          </div>

          {/* Link columns */}
          {footerLinks.map((col) => (
            <div key={col.heading}>
              <h3 className="text-xs font-semibold text-[#0A0A0A] tracking-widest uppercase mb-4">
                {col.heading}
              </h3>
              <ul className="space-y-3">
                {col.links.map((label, i) => (
                  <li key={label}>
                    <Link
                      to={col.paths[i]}
                      className="text-sm text-[#0A0A0A]/55 hover:text-[#0A0A0A] transition-colors duration-200"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider + Copyright */}
        <div className="border-t border-black/8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#0A0A0A]/40">
            © 2024 Germin8. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-[#0A0A0A]/50">
            <button
              onClick={() => window.dispatchEvent(new Event('open-cookie-preferences'))}
              className="hover:text-black underline cursor-pointer transition-colors"
            >
              Cookie Preferences
            </button>
            <span>•</span>
            <span>Built for CA firms, corporates &amp; compliance teams in India.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
