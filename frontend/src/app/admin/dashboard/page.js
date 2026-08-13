'use client'
import { useEffect } from "react";
import { UserGroupIcon, ChatBubbleLeftRightIcon, CircleStackIcon } from "@heroicons/react/24/solid";
import { useAdminStatsData } from "@/hooks/useAdminStats";

function StatTile({ icon: Icon, label, value, badge }) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl">
                <Icon className="text-primary-dark size-6" />
            </div>
            <div className="flex items-end justify-between mt-5">
                <div>
                    <span className="text-md text-primary">{label}</span>
                    <h4 className="mt-2 font-bold text-primary-dark text-3xl">{value}</h4>
                </div>
                {badge}
            </div>
        </div>
    );
}

export default function AdminHome() {
    const { stats, isLoading, error, getStats } = useAdminStatsData();

    useEffect(() => {
        getStats();
    }, [getStats]);

    return (
        <div>
            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
                <StatTile
                    icon={UserGroupIcon}
                    label="Users"
                    value={isLoading && !stats ? '…' : stats?.user_count ?? 0}
                />
                <StatTile
                    icon={ChatBubbleLeftRightIcon}
                    label="Chat sessions"
                    value={isLoading && !stats ? '…' : stats?.session_count ?? 0}
                />
                <StatTile
                    icon={CircleStackIcon}
                    label="RAG index"
                    value={isLoading && !stats ? '…' : (stats?.index_ready ? 'Ready' : 'Not ready')}
                    badge={
                        stats && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 justify-center gap-1 rounded-full font-medium text-sm ${stats.index_ready ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                <span className={`w-2 h-2 rounded-full ${stats.index_ready ? 'bg-green-500' : 'bg-amber-500'}`} />
                            </span>
                        )
                    }
                />
            </div>
        </div>
    );
}
