'use client'
import Sidebar from "../_components/sidebar";
import Header from "../_components/header";
import { useSidebar } from '@/context/SidebarContext';

export default function AdminLayout({ children }) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
      ? "lg:ml-[290px]"
      : "lg:ml-[90px]";

  return (
    <div className="min-h-full flex-1 flex">
      <Sidebar />
      <div className={`flex-1 transition-all  duration-300 ease-in-out ${mainContentMargin} bg-secondary/95 min-h-full`}>
        <Header />
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
