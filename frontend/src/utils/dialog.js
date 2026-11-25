/**
 * Replacements for window.confirm() and window.alert(), built on the native <dialog> element.
 *
 * The blocking browser pop-ups look out of place, freeze the page, are suppressed in some embedded and
 * installed-app contexts, and cannot be styled or translated. A modal <dialog> opened with showModal() gives
 * the same behaviour with a focus trap, a dimmed backdrop and Escape-to-dismiss, with no extra library.
 */
import { translate, detectLocale } from './i18n';

const dialogClass =
  'rounded-xl p-0 max-w-sm w-[calc(100%-2rem)] shadow-2xl border border-gray-200 dark:border-gray-700 ' +
  'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 backdrop:bg-black/50';
const buttonClass =
  'px-4 py-2 rounded-lg text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600';
const primaryClass = `${buttonClass} bg-primary-700 text-white hover:bg-primary-800`;
const secondaryClass = `${buttonClass} bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600`;

/** Opens a modal dialog with the message and the given buttons; resolves with the value of the button pressed ('' for Escape). */
function ask(message, buttons) {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = dialogClass;

    const form = document.createElement('form');
    form.method = 'dialog';
    form.className = 'p-6';

    const text = document.createElement('p');
    text.id = `dialog-message-${Math.random().toString(36).slice(2)}`;
    text.className = 'text-base mb-6';
    text.textContent = message;
    dialog.setAttribute('aria-describedby', text.id);

    const row = document.createElement('div');
    row.className = 'flex justify-end gap-3';
    for (const { label, value, primary, focus } of buttons) {
      const button = document.createElement('button');
      button.type = 'submit';
      button.value = value;
      button.textContent = label;
      button.className = primary ? primaryClass : secondaryClass;
      if (focus) button.autofocus = true;
      row.append(button);
    }

    form.append(text, row);
    dialog.append(form);
    dialog.addEventListener('close', () => {
      const answer = dialog.returnValue;
      dialog.remove();
      resolve(answer);
    });
    document.body.append(dialog);
    dialog.showModal();
  });
}

/** Resolves true when the user confirms, false on Cancel or Escape. Cancel has focus, so Enter never confirms by accident. */
export async function confirmDialog(message) {
  const locale = detectLocale();
  const answer = await ask(message, [
    { label: translate(locale, 'common.cancel'), value: 'cancel', focus: true },
    { label: translate(locale, 'common.confirm'), value: 'confirm', primary: true },
  ]);
  return answer === 'confirm';
}

/** Shows a message and resolves when the user closes it. */
export async function alertDialog(message) {
  const locale = detectLocale();
  await ask(message, [{ label: translate(locale, 'common.close'), value: 'ok', primary: true, focus: true }]);
}
