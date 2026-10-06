import { Link } from 'react-router';
import { ArrowLeft, Compass } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { buttonClasses } from '../ui/Button';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg items-center px-4 py-16">
      <div className="w-full">
        <EmptyState
          as="h1"
          icon={<Compass />}
          title="Page not found"
          action={
            <Link to="/" className={buttonClasses('primary')}>
              <ArrowLeft aria-hidden="true" />
              Back to all games
            </Link>
          }
        >
          Nothing lives at this address. Pick a game on the home page to search a player.
        </EmptyState>
      </div>
    </main>
  );
}
