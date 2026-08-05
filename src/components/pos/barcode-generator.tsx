import React from "react";

interface BarcodeGeneratorProps {
  value: string;
  width?: number;
  height?: number;
  className?: string;
  showText?: boolean;
}

// Generate simple deterministic barcode pattern bars for any code string
export const BarcodeGenerator: React.FC<BarcodeGeneratorProps> = ({
  value,
  width = 2,
  height = 50,
  className = "",
  showText = true,
}) => {
  const code = value || "000000000000";

  // Create deterministic bar widths based on character charCodes
  const bars = React.useMemo(() => {
    const pattern: number[] = [1, 1, 0, 1]; // Start pattern
    for (let i = 0; i < code.length; i++) {
      const charCode = code.charCodeAt(i);
      const binStr = (charCode * 31).toString(2).padStart(8, "0");
      for (let j = 0; j < binStr.length; j++) {
        pattern.push(binStr[j] === "1" ? 1 : 0);
      }
    }
    pattern.push(1, 0, 1, 1); // Stop pattern
    return pattern;
  }, [code]);

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg
        height={height}
        viewBox={`0 0 ${bars.length * width} ${height}`}
        className="max-w-full"
        style={{ shapeRendering: "crispEdges" }}
      >
        <rect x={0} y={0} width={bars.length * width} height={height} fill="#ffffff" />
        {bars.map((bar, index) => {
          if (bar === 1) {
            return (
              <rect
                key={index}
                x={index * width}
                y={0}
                width={width}
                height={height}
                fill="#000000"
              />
            );
          }
          return null;
        })}
      </svg>
      {showText && (
        <span className="mt-1 font-mono text-[11px] font-semibold tracking-widest text-slate-700">
          {code}
        </span>
      )}
    </div>
  );
};
