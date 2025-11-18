import { useState } from "react";
import { ChevronDown, ChevronRight, FileText, Zap, Bug, BookOpen } from "lucide-react";
import { releases, documentation } from "@/data/releases";
import { cn } from "@/lib/utils";

export default function Releases() {
  const [expandedRelease, setExpandedRelease] = useState<string | null>(null);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"releases" | "docs">("releases");

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "feature":
        return <Zap className="h-5 w-5 text-yellow-500" />;
      case "fix":
        return <Bug className="h-5 w-5 text-red-500" />;
      case "perf":
        return <Zap className="h-5 w-5 text-green-500" />;
      case "docs":
        return <BookOpen className="h-5 w-5 text-blue-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "feature":
        return "Feature";
      case "fix":
        return "Fix";
      case "perf":
        return "Performance";
      case "docs":
        return "Docs";
      default:
        return "Update";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 text-slate-900 dark:text-white">
            Releases & Documentation
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Stay updated with the latest features, fixes, and comprehensive documentation
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab("releases")}
            className={cn(
              "px-6 py-3 font-semibold border-b-2 transition-colors",
              activeTab === "releases"
                ? "border-primary text-primary"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            Releases
          </button>
          <button
            onClick={() => setActiveTab("docs")}
            className={cn(
              "px-6 py-3 font-semibold border-b-2 transition-colors",
              activeTab === "docs"
                ? "border-primary text-primary"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            Documentation
          </button>
        </div>

        {/* Releases Tab */}
        {activeTab === "releases" && (
          <div className="space-y-4">
            {releases.map((release) => (
              <div
                key={release.version}
                className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
              >
                <button
                  onClick={() =>
                    setExpandedRelease(
                      expandedRelease === release.version ? null : release.version
                    )
                  }
                  className="w-full p-6 text-left flex items-start justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex-1 flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {getTypeIcon(release.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                          {release.version}
                        </h3>
                        <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs font-semibold rounded">
                          {getTypeLabel(release.type)}
                        </span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {new Date(release.date).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {release.title}
                      </h4>
                      <p className="text-slate-600 dark:text-slate-400">
                        {release.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    {expandedRelease === release.version ? (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {expandedRelease === release.version && (
                  <div className="px-6 pb-6 border-t border-slate-200 dark:border-slate-700">
                    <h5 className="font-semibold text-slate-900 dark:text-white mb-3">
                      What's Changed:
                    </h5>
                    <ul className="space-y-2">
                      {release.changes.map((change, idx) => (
                        <li
                          key={idx}
                          className="flex gap-3 text-slate-600 dark:text-slate-400"
                        >
                          <span className="text-primary font-bold flex-shrink-0 mt-1">
                            •
                          </span>
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Documentation Tab */}
        {activeTab === "docs" && (
          <div className="space-y-4">
            {documentation.map((doc) => (
              <div
                key={doc.id}
                className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedDoc(expandedDoc === doc.id ? null : doc.id)
                  }
                  className="w-full p-6 text-left flex items-start justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <BookOpen className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {doc.title}
                      </h3>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">
                      {doc.description}
                    </p>
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    {expandedDoc === doc.id ? (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {expandedDoc === doc.id && (
                  <div className="px-6 pb-6 border-t border-slate-200 dark:border-slate-700 space-y-6">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                        {doc.content}
                      </p>
                    </div>

                    {doc.subsections && doc.subsections.length > 0 && (
                      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        {doc.subsections.map((subsection) => (
                          <div key={subsection.id}>
                            <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                              {subsection.title}
                            </h4>
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded p-4 overflow-auto">
                              <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words font-mono">
                                {subsection.content}
                              </pre>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
