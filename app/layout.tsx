import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://legalease.pk"),
  title: {
    default: "LegalEase — Understand the law. Find the right lawyer.",
    template: "%s — LegalEase",
  },
  description:
    "LegalEase connects citizens with verified lawyers, plain-language legal guidance, and an AI assistant that explains rights under Pakistan Code & Sindh Code — so you can act with confidence.",
  keywords: [
    "find a lawyer pakistan",
    "karachi lawyer",
    "pakistan legal assistant",
    "sindh code",
    "legal resources karachi",
    "lawyer directory pakistan",
    "legal notice generator",
    "fbr filer status",
  ],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/favicon.png",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_PK",
    siteName: "LegalEase",
    title: "LegalEase — Understand the law. Find the right lawyer.",
    description:
      "Verified Pakistani lawyers, plain-language guidance, and an AI legal intelligence assistant built to demystify the law.",
    images: [{ url: "/favicon.png", width: 512, height: 512, alt: "LegalEase" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${montserrat.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var origSet = Element.prototype.setAttribute;
                  Element.prototype.setAttribute = function(name, val) {
                    if (typeof name === 'string' && (name === 'bis_skin_checked' || name.indexOf('bis_') === 0)) return;
                    return origSet.apply(this, arguments);
                  };
                  var origSetNode = Element.prototype.setAttributeNode;
                  Element.prototype.setAttributeNode = function(attr) {
                    if (attr && typeof attr.name === 'string' && (attr.name === 'bis_skin_checked' || attr.name.indexOf('bis_') === 0)) return attr;
                    return origSetNode.apply(this, arguments);
                  };
                  if (typeof document !== 'undefined') {
                    var cleanBis = function() {
                      var els = document.querySelectorAll('[bis_skin_checked]');
                      for (var i = 0; i < els.length; i++) {
                        els[i].removeAttribute('bis_skin_checked');
                      }
                    };
                    cleanBis();
                    if (typeof MutationObserver !== 'undefined') {
                      var observer = new MutationObserver(function(mutations) {
                        for (var i = 0; i < mutations.length; i++) {
                          var m = mutations[i];
                          if (m.type === 'attributes' && m.attributeName && m.attributeName.indexOf('bis_') === 0) {
                            m.target.removeAttribute(m.attributeName);
                          }
                        }
                      });
                      observer.observe(document.documentElement, {
                        attributes: true,
                        subtree: true,
                        attributeFilter: ['bis_skin_checked', 'bis_register']
                      });
                    }
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}