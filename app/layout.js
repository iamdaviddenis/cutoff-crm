import "./globals.css";
import { getViewer } from "../lib/auth";
import TopNav from "../components/topnav";
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
          <TopNav userMenu={<UserMenu viewer={viewer} />} />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
