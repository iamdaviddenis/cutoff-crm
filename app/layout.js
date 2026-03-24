import "./globals.css";
import { getViewer } from "../lib/auth";
import Sidebar from "../components/sidebar";
import UserMenu from "../components/user-menu";

export const metadata = {
  title: "CutOff CRM — Command Center",
  description: "Customer Command Center built with Next.js + Supabase.",
};

export default async function RootLayout({ children }) {
  const viewer = await getViewer();

  if (!viewer) {
    return (
      <html lang="en">
        <body>
          <div className="auth-shell">{children}</div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body>
        <div className="shell">
          <Sidebar />
          <div className="main-wrap">
            <header className="topbar">
              <UserMenu viewer={viewer} />
            </header>
            <main className="main">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
