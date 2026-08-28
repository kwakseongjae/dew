import { cn } from "@/lib/utils";

type DewdropProps = {
  mood: "idle" | "live";
  className?: string;
};

export const Dewdrop = ({ mood, className }: DewdropProps) => (
  <div
    className={cn("dew-fidget pointer-events-none relative grid place-items-center", className)}
    aria-hidden="true"
  >
    <svg viewBox="0 0 64 64" className="h-full w-full">
      <ellipse cx="24" cy="16" rx="16" ry="9" fill="white" opacity="0.32" />
      <g className="dew-eyes">
        <g className="dew-eye" style={{ transformOrigin: "22px 30px" }}>
          <ellipse cx="22" cy="30" rx="5.1" ry="6.6" fill="#163044" />
          <circle className="dew-glance" cx="23.6" cy="28.2" r="1.8" fill="white" />
          {mood === "live" ? (
            <circle cx="20.4" cy="32.4" r="1.05" fill="#c9f5dc" />
          ) : (
            <circle cx="20.6" cy="32.2" r="0.8" fill="#c9f5dc" opacity="0.7" />
          )}
        </g>
        <g className="dew-eye" style={{ transformOrigin: "42px 30px" }}>
          <ellipse cx="42" cy="30" rx="5.1" ry="6.6" fill="#163044" />
          <circle className="dew-glance" cx="43.6" cy="28.2" r="1.8" fill="white" />
          {mood === "live" ? (
            <circle cx="40.4" cy="32.4" r="1.05" fill="#c9f5dc" />
          ) : (
            <circle cx="40.6" cy="32.2" r="0.8" fill="#c9f5dc" opacity="0.7" />
          )}
        </g>
      </g>
      <path
        d="M26 43.5 Q32 47.2 38 43.5"
        stroke="#c9f5dc"
        strokeWidth="1.7"
        fill="none"
        strokeLinecap="round"
        opacity={mood === "live" ? 0.95 : 0.7}
      />
    </svg>
  </div>
);
