export default function HistorySkeleton() {
    return (
        <div className="space-y-1 animate-pulse">
            {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg py-2 px-2 group-data-[collapsed=true]:justify-center group-data-[collapsed=true]:px-0"
                >
                    <div className="w-4 h-4 rounded-full bg-secondary/30 shrink-0" />
                    <div className="h-3 flex-1 rounded bg-secondary/30 group-data-[collapsed=true]:hidden" />
                </div>
            ))}
        </div>
    );
}
