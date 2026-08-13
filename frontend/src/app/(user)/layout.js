import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Header from "./_components/header";
import Sidebar from "./_components/sidebar";
import HistoryList from "./_components/HistoryList";
import HistorySkeleton from "./_components/HistorySkeleton";
import ChatProvider from "./_components/ChatProvider";

export default async function UserLayout({ children }) {
  const session = await getServerSession(authOptions);

  return (
    <ChatProvider>
      <div className="min-h-full flex flex-1">
        <Sidebar
          historySlot={
            session ? (
              <Suspense fallback={<HistorySkeleton />}>
                <HistoryList />
              </Suspense>
            ) : null
          }
        />
        <div className="flex flex-col flex-1 min-w-0">
          <Header />
          {children}
        </div>
      </div>
    </ChatProvider>
  );
}
