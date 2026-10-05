import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/lib/auth-context";

export const metadata = {
  title: "Vaultly",
  description: "Secure password vault frontend",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('vaultly-theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('theme-dark', 'dark');
                } else {
                  document.documentElement.classList.remove('theme-dark', 'dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
