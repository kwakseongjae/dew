import { useState } from "react";
import { Dewdrop } from "@/components/Dewdrop";
import { Button } from "@/components/ui/button";
import { lookFromSettings } from "@/lib/dewdrop";
import { useDew } from "@/lib/useDew";

export const DewdropPlayground = () => {
  const dew = useDew();
  const [morph, setMorph] = useState(false);
  const [spinNonce, setSpinNonce] = useState(0);
  const look = lookFromSettings(dew.settings);

  const handleMorph = () => {
    setMorph((value) => !value);
  };

  const handleSpin = () => {
    setSpinNonce((value) => value + 1);
  };

  return (
    <div className="sky-backdrop relative min-h-screen overflow-hidden text-white">
      <header className="absolute left-6 top-6 z-10 max-w-md">
        <p className="text-sm font-medium">Dewdrop playground (debug)</p>
        <p className="mt-1 text-xs text-white/70">
          Oversized motion sandbox — not the product. The real dewdrop is a 64px desktop orb. Open{" "}
          <span className="text-white/90">/?demo=1</span> to see the tray icon and glass card.
        </p>
      </header>
      <Dewdrop
        look={look}
        mood={morph ? "idle" : "live"}
        morphTarget={morph ? 1 : 0}
        followPointer
        lookAtDocument
        spinNonce={spinNonce}
        className="absolute inset-0 h-screen w-screen"
      />
      <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-wrap justify-center gap-2">
        <Button variant="mint" size="md" onClick={handleMorph} aria-pressed={morph}>
          {morph ? "Settle idle" : "Morph to !"}
        </Button>
        <Button variant="glass" size="md" onClick={handleSpin} aria-label="Roll the dewdrop">
          Roll
        </Button>
      </div>
    </div>
  );
};
