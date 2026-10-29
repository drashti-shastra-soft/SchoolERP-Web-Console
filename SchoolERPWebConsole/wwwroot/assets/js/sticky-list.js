function init() {
    const MOBILE_BREAKPOINT = 575.98;
    const toolbar = document.querySelector('.sticky-toolbar');
    const thead = document.querySelector('.sticky-table table thead');
    const wizardTabs = document.querySelector('#wizardTabsBar');

    const toolbarSticky = makeHardSticky(toolbar, () => 0);
    const theadSticky = makeHardSticky(
        thead,
        () => (toolbar ? toolbar.offsetHeight : 0)
    );
    const wizardTabsSticky = makeHardSticky(
        wizardTabs,
        () => (toolbar ? toolbar.offsetHeight : 0)
    );

    function isMobile() {
        return window.innerWidth <= MOBILE_BREAKPOINT;
    }

    function onScrollAll() {
        if (isMobile()) {
            // Mobile: page itself doesn't scroll — #itemForm .card-body scrolls
            // internally instead (see sizeCardBody()). Toolbar/tabs sit above
            // it in normal flow and never need position:fixed here. thead
            // still gets pinned since the table has its own independent
            // scroll box regardless of screen size.
            toolbarSticky?.unpin?.();
            wizardTabsSticky?.unpin?.();
            theadSticky?.onScroll();
            return;
        }

        if (toolbarSticky) toolbarSticky.onScroll();
        if (theadSticky) theadSticky.onScroll();
        if (wizardTabsSticky) wizardTabsSticky.onScroll();
    }

    window.addEventListener('scroll', () => requestAnimationFrame(onScrollAll));
    window.addEventListener('resize', () => requestAnimationFrame(onScrollAll));
    onScrollAll();

    window.addEventListener('stickyToolbarChanged', () => {
        if (toolbarSticky) toolbarSticky.remeasure();
        if (theadSticky) theadSticky.remeasure();
        if (wizardTabsSticky) wizardTabsSticky.remeasure();
        onScrollAll();
    });

    window.addEventListener('wizardStepChanged', () => {
        if (wizardTabsSticky) wizardTabsSticky.remeasure();
        onScrollAll();
    });
}

function makeHardSticky(el, getOffset) {
    if (!el) return null;

    let placeholder = null;
    let pinned = false;
    const originalPosition = el.style.position;

    function pin(offset, rect) {
        if (pinned) return;
        placeholder = document.createElement('div');
        placeholder.style.height = `${rect.height}px`;
        el.parentNode.insertBefore(placeholder, el);

        el.style.position = 'fixed';
        el.style.top = `${offset}px`;
        el.style.left = `${rect.left}px`;
        el.style.width = `${rect.width}px`;
        el.style.zIndex = '1000';
        pinned = true;
    }

    function unpin() {
        if (!pinned) return;
        el.style.position = originalPosition || '';
        el.style.top = '';
        el.style.left = '';
        el.style.width = '';
        el.style.zIndex = '';
        placeholder?.remove();
        placeholder = null;
        pinned = false;
    }

    function onScroll() {
        const offset = getOffset ? getOffset() : 0;
        const rect = (pinned ? placeholder : el)?.getBoundingClientRect();
        if (!rect) return;

        if (rect.top <= offset) {
            pin(offset, rect);
        } else if (pinned && rect.top > offset) {
            unpin();
        }
    }

    function remeasure() {
        unpin();
        onScroll();
    }

    return { onScroll, unpin, remeasure };
}