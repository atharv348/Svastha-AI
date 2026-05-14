import { motion } from "framer-motion";
import { CheckCircle2, Clock, FileText, ExternalLink, ChevronDown, ChevronUp, Star, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export interface Scheme {
  id: string;
  name: string;
  description: string;
  benefit: string;
  eligibility: string;
  requiredDocuments: string[];
  matchScore: number;
  docsMatched: number;
  docsTotal: number;
  category: string;
  source: string;
  sourceUrl: string;
  applicationSteps: string[];
  state: string;
}

interface SchemeResultsProps {
  schemes: Scheme[];
  userDocs: string[];
  onAskAI: (scheme: Scheme) => void;
}

const SchemeResults = ({ schemes, userDocs, onAskAI }: SchemeResultsProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (schemes.length === 0) return null;

  return (
    <section className="px-0 py-0">
      <div className="mx-auto max-w-6xl rounded-2xl border border-border/60 bg-card p-6 md:p-7">
        <div className="mb-6">
          <h2 className="text-3xl font-heading font-bold text-foreground mb-2">
            {schemes.length} Schemes Found
          </h2>
          <p className="text-muted-foreground">
            Ranked by ease of access. Your quick wins are at the top.
          </p>
        </div>

        <div className="space-y-4">
          {schemes.map((scheme, index) => {
            const expanded = expandedId === scheme.id;
            return (
              <motion.div
                key={scheme.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className="bg-card border border-border rounded-xl shadow-card overflow-hidden"
              >
                <div
                  className="p-5 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedId(expanded ? null : scheme.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="outline" className="bg-sahayak-teal-light text-primary border-primary/30 text-xs">
                          {scheme.category}
                        </Badge>
                        {scheme.state !== "All India" && (
                          <Badge variant="outline" className="text-xs">
                            {scheme.state}
                          </Badge>
                        )}
                        {index === 0 && (
                          <Badge className="bg-sahayak-orange text-accent-foreground text-xs">
                            <Star className="w-3 h-3 mr-1" /> Quick Win
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-display font-semibold text-foreground mb-1">
                        {scheme.name}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{scheme.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-primary font-bold text-lg">
                        <CheckCircle2 className="w-5 h-5" />
                        {scheme.matchScore}%
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {scheme.docsMatched}/{scheme.docsTotal} docs ready
                      </div>
                      {expanded ? <ChevronUp className="w-4 h-4 mt-2 text-muted-foreground mx-auto" /> : <ChevronDown className="w-4 h-4 mt-2 text-muted-foreground mx-auto" />}
                    </div>
                  </div>
                </div>

                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="border-t border-border p-5 space-y-4"
                  >
                    <div className="bg-sahayak-green-light rounded-lg p-4">
                      <div className="flex items-center gap-2 text-sahayak-green font-semibold mb-1">
                        <IndianRupee className="w-4 h-4" /> Benefit
                      </div>
                      <p className="text-foreground text-sm">{scheme.benefit}</p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-foreground mb-1 text-sm">Eligibility Criteria</h4>
                      <p className="text-sm text-muted-foreground">{scheme.eligibility}</p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-foreground mb-2 text-sm">Required Documents</h4>
                      <div className="flex flex-wrap gap-2">
                        {scheme.requiredDocuments.map((doc) => {
                          const hasDoc = userDocs.includes(doc);
                          return (
                            <span
                              key={doc}
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                                hasDoc
                                  ? "bg-sahayak-green-light text-sahayak-green"
                                  : "bg-sahayak-orange-light text-sahayak-orange"
                              }`}
                            >
                              {hasDoc ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              {doc}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-foreground mb-2 text-sm">How to Apply</h4>
                      <ol className="space-y-1">
                        {scheme.applicationSteps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <a
                        href={scheme.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <FileText className="w-3 h-3" />
                        Source: {scheme.source}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <Button
                        size="sm"
                        onClick={() => onAskAI(scheme)}
                        className="bg-primary text-primary-foreground"
                      >
                        Ask AI about this scheme
                      </Button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SchemeResults;
