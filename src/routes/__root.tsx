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
          <Toaster position="top-center" />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
