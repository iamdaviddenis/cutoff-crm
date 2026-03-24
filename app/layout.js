import Link from "next/link";
import "./globals.css";
import { getViewer } from "../lib/auth";

export const metadata = {
  title: "CutOff CRM",
  description: "Call intelligence and task management CRM built with Next.js + Supabase.",
};

export default async function RootLayout({ children }) {
  const viewer = await getViewer();

  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="topbar">
            <div>
              <p className="eyebrow">CutOff CRM</p>
              <h1 className="brand">Call Intelligence & Task Management</h1>
            </div>

            <nav className="nav">
              <Link href="/calls/new">Log call</Link>
              <Link href="/calls">Calls</Link>
              <Link href="/tasks">Tasks</Link>
              <Link href="/admin">Admin</Link>
            </nav>

            <div className="viewer">
              {viewer ? (
                <>
                  <strong>{viewer.fullName}</strong>
                  <span>{viewer.role}</span>
                </>
              ) : (
                <Link href="/sign-in">Sign in</Link>
              )}
            </div>
          </header>

          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
