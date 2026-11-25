import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keyboard and screen reader behaviour every modal dialog needs:
 *  - focus moves into the dialog when it opens (to the first control, or to the dialog itself);
 *  - Tab and Shift+Tab stay inside it, so keyboard users cannot wander into the page behind;
 *  - Escape closes it (pass `onClose`; leave it out when the component already handles Escape);
 *  - focus returns to the control that opened it when it closes.
 * The dialog element still needs role="dialog" (or "alertdialog"), aria-modal="true" and an accessible name.
 *
 * @param {{ current: HTMLElement | null }} ref the dialog element
 * @param {boolean} active true while the dialog is open
 * @param {() => void} [onClose]
 */
export function useModalA11y(ref, active, onClose) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const node = ref.current;
    if (!active || !node) return undefined;

    const opener = document.activeElement;
    const focusable = () => [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);

    if (!node.contains(document.activeElement)) {
      (focusable()[0] ?? node).focus({ preventScroll: true });
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && closeRef.current) {
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    node.addEventListener('keydown', onKeyDown);
    return () => {
      node.removeEventListener('keydown', onKeyDown);
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [ref, active]);
}
