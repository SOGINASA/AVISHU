// Fabric pattern background SVG
export const FabricPatternBg = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="twill" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M0 20 L20 0" stroke="#c8a96e" strokeWidth="0.8"/>
        <path d="M-5 15 L5 5" stroke="#c8a96e" strokeWidth="0.4"/>
        <path d="M15 25 L25 15" stroke="#c8a96e" strokeWidth="0.4"/>
      </pattern>
      <pattern id="grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
        <rect width="60" height="60" fill="url(#twill)"/>
        <rect width="60" height="60" fill="none" stroke="#c8a96e" strokeWidth="0.3" strokeDasharray="2 8"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)"/>
  </svg>
);

export const StitchLine = ({ className = "" }) => (
  <div className={`flex items-center gap-[5px] ${className}`}>
    {[...Array(24)].map((_, i) => (
      <div key={i} className="w-2 h-[1.5px] bg-current rounded-full opacity-40" />
    ))}
  </div>
);
