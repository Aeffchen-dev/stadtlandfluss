import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import closeIcon from '@/assets/close-icon.png';

interface InfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InfoModal({ open, onOpenChange }: InfoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-background" />
        <DialogContent className="relative flex h-[100svh] w-screen max-w-none flex-col overflow-hidden border-0 p-2 text-foreground data-[state=closed]:animate-none data-[state=open]:animate-none [&>button]:hidden" style={{ background: 'hsl(30 5% 12%)' }}>
          {/* Grain layer over the near-black modal background */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: 'var(--quiz-page-grain)',
              backgroundSize: '150px 150px',
              mixBlendMode: 'soft-light',
              opacity: 0.9,
            }}
          />
          <DialogDescription className="sr-only">Beschreibung des Spiels</DialogDescription>
          <div className="relative flex shrink-0 items-center justify-between p-0 pb-0 pt-0">
            <DialogHeader className="p-0">
              <DialogTitle className="m-0 font-rauschen text-base font-semibold uppercase leading-[41px] text-foreground">
                So funktioniert’s
              </DialogTitle>
            </DialogHeader>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-[41px] w-[41px] rounded-full p-2 hover:bg-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              aria-label="Beschreibung schließen"
            >
              <img src={closeIcon} alt="" className="h-6 w-6 invert" />
            </Button>
          </div>
          <div className="relative flex flex-1 flex-col justify-center overflow-y-auto">
            <div className="mx-auto w-full max-w-xl space-y-4 font-stringer text-base leading-relaxed text-foreground">
              <p>
                Drei Kategorien, ein Buchstabe – was fällt dir ein? Spielt abwechselnd und
                entdeckt, welche Wörter der andere im Kopf hat.
              </p>
              <ol className="list-decimal space-y-2 pl-5">
                <li>Wählt durch Wischen drei Kategorien aus.</li>
                <li>
                  Wer beginnt, klickt auf den Buchstaben unten und findet dazu ein Wort pro
                  Kategorie – zum Beispiel Panda, Paris und Pizza bei „P“.
                </li>
                <li>Dann ist der andere dran: neuen Buchstaben generieren und drei passende Wörter finden.</li>
                <li>Nachdem ihr beide zweimal dran wart, wählt ihr neue Kategorien und spielt weiter.</li>
              </ol>
              <p>Wenn ihr mögt, könnt ihr auch eigene Kategorien ergänzen.</p>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}