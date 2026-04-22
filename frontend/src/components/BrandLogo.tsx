import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  inverted?: boolean;
  className?: string;
}

export function BrandLogo({ size = "md", inverted = false, className }: BrandLogoProps) {
  const heightMap = {
    sm: "28px",
    md: "36px",
    lg: "52px",
    xl: "80px",
  };

  if (inverted) {
    return (
      <div className={cn("inline-flex rounded-xl bg-white backdrop-blur-sm px-3 py-1 border border-white/20", className)}>
        <img
          src={logo}
          alt="AmicusClaims AI"
          style={{ height: heightMap[size], width: "auto", display: "block" }}
        />
      </div>
    );
  }

  return (
    <img
      src={logo}
      alt="AmicusClaims AI"
      className={cn(className)}
      style={{ height: heightMap[size], width: "auto", display: "inline-block" }}
    />
  );
}