import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import closeIcon from '@/assets/close-icon.png';
import { useLanguage } from '@/lib/i18n';

interface InfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InfoModal({ open, onOpenChange }: InfoModalProps) {
  const { t, lang, toggleLang } = useLanguage();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="relative flex h-[100svh] w-screen max-w-none flex-col overflow-hidden border-0 p-4 text-foreground data-[state=closed]:animate-none data-[state=open]:animate-none [&>button]:hidden" style={{ background: 'hsl(0 0% 12%)' }}>
          {/* Grain layer over the near-black modal background */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: 'var(--quiz-neutral-grain)',
              backgroundSize: '150px 150px',
              mixBlendMode: 'soft-light',
              opacity: 0.9,
            }}
          />
          <DialogDescription className="sr-only">{t('modalDescription')}</DialogDescription>
          <div className="relative flex shrink-0 items-center justify-between p-0 pb-0 pt-0">
            <DialogHeader className="p-0">
              <DialogTitle className="m-0 font-rauschen text-base font-semibold uppercase leading-[41px] text-foreground">
                {t('howItWorks')}
              </DialogTitle>
            </DialogHeader>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-[41px] w-[41px] rounded-full p-2 hover:bg-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              aria-label={t('closeDescription')}
            >
              <img src={closeIcon} alt="" className="h-6 w-6 invert" />
            </Button>
          </div>
          <div className="relative flex flex-1 flex-col justify-center overflow-y-auto">
            <div className="mx-auto w-full max-w-xl space-y-4 font-stringer text-base leading-relaxed text-foreground">
              <p>{t('intro')}</p>
              <ol className="list-decimal space-y-2 pl-5">
                <li>{t('step1')}</li>
                <li>{t('step2')}</li>
                <li>{t('step3')}</li>
                <li>{t('step4')}</li>
              </ol>
              <p>{t('outro')}</p>
            </div>
          </div>
          <div className="relative flex shrink-0 justify-center pb-2">
            <button
              type="button"
              onClick={toggleLang}
              aria-label={t('switchLanguage')}
              className="font-stringer text-xs text-foreground opacity-70 underline-offset-4 hover:underline"
            >
              {lang === 'de' ? 'English' : 'Deutsch'}
            </button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}