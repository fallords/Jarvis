import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WelcomeProps {
  disabled: boolean;
  startButtonText: string;
  onStartCall: () => void;
}

export const Welcome = ({
  disabled,
  startButtonText,
  onStartCall,
  ref,
}: React.ComponentProps<'div'> & WelcomeProps) => {
  return (
    <section
      ref={ref}
      inert={disabled}
      className={cn(
        'fixed inset-0 mx-auto flex h-svh flex-col items-center justify-center text-center',
        disabled ? 'z-10' : 'z-20'
      )}
      // design: make overlay translucent so background HUD stays visible
      style={{
        backgroundColor: 'rgba(2,6,23,0.5)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      {/* Replace inline SVG with an image file placed in public/arc_reactor_blue.png */}
      <div className="mb-4 h-64 w-64">
        <Image
          src="/arc_reactor-removebg-preview.png"
          width={256}
          height={256}
          alt="Arc reactor"
          className="object-contain"
          priority
        />
      </div>

      <p className="text-fg1 max-w-prose pt-1 leading-6 font-medium">
        Chat with J.A.R.V.I.S., Fadhlan advanced voice AI agent.
      </p>
      <Button variant="primary" size="lg" onClick={onStartCall} className="mt-6 w-64 font-mono">
        {startButtonText}
      </Button>
      <footer className="fixed bottom-5 left-0 z-20 flex w-full items-center justify-center"></footer>
    </section>
  );
};
