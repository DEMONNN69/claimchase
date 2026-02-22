import { cn } from "@/lib/utils";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  inverted?: boolean;
  className?: string;
}

export function BrandLogo({ size = "md", inverted = false, className }: BrandLogoProps) {
  const fontSizeMap = {
    sm: "1.125rem",
    md: "1.375rem",
    lg: "2rem",
    xl: "3.25rem",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');

        .ac-logo {
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          display: inline-flex;
          align-items: center;
          cursor: default;
          user-select: none;
          text-decoration: none;
        }

        .ac-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.55em;
          height: 1.55em;
          border-radius: 0.32em;
          background: linear-gradient(145deg, #3b82f6 0%, #2563eb 100%);
          box-shadow: 0 2px 8px rgba(37,99,235,0.35), 0 0 0 1px rgba(37,99,235,0.15);
          flex-shrink: 0;
          position: relative;
          overflow: hidden;
          transition: box-shadow 0.2s ease, transform 0.2s ease;
        }

        .ac-icon::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(140deg, rgba(255,255,255,0.2) 0%, transparent 55%);
        }

        .ac-icon svg {
          width: 0.8em;
          height: 0.8em;
          position: relative;
          z-index: 1;
        }

        .ac-logo:hover .ac-icon {
          box-shadow: 0 4px 16px rgba(37,99,235,0.5), 0 0 0 1px rgba(37,99,235,0.25);
          transform: translateY(-1px);
        }

        .ac-wordmark {
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1;
          color: ${inverted ? "#ffffff" : "#111827"};
          margin-left: 0.28em;
          margin-right: 0.04em;
        }

        .ac-badge-wrap {
          display: inline-flex;
          align-items: flex-start;
          margin-top: -0.55em;
          margin-left: 0.06em;
        }

        .ac-badge {
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          font-weight: 700;
          font-size: 0.28em;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          line-height: 1;
          padding: 0.3em 0.55em;
          border-radius: 0.35em;
          color: #ffffff;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%);
          box-shadow:
            0 1px 5px rgba(37,99,235,0.45),
            inset 0 1px 0 rgba(255,255,255,0.18);
          position: relative;
          overflow: hidden;
          transition: box-shadow 0.2s ease, transform 0.2s ease;
        }

        .ac-badge::after {
          content: '';
          position: absolute;
          top: 0; left: -80%;
          width: 50%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
          animation: glint 3.5s ease-in-out infinite;
        }

        @keyframes glint {
          0%, 100% { left: -80%; }
          55%       { left: 130%; }
        }

        .ac-logo:hover .ac-badge {
          transform: translateY(-1px);
          box-shadow:
            0 3px 12px rgba(37,99,235,0.55),
            inset 0 1px 0 rgba(255,255,255,0.2);
        }
      `}</style>

      <div
        className={cn("ac-logo", className)}
        style={{ fontSize: fontSizeMap[size] }}
        role="img"
        aria-label="AmicusClaims AI"
      >
        <span className="ac-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 2.5L4.5 6v5.5C4.5 15.8 7.9 19.7 12 21.5c4.1-1.8 7.5-5.7 7.5-10V6L12 2.5z"
              fill="rgba(255,255,255,0.92)"
            />
            <path
              d="M9 12.5l2 2 4-4.5"
              stroke="#2563eb"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <span className="ac-wordmark">AmicusClaims</span>

        <span className="ac-badge-wrap">
          <span className="ac-badge">AI</span>
        </span>
      </div>
    </>
  );
}