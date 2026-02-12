import Link from "next/link";

const FOOTER_LINKS = {
  Product: [
    { href: "/features", label: "Features" },
    { href: "/pricing", label: "Pricing" },
    { href: "/blog", label: "Blog" },
    { href: "/sign-up", label: "Get Started" },
  ],
  Company: [
    { href: "/contact", label: "Contact" },
    { href: "/blog", label: "Blog" },
  ],
  Resources: [
    { href: "/docs", label: "Documentation" },
    { href: "/docs", label: "API Reference" },
  ],
  Legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
  ],
};

export function MarketingFooter() {
  return (
    <footer className="border-t bg-secondary py-12">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <span className="font-semibold gradient-text">CallTone</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Voice agents that handle your calls, book appointments, and never take a day off.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-foreground">{category}</h3>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={`${category}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t pt-6">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} CallTone. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
