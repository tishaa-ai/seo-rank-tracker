import { Link } from "react-router-dom";
import { Target, ArrowRightIcon } from "lucide-react";

export default function ComingSoon() {
    return (
        <div className="min-h-screen pt-16 md:pt-24 bg-background flex items-center justify-center px-4">
            <div className="glass rounded-2xl p-10 sm:p-12 text-center max-w-md w-full">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-5">
                    <Target size={26} />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-medium uppercase bg-accent/10 border border-accent/15 text-accent">Coming soon</span>
                <h1 className="text-2xl font-medium text-foreground mt-4 mb-2">Rank Tracker</h1>
                <p className="text-sm text-muted-foreground mb-8">Track your keyword positions on Google over time. This feature is on the way. In the meantime, run an SEO audit.</p>
                <Link to="/analyze" className="bg-primary px-5 py-2.5 rounded-full text-sm inline-flex items-center gap-2 hover:opacity-90 transition-opacity" style={{ color: "var(--background)" }}>
                    Analyze a website <ArrowRightIcon size={16} />
                </Link>
            </div>
        </div>
    );
}
