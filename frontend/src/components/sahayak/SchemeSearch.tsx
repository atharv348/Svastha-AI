import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SchemeSearchProps {
  onSearch: (query: string, category: string) => void;
}

const CATEGORIES = [
  "All Categories",
  "Education & Scholarship",
  "Employment & Skill",
  "Financial Assistance",
  "Healthcare",
  "Housing",
  "Transport & Travel",
  "Legal Rights",
  "Assistive Devices",
];

const SchemeSearch = ({ onSearch }: SchemeSearchProps) => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All Categories");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query, category);
  };

  return (
    <section id="scheme-search" className="px-0 py-0">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-border/60 bg-card p-4 md:p-5">
          <div className="mb-2">
            <h2 className="text-2xl font-heading font-bold text-foreground md:text-3xl">Search Government Schemes</h2>
            <p className="mt-1 text-muted-foreground">
              Search disability welfare schemes by keyword and category.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. scholarship for visually impaired in Maharashtra"
              className="h-11 rounded-xl pl-10 text-base"
            />
          </div>
          <div className="flex gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-11 w-[180px] rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" size="lg" className="h-11 rounded-xl bg-primary px-6 text-primary-foreground">
              Search
            </Button>
          </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default SchemeSearch;
