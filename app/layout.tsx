import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://legalease.pk";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
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

const EXTENSION_CLEANUP_SCRIPT = `(function(){
  try {
    if (typeof window !== "undefined") {
      var isExtensionError = function(msg, source, stack) {
        var combined = String(msg || "") + " " + String(source || "") + " " + String(stack || "");
        return (
          combined.indexOf("chrome-extension://") !== -1 ||
          combined.indexOf("moz-extension://") !== -1 ||
          combined.indexOf("safari-extension://") !== -1 ||
          combined.indexOf("eppiocemhmnlbhjplcgkofciiegomcon") !== -1 ||
          combined.indexOf("M_ID") !== -1
        );
      };

      var handleErr = function(evt) {
        var msg = evt && (evt.message || (evt.reason && evt.reason.message) || evt.reason);
        var src = evt && evt.filename;
        var stack = evt && ((evt.error && evt.error.stack) || (evt.reason && evt.reason.stack));
        if (isExtensionError(msg, src, stack)) {
          evt.preventDefault();
          evt.stopImmediatePropagation();
          return true;
        }
        return false;
      };

      window.addEventListener("error", handleErr, true);
      window.addEventListener("unhandledrejection", handleErr, true);

      // Wrap window.addEventListener so Next.js Dev Overlay listeners also ignore extension errors
      var origAddEventListener = window.addEventListener.bind(window);
      window.addEventListener = function(type, listener, options) {
        if ((type === "error" || type === "unhandledrejection") && typeof listener === "function") {
          var wrapped = function(evt) {
            if (handleErr(evt)) return;
            return listener.apply(this, arguments);
          };
          return origAddEventListener(type, wrapped, options);
        }
        return origAddEventListener(type, listener, options);
      };

      var origConsoleError = console.error.bind(console);
      console.error = function() {
        for (var i = 0; i < arguments.length; i++) {
          var arg = arguments[i];
          var stack = arg && arg.stack;
          var msg = arg && (arg.message || String(arg));
          if (isExtensionError(msg, "", stack)) {
            return;
          }
        }
        return origConsoleError.apply(console, arguments);
      };
    }

    // 2. Safe attribute cleaner for DOM nodes
    var isExtAttr = function(name) {
      return (
        name === "bis_skin_checked" ||
        name === "bis_register" ||
        name === "cz-shortcut-listen" ||
        name === "data-new-gr-c-s-check-loaded" ||
        name === "data-gr-ext-installed" ||
        name.indexOf("bis_") === 0 ||
        name.indexOf("__processed_") === 0
      );
    };

    var cleanElement = function(el) {
      if (!el || !el.removeAttribute) return;
      var attrs = el.attributes;
      if (!attrs) return;
      for (var i = attrs.length - 1; i >= 0; i--) {
        var attr = attrs[i];
        if (attr && isExtAttr(attr.name)) {
          el.removeAttribute(attr.name);
        }
      }
    };

    cleanElement(document.documentElement);

    if (typeof MutationObserver !== "undefined") {
      var observer = new MutationObserver(function(mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var m = mutations[i];
          if (m.type === "attributes" && m.attributeName && isExtAttr(m.attributeName)) {
            m.target.removeAttribute(m.attributeName);
          } else if (m.type === "childList" && m.addedNodes) {
            for (var j = 0; j < m.addedNodes.length; j++) {
              var node = m.addedNodes[j];
              if (node && node.nodeType === 1) cleanElement(node);
            }
          }
        }
      });
      observer.observe(document.documentElement, {
        attributes: true,
        childList: true,
        subtree: true
      });
    }
  } catch (e) {}
})();`;

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
          id="legalease-ext-cleanup"
          dangerouslySetInnerHTML={{ __html: EXTENSION_CLEANUP_SCRIPT }}
        />
      </head>
      <body
        className="flex min-h-full flex-col font-sans"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
