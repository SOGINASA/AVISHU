export default function BottomNav({ items }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] pointer-events-none">
      <div className="max-w-[430px] mx-auto pointer-events-auto">
        <div className="bg-black/96 backdrop-blur-md border-t border-white/8">
          <div className="flex items-stretch">
            {items.map(item => (
              <button
                key={item.id}
                onClick={item.onClick}
                className="flex-1 flex flex-col items-center justify-center py-5 gap-1.5 relative group"
              >
                {item.active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-px bg-white" />
                )}
                <span className={`transition-colors duration-150 ${item.active ? 'text-white' : 'text-white/22 group-hover:text-white/50'}`}>
                  {item.icon}
                </span>
                <span className={`text-[7.5px] font-bold uppercase tracking-[0.18em] transition-colors duration-150 leading-none ${item.active ? 'text-white' : 'text-white/22 group-hover:text-white/50'}`}>
                  {item.label}
                </span>
                {item.badge > 0 && (
                  <div className="absolute top-2.5 right-[calc(50%-14px)] w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center">
                    <span className="text-[7px] font-black text-black leading-none">{item.badge > 9 ? '9+' : item.badge}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
          <div style={{ height: 'env(safe-area-inset-bottom)' }} />
        </div>
      </div>
    </div>
  );
}

export const Icons = {
  home: (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
      <path d="M1 8L8.5 1.5L16 8" stroke="currentColor" strokeWidth="0.75" strokeLinecap="square"/>
      <path d="M3 6.5V15.5H7V11h3v4.5h4V6.5" stroke="currentColor" strokeWidth="0.75" strokeLinecap="square"/>
    </svg>
  ),
  grid: (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
      <rect x="0.5" y="0.5" width="6.5" height="6.5" stroke="currentColor" strokeWidth="0.75"/>
      <rect x="10" y="0.5" width="6.5" height="6.5" stroke="currentColor" strokeWidth="0.75"/>
      <rect x="0.5" y="10" width="6.5" height="6.5" stroke="currentColor" strokeWidth="0.75"/>
      <rect x="10" y="10" width="6.5" height="6.5" stroke="currentColor" strokeWidth="0.75"/>
    </svg>
  ),
  bag: (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
      <path d="M1.5 5.5h14l-1.8 10H3.3L1.5 5.5z" stroke="currentColor" strokeWidth="0.75"/>
      <path d="M5.5 5.5V4a3 3 0 016 0v1.5" stroke="currentColor" strokeWidth="0.75"/>
    </svg>
  ),
  list: (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
      <rect x="1" y="1" width="15" height="15" stroke="currentColor" strokeWidth="0.75"/>
      <path d="M4.5 5.5h8M4.5 8.5h8M4.5 11.5h5" stroke="currentColor" strokeWidth="0.75" strokeLinecap="square"/>
    </svg>
  ),
  person: (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
      <circle cx="8.5" cy="5.5" r="3" stroke="currentColor" strokeWidth="0.75"/>
      <path d="M1 16.5c0-4.142 3.358-7.5 7.5-7.5s7.5 3.358 7.5 7.5" stroke="currentColor" strokeWidth="0.75" strokeLinecap="square"/>
    </svg>
  ),
  inbox: (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
      <rect x="1" y="6" width="15" height="10" stroke="currentColor" strokeWidth="0.75"/>
      <path d="M1 6l3-5h9l3 5" stroke="currentColor" strokeWidth="0.75"/>
      <path d="M5.5 11h6" stroke="currentColor" strokeWidth="0.75" strokeLinecap="square"/>
    </svg>
  ),
  scissors: (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
      <circle cx="4" cy="4" r="2.5" stroke="currentColor" strokeWidth="0.75"/>
      <circle cx="4" cy="13" r="2.5" stroke="currentColor" strokeWidth="0.75"/>
      <path d="M6.5 4L16 13M6.5 13L16 4" stroke="currentColor" strokeWidth="0.75"/>
    </svg>
  ),
  chart: (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
      <path d="M1 16h15" stroke="currentColor" strokeWidth="0.75" strokeLinecap="square"/>
      <path d="M3 16V9M6.5 16V6M10 16V10M13.5 16V4" stroke="currentColor" strokeWidth="0.75" strokeLinecap="square"/>
    </svg>
  ),
};
