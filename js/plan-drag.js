const HOLD_MS = 360;
const TOUCH_SLOP = 9;
const MOUSE_SLOP = 5;
const INTERACTIVE = 'button, a, input, textarea, select';

/** Drag a session between day columns without hijacking an ordinary touch scroll. */
export function bindPlanDrag(grid, moveSession) {
  let gesture = null;

  function clear() {
    const drag = gesture;
    if (!drag) return;
    gesture = null;
    clearTimeout(drag.timer);
    cancelAnimationFrame(drag.frame);
    drag.events.abort();
    drag.ghost?.remove();
    drag.target?.classList.remove('plan-drop-target');
    drag.card.classList.remove('plan-drag-source');
    grid.classList.remove('plan-is-dragging');
    if (drag.kind === 'mouse' && grid.hasPointerCapture(drag.id)) {
      grid.releasePointerCapture(drag.id);
    }
  }

  function start(card, kind, id, x, y) {
    if (gesture) return;
    const events = new AbortController();
    gesture = { card, kind, id, x, y, x0: x, y0: y, events, target: null };
    window.addEventListener('blur', clear, { signal: events.signal });
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        if (gesture?.ghost) event.preventDefault();
        clear();
      }
    }, { signal: events.signal });
    if (kind === 'touch') {
      gesture.timer = setTimeout(activate, HOLD_MS);
      // A scroll that started during the hold should never pick a card up.
      window.addEventListener('scroll', () => {
        if (!gesture?.ghost) clear();
      }, { signal: events.signal, passive: true });
    }
  }

  function activate() {
    const drag = gesture;
    if (!drag || drag.ghost) return;
    if (!grid.isConnected) {
      clear();
      return;
    }
    const rect = drag.card.getBoundingClientRect();
    drag.offsetX = Math.min(drag.x0 - rect.left, rect.width - 12);
    drag.offsetY = Math.min(drag.y0 - rect.top, rect.height - 12);
    drag.ghost = drag.card.cloneNode(true);
    drag.ghost.classList.add('plan-drag-ghost');
    drag.ghost.removeAttribute('data-plan-session');
    drag.ghost.setAttribute('aria-hidden', 'true');
    drag.ghost.inert = true;
    drag.ghost.style.width = `${rect.width}px`;
    drag.card.classList.add('plan-drag-source');
    grid.classList.add('plan-is-dragging');
    document.body.append(drag.ghost);
    paint();
    drag.frame = requestAnimationFrame(scrollFrame);
  }

  function paint() {
    const drag = gesture;
    if (!drag?.ghost) return;
    drag.ghost.style.transform = `translate3d(${drag.x - drag.offsetX}px, ${drag.y - drag.offsetY}px, 0)`;
    const node = document.elementFromPoint(drag.x, drag.y)?.closest('[data-plan-day]');
    const target = node && grid.contains(node) && node !== drag.card.closest('[data-plan-day]') ? node : null;
    if (target !== drag.target) {
      drag.target?.classList.remove('plan-drop-target');
      drag.target = target;
      target?.classList.add('plan-drop-target');
    }
  }

  function scrollFrame() {
    const drag = gesture;
    if (!drag?.ghost) return;
    if (!grid.isConnected) {
      clear();
      return;
    }
    const tabbar = document.querySelector('.tabbar');
    const bottom = (tabbar?.getBoundingClientRect().height || 0) + 52;
    const top = 52;
    let by = 0;
    if (drag.y < top) by = -Math.ceil(Math.min(52, top - drag.y) / 3);
    if (drag.y > window.innerHeight - bottom) {
      by = Math.ceil(Math.min(52, drag.y - (window.innerHeight - bottom)) / 3);
    }
    if (by && Math.hypot(drag.x - drag.x0, drag.y - drag.y0) >= MOUSE_SLOP) {
      window.scrollBy({ top: by, behavior: 'instant' });
      paint();
    }
    drag.frame = requestAnimationFrame(scrollFrame);
  }

  function finish(x, y) {
    if (!gesture) return;
    const dragging = Boolean(gesture.ghost);
    gesture.x = x;
    gesture.y = y;
    paint();
    const { card, target } = gesture;
    clear();
    if (dragging && target) moveSession(card.dataset.planSession, Number(target.dataset.planDay));
  }

  function cardAt(event) {
    const target = event.target;
    if (!(target instanceof Element) || target.closest(INTERACTIVE)) return null;
    return target.closest('[data-plan-session]');
  }

  grid.addEventListener('pointerdown', (event) => {
    if (gesture || event.pointerType === 'touch' || event.button !== 0 || !event.isPrimary) return;
    const card = cardAt(event);
    if (!card) return;
    start(card, 'mouse', event.pointerId, event.clientX, event.clientY);
    grid.setPointerCapture(event.pointerId);
  });
  grid.addEventListener('pointermove', (event) => {
    const drag = gesture;
    if (drag?.kind !== 'mouse' || event.pointerId !== drag.id) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (!drag.ghost && Math.hypot(drag.x - drag.x0, drag.y - drag.y0) >= MOUSE_SLOP) activate();
    paint();
  });
  grid.addEventListener('pointerup', (event) => {
    if (gesture?.kind === 'mouse' && event.pointerId === gesture.id) finish(event.clientX, event.clientY);
  });
  for (const type of ['pointercancel', 'lostpointercapture']) {
    grid.addEventListener(type, (event) => {
      if (gesture?.kind === 'mouse' && event.pointerId === gesture.id) clear();
    });
  }

  grid.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 1) {
      if (gesture?.kind === 'touch') clear();
      return;
    }
    const card = cardAt(event);
    if (!card) return;
    const t = event.changedTouches[0];
    start(card, 'touch', t.identifier, t.clientX, t.clientY);
  }, { passive: true });
  grid.addEventListener('touchmove', (event) => {
    const drag = gesture;
    if (drag?.kind !== 'touch') return;
    const t = Array.from(event.changedTouches).find((touch) => touch.identifier === drag.id);
    if (!t) return;
    drag.x = t.clientX;
    drag.y = t.clientY;
    if (!drag.ghost) {
      if (Math.hypot(drag.x - drag.x0, drag.y - drag.y0) > TOUCH_SLOP) clear();
      return;
    }
    if (event.cancelable) event.preventDefault();
    paint();
  }, { passive: false });
  grid.addEventListener('touchend', (event) => {
    if (gesture?.kind !== 'touch') return;
    const t = Array.from(event.changedTouches).find((touch) => touch.identifier === gesture.id);
    if (!t) return;
    if (gesture.ghost && event.cancelable) event.preventDefault();
    finish(t.clientX, t.clientY);
  }, { passive: false });
  grid.addEventListener('touchcancel', () => {
    if (gesture?.kind === 'touch') clear();
  });
  grid.addEventListener('contextmenu', (event) => {
    if (gesture?.kind === 'touch') event.preventDefault();
  });
}
