import React from 'react';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-line rounded-2xl shadow-sm p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M4 6h16v12H4z"
                stroke="#3457D5"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path d="M4 7l8 6 8-6" stroke="#3457D5" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="font-display text-lg font-semibold text-ink">لوگوی پلتفرم</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
