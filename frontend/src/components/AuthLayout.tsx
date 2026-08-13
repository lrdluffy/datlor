import React from 'react';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-gradient-to-br from-accent/10 via-white to-fuchsia-100">
      {/* Ambient gradient mesh — signature background, pushed up for more visible contrast */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-gradient-to-br from-accent to-violet-500 opacity-40 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-gradient-to-tr from-fuchsia-500 to-accent opacity-30 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-gradient-to-br from-cyan-400 to-accent opacity-20 blur-3xl" />
      </div>

      {/* Gradient border wrapper — thin bright ring around the card */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl p-[1.5px] shadow-2xl shadow-accent/50">
        <div className="w-full bg-white/95 backdrop-blur-xl rounded-[15px] p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-accent via-violet-600 to-fuchsia-600 flex items-center justify-center mb-3 shadow-lg shadow-accent/40">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/40 to-transparent" />
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                className="relative"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2 L14.5 9.5 L22 12 L14.5 14.5 L12 22 L9.5 14.5 L2 12 L9.5 9.5 Z"
                  fill="white"
                />
              </svg>
            </div>
            <h1 className="font-display text-xl font-extrabold tracking-tight bg-gradient-to-r from-accent via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              Datlor
            </h1>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}