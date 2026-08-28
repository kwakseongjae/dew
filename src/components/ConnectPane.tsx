import { LoaderCircle } from "lucide-react";
import { Dewdrop } from "@/components/Dewdrop";
import { Button } from "@/components/ui/button";
import { lookFromSettings, type DewdropLook } from "@/lib/dewdrop";

type ConnectPaneProps = {
  scanning: boolean;
  error: string | null;
  inTauri: boolean;
  look?: DewdropLook;
  onConnect: () => Promise<void>;
};

export const ConnectPane = ({ scanning, error, inTauri, look, onConnect }: ConnectPaneProps) => {
  const handleConnect = () => {
    void onConnect();
  };

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <Dewdrop look={lookFromSettings(look)} mood={scanning ? "live" : "idle"} size={64} />
      <h1 className="mt-4 text-[28px] font-semibold leading-none tracking-tight">Dew</h1>
      <p className="mt-3 max-w-[420px] text-[15px] leading-6 text-white/85">
        Tap once to find coding agents already on this machine and connect them.
      </p>
      <Button
        variant="mint"
        size="lg"
        className="mt-5 min-w-[220px]"
        aria-label="Scan and connect local coding agents"
        disabled={scanning}
        onClick={handleConnect}
      >
        {scanning ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Scanning this machine…
          </>
        ) : (
          "Scan and connect"
        )}
      </Button>
      <p className="mt-3 max-w-[380px] text-[12px] leading-5 text-white/60">
        No terminal. No brew. Dew looks for Cursor, Claude Code, Codex, OpenCode, and other local
        CLIs, then follows what it finds.
      </p>
      {!inTauri ? (
        <p className="mt-2 text-[11px] text-white/50">
          This browser preview cannot see local processes. The installed Dew app can.
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-mint">{error}</p> : null}
    </div>
  );
};
