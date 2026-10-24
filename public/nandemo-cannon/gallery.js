(() => {
  'use strict';
  const scroller = document.querySelector('#gallery-scroller');
  const track = document.querySelector('.gallery-track');
  const deck = document.querySelector('.gallery-deck');
  const cards = [...document.querySelectorAll('.gallery-card')];
  const dotsContainer = document.querySelector('.gallery-dots');
  const caption = document.querySelector('#gallery-caption');
  const status = document.querySelector('#gallery-status');
  const number = document.querySelector('#slide-number');
  const videoCard = document.querySelector('.video-card');
  const iframe = document.querySelector('#youtube-player');
  const count = cards.length;
  const videoIndex = cards.indexOf(videoCard);
  const labels = cards.map(card => card.getAttribute('aria-label').split('：').slice(1).join('：'));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0;
  let step = 1;
  let active = 0;
  let targetPosition = count;
  let animation = 0;
  let settleTimer = 0;
  let autoAdvanceTimer = 0;
  let mouseDown = false;
  let touchDown = false;
  let startX = 0;
  let wasDragged = false;
  let videoPlayer = null;
  let videoReady = false;
  let apiRequested = false;
  const modulo = (value, divisor) => ((value % divisor) + divisor) % divisor;
  const dots = cards.map((card, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'gallery-dot';
    dot.setAttribute('aria-label', card.getAttribute('aria-label'));
    dot.setAttribute('aria-pressed', String(index === 0));
    dot.addEventListener('click', () => select(index));
    dotsContainer.append(dot);
    return dot;
  });
  // A missing build-time WebP must still show its original PNG in a local preview.
  document.querySelectorAll('picture img').forEach(img => {
    const fallback = () => {
      const source = img.parentElement.querySelector('source');
      if (source) source.remove();
    };
    img.addEventListener('error', fallback);
    if (img.complete && !img.naturalWidth) fallback();
  });
  function initializePlayer() {
    if (videoPlayer || !window.YT?.Player) return;
    videoPlayer = new window.YT.Player('youtube-player', {
      events: {
        onReady: () => { videoReady = true; scheduleAutoAdvance(); },
        onStateChange: event => {
          scheduleAutoAdvance();
          if (event.data === window.YT.PlayerState.ENDED && active === videoIndex) {
            select(0);
            document.querySelector('#gallery').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
          }
        }
      }
    });
  }
  function loadVideo() {
    const url = new URL(iframe.getAttribute('src') || iframe.dataset.src, document.baseURI);
    url.searchParams.set('enablejsapi', '1');
    if (location.protocol === 'https:' || location.protocol === 'http:') {
      url.searchParams.set('origin', location.origin);
    }
    if (iframe.getAttribute('src') !== url.href) iframe.src = url.href;
    videoCard.classList.add('has-video');
    if (window.YT?.Player) {
      initializePlayer();
    } else if (!apiRequested) {
      apiRequested = true;
      window.onYouTubeIframeAPIReady = initializePlayer;
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.append(script);
    }
  }
  function updateActive(next) {
    if (next !== active && active === videoIndex && videoReady) videoPlayer.pauseVideo();
    active = next;
    number.textContent = String(active + 1).padStart(2, '0');
    caption.textContent = labels[active];
    status.textContent = cards[active].getAttribute('aria-label');
    cards.forEach((card, index) => {
      card.classList.toggle('is-active', index === active);
      card.setAttribute('aria-hidden', String(index !== active));
      dots[index].setAttribute('aria-pressed', String(index === active));
    });
    iframe.tabIndex = active === videoIndex ? 0 : -1;
    if (active === videoIndex) loadVideo();
  }
  function render() {
    const position = scroller.scrollLeft / step;
    const nearest = modulo(Math.round(position), count);
    if (nearest !== active) updateActive(nearest);
    cards.forEach((card, index) => {
      const distance = modulo(index - position + count / 2, count) - count / 2;
      const absolute = Math.abs(distance);
      const neighbor = modulo(index - nearest + count / 2, count) - count / 2;
      const visible = Math.abs(neighbor) <= 1;
      const x = Math.sign(distance) * width * (.2 * Math.min(absolute, 1) + .13 * Math.max(absolute - 1, 0));
      const scale = Math.max(.4, 1 - absolute * .2);
      card.style.transform = `translate3d(calc(-50% + ${x}px), ${absolute * 12}px, 0) scale(${scale}) rotateY(${-distance * 7}deg)`;
      card.style.zIndex = String(100 - Math.round(absolute * 20));
      card.style.opacity = visible ? '1' : '0';
      card.style.visibility = visible ? 'visible' : 'hidden';
    });
  }
  function cancelAnimation() {
    cancelAnimationFrame(animation);
    animation = 0;
    clearTimeout(settleTimer);
    targetPosition = scroller.scrollLeft / step;
    scheduleAutoAdvance();
  }
  function normalize() {
    const position = scroller.scrollLeft / step;
    const normalized = count + modulo(position, count);
    if (Math.abs(normalized - position) > .01) scroller.scrollLeft = normalized * step;
    targetPosition = normalized;
    render();
    scheduleAutoAdvance();
  }
  function moveTo(position) {
    clearTimeout(autoAdvanceTimer);
    cancelAnimationFrame(animation);
    clearTimeout(settleTimer);
    targetPosition = position;
    const from = scroller.scrollLeft;
    const to = position * step;
    if (reducedMotion.matches || Math.abs(to - from) < 1) {
      scroller.scrollLeft = to;
      normalize();
      return;
    }
    const start = performance.now();
    function tick(now) {
      const fraction = Math.min(1, (now - start) / 360);
      const eased = 1 - (1 - fraction) ** 3;
      scroller.scrollLeft = from + (to - from) * eased;
      render();
      if (fraction < 1) {
        animation = requestAnimationFrame(tick);
      } else {
        animation = 0;
        normalize();
      }
    }
    animation = requestAnimationFrame(tick);
  }
  function select(index) {
    const position = scroller.scrollLeft / step;
    let distance = modulo(index - position + count / 2, count) - count / 2;
    // Keep a whole-number destination so the selected card settles exactly at the center.
    moveTo(Math.round(position + distance));
  }
  function advance(direction) {
    const position = animation ? targetPosition : Math.round(scroller.scrollLeft / step);
    moveTo(position + direction);
  }
  function resize() {
    cancelAnimation();
    width = scroller.clientWidth;
    step = Math.max(1, width * .22);
    deck.style.width = `${width}px`;
    track.style.width = `${(3 * count - 1) * step + width}px`;
    scroller.scrollLeft = (count + active) * step;
    targetPosition = count + active;
    render();
    scheduleAutoAdvance();
  }
  scroller.addEventListener('scroll', () => {
    // Rebase in the invisible outer cycles, including during a long continuous drag.
    let position = scroller.scrollLeft / step;
    if (!animation && position < count / 2) scroller.scrollLeft += count * step;
    else if (!animation && position > count * 2.5) scroller.scrollLeft -= count * step;
    render();
    if (!animation && !mouseDown) {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => moveTo(Math.round(scroller.scrollLeft / step)), 140);
    }
  }, { passive: true });
  scroller.addEventListener('mousedown', event => {
    if (event.button !== 0) return;
    cancelAnimation();
    mouseDown = true;
    wasDragged = false;
    startX = event.clientX;
    scroller.classList.add('is-dragging');
  });
  window.addEventListener('mousemove', event => {
    if (mouseDown && Math.abs(event.clientX - startX) > 6) wasDragged = true;
  }, { passive: true });
  window.addEventListener('mouseup', () => {
    if (!mouseDown) return;
    mouseDown = false;
    scroller.classList.remove('is-dragging');
    moveTo(Math.round(scroller.scrollLeft / step));
  });
  window.addEventListener('blur', () => {
    if (!mouseDown) return;
    mouseDown = false;
    scroller.classList.remove('is-dragging');
    moveTo(Math.round(scroller.scrollLeft / step));
  });
  scroller.addEventListener('touchstart', () => { touchDown = true; cancelAnimation(); wasDragged = false; }, { passive: true });
  scroller.addEventListener('touchend', () => { touchDown = false; scheduleAutoAdvance(); }, { passive: true });
  scroller.addEventListener('touchcancel', () => { touchDown = false; scheduleAutoAdvance(); }, { passive: true });
  scroller.addEventListener('wheel', cancelAnimation, { passive: true });
  scroller.addEventListener('click', event => {
    if (wasDragged) { wasDragged = false; return; }
    const card = event.target.closest('.gallery-card');
    if (card && !card.classList.contains('is-active')) select(Number(card.dataset.index));
  });
  scroller.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      advance(event.key === 'ArrowLeft' ? -1 : 1);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      select(event.key === 'Home' ? 0 : count - 1);
    }
  });
  new ResizeObserver(resize).observe(scroller);
  resize();
  window.dragscroll?.reset();
  function scheduleAutoAdvance() {
    clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = setTimeout(() => {
      if (active === videoIndex) {
        if (!videoReady) return;
        const state = videoPlayer.getPlayerState();
        if (state === window.YT.PlayerState.PLAYING || state === window.YT.PlayerState.BUFFERING) return;
      }
      if (!mouseDown && !touchDown && !animation && !document.hidden) advance(1);
      else scheduleAutoAdvance();
    }, 4500);
  }
})();
