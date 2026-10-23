import { createRootRoute, HeadContent, Outlet, Scripts, useRouterState } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { Announcement, Footer, Header } from "@/components/site/header";
import { getChrome } from "@/lib/shop/server";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  beforeLoad: async () => ({ chrome: await getChrome() }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Aznik Crochets" },
      { name: "description", content: "Dreamy handmade crochet from Aznik Crochets. Shop, design your own, or receive a little mystery. Prices in PKR." },
      { name: "theme-color", content: "#C84B63" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,620;1,9..144,520&family=Outfit:wght@400;500;600&display=swap",
      },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: Root,
});

function Root() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const admin = path.startsWith("/admin");
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          {admin ? (
            <Outlet />
          ) : (
            <>
              <Announcement />
              <Header />
              <Outlet />
              <Footer />
            </>
          )}
          {!admin && (
            <a
          
href="https://wa.me/923195581899?text=Hi!%20I%20would%20like%20to%20place%20an%20order%20with%20Aznik%20Crochets."

              target="_blank"
              rel="noopener noreferrer"
              aria-label="Order on WhatsApp"
              className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#C84B63] text-white shadow-lg hover:bg-[#A93B52] transition"
            >
              <svg viewBox="0 0 32 32" className="h-8 w-8" fill="currentColor">
                <path d="M16 2C8.3 2 2 8.3 2 16c0 2.5.7 4.8 1.9 6.8L2 30l7.4-1.9c1.9 1 4.1 1.6 6.6 1.6 7.7 0 14-6.3 14-14S23.7 2 16 2zm0 25.5c-2.2 0-4.2-.6-6-1.6l-.4-.2-4.4 1.1 1.2-4.3-.2-.4c-1.1-1.8-1.7-3.8-1.7-5.9 0-6.4 5.2-11.6 11.6-11.6S27.6 9.6 27.6 16 22.4 27.5 16 27.5zm6.3-8.7c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0c-.3-.2-1.3-.5-2.5-1.5-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.6.1-.1.3-.4.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.7-1.8-1-2.4-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.8 4.4 3.8 1.6.6 2.2.7 3 .6.5-.1 1.9-.8 2.2-1.5.3-.7.3-1.3.2-1.5-.1-.2-.3-.3-.6-.5z"/>
              </svg>
            </a>
          )}
          <Toaster position="top-center" />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
