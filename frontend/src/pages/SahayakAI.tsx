import { useState } from "react";
import { Shield } from "lucide-react";
import EligibilityForm, { EligibilityProfile } from "@/components/sahayak/EligibilityForm";
import SchemeSearch from "@/components/sahayak/SchemeSearch";
import SchemeResults, { Scheme } from "@/components/sahayak/SchemeResults";
import AIChatAssistant from "@/components/sahayak/AIChatAssistant";
import { matchSchemes, searchSchemes } from "@/data/sahayakSchemes";

const SahayakAI = () => {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [userDocs, setUserDocs] = useState<string[]>([]);
  const [chatContext, setChatContext] = useState<string | undefined>();

  const handleEligibilitySubmit = (profile: EligibilityProfile) => {
    const matched = matchSchemes(profile);
    setSchemes(matched);
    setUserDocs(profile.documentsAvailable);
  };

  const handleSearch = (query: string, category: string) => {
    const results = searchSchemes(query, category);
    setSchemes(results);
    setUserDocs([]);
  };

  const handleAskAI = (scheme: Scheme) => {
    setChatContext(
      `Tell me about the "${scheme.name}" scheme. What is the eligibility, benefits, and how to apply? Source: ${scheme.source}`
    );
  };

  return (
    <div className="flex-1 bg-background px-4 pt-3 pb-1 md:px-8 md:pt-4 md:pb-2">
      <div className="mx-auto max-w-6xl space-y-2">
        <section className="rounded-2xl border border-border/50 bg-card p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">SahayakAI</p>
              <h1 className="mt-1 text-2xl font-heading font-bold text-foreground md:text-4xl">
                Disability Scheme Navigator
              </h1>
              <p className="mt-1.5 max-w-3xl text-muted-foreground">
                Find, compare, and apply for disability support schemes with a guided assistant.
              </p>
            </div>

            <button
              type="button"
              className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
            >
              <Shield className="h-4 w-4" />
              Verified Sources
            </button>
          </div>
        </section>

        <EligibilityForm onSubmit={handleEligibilitySubmit} />

        <SchemeSearch onSearch={handleSearch} />

        <SchemeResults schemes={schemes} userDocs={userDocs} onAskAI={handleAskAI} />

        <AIChatAssistant initialContext={chatContext} />
      </div>
    </div>
  );
};

export default SahayakAI;
