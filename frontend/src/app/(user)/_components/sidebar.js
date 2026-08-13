'use client'
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaUtensils } from 'react-icons/fa';
import {
    PlusIcon,
    ChevronDoubleLeftIcon,
    ChevronDoubleRightIcon,
    UserCircleIcon,
    ChatBubbleLeftRightIcon,
    SparklesIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import { useChatContext } from './ChatProvider';

const NAV_LINKS = [
    { href: '/', label: 'Chat', icon: ChatBubbleLeftRightIcon },
    { href: '/recommend', label: 'Recommend', icon: SparklesIcon },
    { href: '/search', label: 'Search', icon: MagnifyingGlassIcon },
];

export default function Sidebar({ historySlot }) {
    const [collapsed, setCollapsed] = useState(false);
    const { clearHistory } = useChatContext();
    const { status } = useSession();
    const pathname = usePathname();

    return (
        <aside
            data-collapsed={collapsed}
            className={`${collapsed ? 'w-20' : 'w-72'} group shrink-0 h-screen sticky top-0 bg-primary text-white flex flex-col border-r border-primary/45 transition-all duration-200`}
        >
            {/* Logo + collapse toggle */}
            <div className="flex items-center gap-3 px-4 py-5">
                <div className="w-9 h-9 bg-secondary rounded-xl flex items-center justify-center shrink-0">
                    <FaUtensils className="text-primary" />
                </div>
                {!collapsed && (
                    <span className="text-secondary font-bold text-lg truncate">FoodieAI</span>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    className="ml-auto p-1.5 rounded-lg hover:bg-secondary text-secondary hover:text-primary-dark shrink-0"
                >
                    {collapsed ? (
                        <ChevronDoubleRightIcon className="w-4 h-4" />
                    ) : (
                        <ChevronDoubleLeftIcon className="w-4 h-4" />
                    )}
                </button>
            </div>

            {/* Chat / Recommend / Search */}
            <div className="px-3 flex flex-col gap-1">
                {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                    <Link
                        key={href}
                        href={href}
                        title={label}
                        className={`flex items-center gap-2 rounded-xl text-sm font-medium py-2.5 transition-colors ${collapsed ? 'justify-center px-0' : 'px-3'} ${pathname === href ? 'bg-secondary text-button-primary' : 'hover:bg-secondary hover:text-button-primary'
                            }`}
                    >
                        <Icon className="w-4 h-4 shrink-0" />
                        {!collapsed && label}
                    </Link>
                ))}
            </div>

            {/* New chat */}
            <div className="px-3 mt-1">
                <button
                    onClick={clearHistory}
                    title="New chat"
                    className={`w-full flex items-center gap-2 rounded-xl hover:bg-secondary hover:text-button-primary text-sm font-medium py-2.5 transition-colors ${collapsed ? 'justify-center px-0' : 'px-3'}`}>
                    <PlusIcon className="w-4 h-4 shrink-0" />
                    {!collapsed && 'New chat'}
                </button>
            </div>

            {/* History — only rendered for logged-in users, see (user)/layout.js */}
            {historySlot ? (
                <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                    {!collapsed && (
                        <p className="px-2 pb-2 text-xs font-semibold text-secondary uppercase tracking-wide">
                            History
                        </p>
                    )}
                    {historySlot}
                </div>
            ) : (
                <div className="flex-1" />
            )}

            {/* Account */}
            <div className="border-t border-secondary/30 p-3 ">
                <Link
                    href={status === 'authenticated' ? '/profile' : '/login'}
                    title="My Account"
                    className={`w-full flex items-center gap-2.5 rounded-lg hover:bg-secondary hover:text-button-primary py-2 transition-colors ${collapsed ? 'justify-center px-0' : 'px-2'}`}
                >
                    <UserCircleIcon className="w-7 h-7  shrink-0" />
                    {!collapsed && (
                        <span className="text-sm font-medium truncate">My Account</span>
                    )}
                </Link>
            </div>
        </aside>
    );
}
