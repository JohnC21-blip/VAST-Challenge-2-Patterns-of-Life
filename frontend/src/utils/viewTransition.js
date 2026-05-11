import {flushSync} from "react-dom";

export function runViewTransition(update) {
  if (!document.startViewTransition) {
    update();
    return;
  }

  document.startViewTransition(() => {
    flushSync(update);
  });
}
