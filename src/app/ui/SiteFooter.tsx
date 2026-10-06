interface SiteFooterProps {
  /** Second line; the game pages name their game here. */
  note?: string;
}

export function SiteFooter({ note = 'All game data comes from the official Supercell developer API.' }: SiteFooterProps) {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 text-xs leading-relaxed text-fg-subtle sm:px-6">
        <p>
          This material is unofficial and is not endorsed by Supercell. For more information see Supercell's Fan Content Policy:{' '}
          <a
            href="https://www.supercell.com/fan-content-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-fg-muted underline underline-offset-2 transition-colors hover:text-fg"
          >
            www.supercell.com/fan-content-policy
          </a>
          .
        </p>
        <p className="mt-2">{note}</p>
      </div>
    </footer>
  );
}
