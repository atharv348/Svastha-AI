import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function MediRush() {
  const navigate = useNavigate();

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex flex-col">
      {/* Header with Back Button */}
      <div className="absolute top-4 left-4 z-50">
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={() => navigate("/")}
          className="bg-white/10 backdrop-blur-md hover:bg-white/20 border-white/20 text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      {/* Game Iframe */}
      <iframe
        src="/games/medirush/index.html"
        className="w-full h-full border-none"
        title="MediRush Game"
        allow="autoplay; fullscreen; keyboard"
      />
    </div>
  );
}
