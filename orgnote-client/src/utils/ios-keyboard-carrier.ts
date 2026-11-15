// Creates a focused hidden <input> to raise the iOS keyboard synchronously
// within a user gesture (before an async modal mount, where a later focus()
// would not raise it). Must be a real, non-zero, font-size>=16px input — iOS
// ignores zero-size / display:none inputs and won't show the keyboard for them.
export const focusKeyboardCarrier = (): HTMLInputElement => {
  const input = document.createElement('input');
  Object.assign(input.style, {
    position: 'fixed',
    bottom: '0',
    left: '0',
    width: '1px',
    height: '1px',
    fontSize: '16px',
    opacity: '0',
    border: '0',
    padding: '0',
    zIndex: '-1',
  });
  // tabIndex=-1 (not aria-hidden): the input is programmatically focused, and
  // aria-hidden on a focused element violates ARIA and confuses screen readers.
  input.tabIndex = -1;
  document.body.appendChild(input);
  input.focus({ preventScroll: true });
  return input;
};
