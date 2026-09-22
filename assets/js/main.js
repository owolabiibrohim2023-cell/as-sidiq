(() => {
  'use strict';

  const body = document.body;
  const header = document.querySelector('.site-header');
  const navToggle = document.querySelector('.nav__toggle');
  const navPanel = document.querySelector('.nav__panel');

  // Current year and active navigation state.
  document.querySelectorAll('[data-year]').forEach((node) => {
    node.textContent = new Date().getFullYear();
  });

  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__link').forEach((link) => {
    const target = (link.getAttribute('href') || '').split('#')[0];
    if (target === currentFile || (currentFile === '' && target === 'index.html')) {
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'page');
    }
  });

  // Compact sticky header after the hero begins scrolling.
  const updateHeader = () => {
    if (!header) return;
    header.classList.toggle('is-sticky', window.scrollY > 34);
  };
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  // Accessible mobile navigation.
  const closeMenu = () => {
    body.classList.remove('nav-open');
    navToggle?.setAttribute('aria-expanded', 'false');
  };

  navToggle?.addEventListener('click', () => {
    const willOpen = !body.classList.contains('nav-open');
    body.classList.toggle('nav-open', willOpen);
    navToggle.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) navPanel?.querySelector('a')?.focus({ preventScroll: true });
  });

  navPanel?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 860) closeMenu();
  });

  // Scroll reveal, disabled for visitors who prefer reduced motion.
  const revealItems = document.querySelectorAll('.reveal');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px' });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  // FAQ accordions.
  document.querySelectorAll('.faq-question').forEach((button) => {
    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      const list = button.closest('.faq-list');
      list?.querySelectorAll('.faq-question').forEach((other) => {
        if (other !== button) other.setAttribute('aria-expanded', 'false');
      });
      button.setAttribute('aria-expanded', String(!expanded));
    });
  });

  // Portfolio category filtering.
  const filterButtons = document.querySelectorAll('.filter-btn');
  const galleryCards = document.querySelectorAll('.gallery-card');
  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter || 'all';
      filterButtons.forEach((item) => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      galleryCards.forEach((card) => {
        const visible = filter === 'all' || card.dataset.category === filter;
        card.classList.toggle('is-hidden', !visible);
      });
    });
  });

  const successDialog = document.querySelector('#success-dialog');
  const dialogTitle = successDialog?.querySelector('[data-dialog-title]');
  const dialogCopy = successDialog?.querySelector('[data-dialog-copy]');
  const dialogRef = successDialog?.querySelector('[data-dialog-ref]');
  successDialog?.querySelectorAll('[data-dialog-close]').forEach((button) => {
    button.addEventListener('click', () => successDialog.close());
  });
  successDialog?.addEventListener('click', (event) => {
    if (event.target === successDialog) successDialog.close();
  });

  const makeReference = (prefix) => {
    const stamp = Date.now().toString().slice(-6);
    return `${prefix}-${stamp}`;
  };

  const showSuccess = (kind, preview = false) => {
    const isJob = kind === 'job-application';
    const reference = makeReference(isJob ? 'ASB-JOB' : 'ASB-QUOTE');
    if (dialogTitle) dialogTitle.textContent = isJob ? 'Application received' : 'Request received';
    if (dialogCopy) {
      dialogCopy.textContent = preview
        ? `Preview complete. On the live Netlify site, this ${isJob ? 'application' : 'request'} will be saved in your Forms dashboard.`
        : `Thank you. Our team will review your ${isJob ? 'application' : 'request'} and contact you using the details provided.`;
    }
    if (dialogRef) dialogRef.textContent = reference;
    if (successDialog?.showModal) successDialog.showModal();
    else window.alert(`${dialogTitle?.textContent || 'Submitted'} — ${reference}`);
  };

  // Reliable Netlify submission plus a working local/Arena preview.
  // Production Netlify pages use the browser's native POST so file uploads and
  // Netlify's form parser are handled directly. Every other host runs in demo mode.
  document.querySelectorAll('.js-netlify-form').forEach((form) => {
    const status = form.querySelector('.form-status');

    // Make validation failures obvious instead of appearing to do nothing.
    form.addEventListener('invalid', () => {
      if (status) {
        status.textContent = 'Please complete all required fields marked with an asterisk.';
        status.classList.remove('is-success');
        status.classList.add('is-error');
      }
    }, true);

    form.addEventListener('submit', async (event) => {
      const submit = form.querySelector('button[type="submit"]');
      const originalLabel = submit?.innerHTML;
      status?.classList.remove('is-error', 'is-success');

      const isNetlify = window.location.hostname === 'contractorsidiq.netlify.app' ||
        window.location.hostname.endsWith('.netlify.app');

      // On Netlify, do not intercept: the native form POST is the most reliable
      // path and redirects to thank-you.html when the upload is accepted.
      if (isNetlify) {
        if (submit) {
          submit.disabled = true;
          submit.textContent = 'Submitting…';
        }
        return;
      }

      // Local, Arena and other static previews have no forms backend. Validate,
      // save a lightweight local receipt and show the exact success experience.
      event.preventDefault();
      if (submit) {
        submit.disabled = true;
        submit.textContent = 'Submitting…';
      }

      try {
        const formData = new FormData(form);
        const previewRecord = {};
        formData.forEach((value, key) => {
          if (!(value instanceof File)) previewRecord[key] = value;
        });
        try {
          localStorage.setItem(`as-sidiq-${form.name}-latest`, JSON.stringify({
            submittedAt: new Date().toISOString(),
            data: previewRecord
          }));
        } catch (_) {
          // Sandboxed previews may block storage; the confirmation still works.
        }

        await new Promise((resolve) => setTimeout(resolve, 450));
        if (status) {
          status.textContent = 'Application completed successfully in preview mode.';
          status.classList.add('is-success');
        }
        showSuccess(form.dataset.formKind, true);
        form.reset();
      } catch (error) {
        if (status) {
          status.innerHTML = 'We could not process the form. Please call <a href="tel:+2349037582114"><strong>0903 758 2114</strong></a> or try again.';
          status.classList.add('is-error');
        }
      } finally {
        if (submit) {
          submit.disabled = false;
          submit.innerHTML = originalLabel;
        }
      }
    });
  });

  // Show the selected CV name and reject files larger than 5MB.
  document.querySelectorAll('.js-career-form input[type="file"]').forEach((input) => {
    const wrapper = input.closest('.file-input');
    const nameTarget = wrapper?.querySelector('[data-file-name]');
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      wrapper?.classList.remove('has-error');
      if (!file) {
        if (nameTarget) nameTarget.textContent = 'PDF, DOC or DOCX · maximum 5MB';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        input.value = '';
        if (nameTarget) nameTarget.textContent = 'That file is over 5MB. Please choose a smaller file.';
        wrapper?.classList.add('has-error');
        return;
      }
      if (nameTarget) nameTarget.textContent = file.name;
    });
  });

  // Validate the attachment before the browser posts the complete form.
  document.querySelectorAll('.js-career-form').forEach((form) => {
    const status = form.querySelector('.form-status');
    form.addEventListener('submit', (event) => {
      const file = form.querySelector('input[type="file"]')?.files?.[0];
      if (file && file.size > 5 * 1024 * 1024) {
        event.preventDefault();
        if (status) {
          status.textContent = 'Please upload a CV smaller than 5MB.';
          status.classList.remove('is-success');
          status.classList.add('is-error');
          status.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });
  });
})();
