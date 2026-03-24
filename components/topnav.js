"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor"/>
        <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor"/>
        <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor"/>
        <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor"/>
      </svg>
    ),
  },
  {
    label: "Interactions",
    href: "/interactions",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M14 2H2a1 1 0 00-1 1v8a1 1 0 001 1h2v2l3-2h7a1 1 0 001-1V3a1 1 0 00-1-1z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: "Tasks",
    href: "/tasks",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M4.5 8l2.5 2.5 4-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: "Customers",
    href: "/customers",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
];

export default function TopNav({ userMenu }) {
  const pathname = usePathname();

  return (
    <header className="topnav">
      <div className="topnav-inner">
        <Link href="/dashboard" className="mr-10 flex shrink-0 items-center gap-3 no-underline">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.18)] ring-1 ring-white/30">
            <Image
              src="/cutoff-logo.png"
              alt="CutOff CRM"
              width={28}
              height={28}
              className="object-contain"
              priority
            />
          </span>
          <span className="flex flex-col justify-center">
            <span className="topnav-brand-name">CutOff CRM</span>
            <span className="topnav-brand-sub">Command Center</span>
          </span>
        </Link>

        <nav className="topnav-links">
          {NAV.map(({ label, href, icon }) => (
            <Link
              key={href}
              href={href}
              className={`topnav-link ${pathname === href || (href !== "/dashboard" && pathname.startsWith(href)) ? "active" : ""}`}
            >
              {icon}
              {label}
            </Link>
          ))}
        </nav>

        <div className="topnav-end">{userMenu}</div>
      </div>
    </header>
  );
}
