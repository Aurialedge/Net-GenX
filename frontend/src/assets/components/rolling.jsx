import React from 'react';

export default function RollingText() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
      <div className="overflow-hidden">
        <div className="animate-roll">
          <h1 className="text-6xl font-bold text-white whitespace-nowrap">
            Rolling Text Animation
          </h1>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes roll {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        
        .animate-roll {
          animation: roll 20s linear infinite;
        }
      `}</style>
    </div>
  );
}