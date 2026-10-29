// wwwroot/js/sidebarActiveMenu.js
//
// Highlights the sidebar menu link that matches the current page URL, and
// expands any parent submenu(s) it lives under, so the active item is
// visible without the user needing to click the parent first.
//
// It ALSO enforces accordion behavior: only one submenu per level can be
// open at a time. Opening a submenu closes any other open sibling submenu
// (and everything nested inside that sibling), both on initial page load
// and whenever the user clicks a parent toggle link afterwards.
//
// This is required because the Menu ViewComponent's RenderMenus(parentId,
// depth) method (Views/Shared/Components/Menu/Default.cshtml) renders pure
// navigation markup only — it never adds an "active" class to anything.
// This script is the only thing that adds active/expanded state, and it
// adds 100% of it; it does not assume any class already exists.
//
// Matches the exact markup RenderMenus produces:
//
//   Leaf (no children):
//     <li><a href="@menu.MenuURL">[icon if depth==0]<span>Name</span></a></li>
//
//   Parent with children (depth > 0):
//     <li class="submenu">
//       <a href="javascript:void(0);"><span>Name</span><span class="menu-arrow ..."></span></a>
//       <ul> ...children via RenderMenus(menu.MenuID, depth+1)... </ul>
//     </li>
//
//   Parent with children (depth == 0) — note the extra <li><ul> wrapper:
//     <li><ul><li class="submenu">
//       <a href="javascript:void(0);">[icon]<span>Name</span><span class="menu-arrow ..."></span></a>
//       <ul> ...children... </ul>
//     </li></ul></li>
//
// Include this file in _Layout.cshtml AFTER the sidebar menu markup exists
// in the DOM, e.g. right before </body>:
//
//   <script src="~/js/sidebarActiveMenu.js"></script>

(function () {
    function highlightActiveMenu() {
        const sidebarMenu = document.getElementById('sidebar-menu');
        if (!sidebarMenu) return;

        // Safety-net CSS: guarantees an expanded submenu is actually visible
        // even if style.css doesn't already define how "open" submenus look.
        if (!document.getElementById('sidebarActiveMenuStyle')) {
            const style = document.createElement('style');
            style.id = 'sidebarActiveMenuStyle';
            style.textContent = `
                #sidebar-menu li.submenu.menu-open > ul { display: block !important; }
            `;
            document.head.appendChild(style);
        }

        function normalizePath(path) {
            if (!path) return '/';
            path = path.split('?')[0].split('#')[0];
            if (path.length > 1 && path.endsWith('/')) {
                path = path.slice(0, -1);
            }
            return path.toLowerCase() || '/';
        }

        const currentPath = normalizePath(window.location.pathname);

        // First path segment = the MVC controller, e.g. "/MenuMaster/AddMenu"
        // -> "menumaster". Used as a fallback below for pages (like an
        // Add/Edit form) that aren't themselves in the sidebar, but share a
        // controller with a sidebar link that IS (e.g. a "Menu List" link
        // pointing at /MenuMaster/Index).
        function firstSegment(path) {
            const parts = path.split('/').filter(Boolean);
            return parts.length ? parts[0] : '';
        }
        const currentController = firstSegment(currentPath);

        // Only real navigable links — RenderMenus uses
        // href="javascript:void(0);" for every parent/submenu toggle, so
        // those are excluded from ever being treated as the active page.
        const links = Array.from(sidebarMenu.querySelectorAll('a[href]')).filter(a => {
            const href = a.getAttribute('href') || '';
            return href && !href.toLowerCase().startsWith('javascript:') && href !== '#';
        });

        // Three-tier match, each tier only used if a better one wasn't found:
        //   1) Exact path match.
        //   2) Longest href the current path is "under" (e.g. /Students/Details/5
        //      under /Students/Index).
        //   3) Same controller (first path segment) — handles pages like
        //      /MenuMaster/AddMenu that aren't in the sidebar themselves but
        //      belong to the same controller as a sidebar link such as
        //      /MenuMaster/Index ("Menu List").
        let bestLink = null;
        let bestLen = -1;
        let controllerFallbackLink = null;

        links.forEach(a => {
            let href;
            try {
                href = normalizePath(new URL(a.getAttribute('href'), window.location.origin).pathname);
            } catch {
                return;
            }
            if (href === '/' && currentPath !== '/') return; // don't let "/" swallow every page

            if (href === currentPath) {
                bestLink = a;
                bestLen = href.length + 1; // exact match always wins
            } else if (currentPath.startsWith(href + '/') && href.length > bestLen) {
                bestLink = a;
                bestLen = href.length;
            } else if (!controllerFallbackLink && currentController && firstSegment(href) === currentController) {
                controllerFallbackLink = a;
            }
        });

        // Tiers 1/2 above give a confident, unambiguous match. If we got
        // one, remember it — Add/Edit/other sub-pages (like
        // /Hostel/AddHostel) often live under the SAME controller as
        // several different sidebar links (Hostel Type, Hostels, Room
        // Type, ... are all "Hostel/*"), so when we later land on one of
        // those and can't find a direct match, we know which specific
        // sidebar item you actually came from instead of just guessing
        // "the first link in the DOM with a matching controller".
        const STORAGE_KEY = 'sidebarActiveMenu:lastConfidentHref';

        if (bestLink) {
            try {
                const href = normalizePath(new URL(bestLink.getAttribute('href'), window.location.origin).pathname);
                sessionStorage.setItem(STORAGE_KEY, href);
            } catch { /* sessionStorage unavailable — ignore */ }
        } else {
            let rememberedHref = null;
            try { rememberedHref = sessionStorage.getItem(STORAGE_KEY); } catch { /* ignore */ }

            if (rememberedHref && firstSegment(rememberedHref) === currentController) {
                const rememberedLink = links.find(a => {
                    try {
                        return normalizePath(new URL(a.getAttribute('href'), window.location.origin).pathname) === rememberedHref;
                    } catch {
                        return false;
                    }
                });
                if (rememberedLink) bestLink = rememberedLink;
            }

            if (!bestLink) bestLink = controllerFallbackLink;
        }
        if (!bestLink) return;

        // Mark the matched leaf link + its own <li> active.
        bestLink.classList.add('active');
        const leafLi = bestLink.closest('li');
        if (leafLi) leafLi.classList.add('active');

        // Walk every ancestor <li> (any depth — RenderMenus recursion is
        // unbounded) and, for each submenu parent, mark it active and
        // expand its <ul> so the active leaf is visible on page load.
        // Along the way, close any sibling submenus at the same level so
        // only the active chain is ever open (accordion on load too).
        let node = bestLink.parentElement;
        while (node && node !== sidebarMenu) {
            if (node.tagName === 'LI') {
                node.classList.add('active');

                const parentLink = node.querySelector(':scope > a');
                const submenu = node.querySelector(':scope > ul');
                if (parentLink) {
                    parentLink.classList.add('active', 'subdrop');
                }
                if (submenu) {
                    node.classList.add('menu-open', 'submenu-open');
                    submenu.style.display = 'block';
                    closeSiblingSubmenus(node);
                }
            }
            node = node.parentElement;
        }
    }

    // Collapses every open sibling <li class="submenu"> that shares the
    // same parent <ul> as `openLi`, leaving `openLi` itself untouched.
    // Also collapses anything nested inside those siblings, so re-opening
    // that branch later starts from a clean, fully-closed state.
    function closeSiblingSubmenus(openLi) {
        const parentUl = openLi.parentElement;
        if (!parentUl) return;

        Array.from(parentUl.children).forEach(sibling => {
            if (sibling === openLi || sibling.tagName !== 'LI') return;
            if (!sibling.classList.contains('submenu')) return;

            collapseSubtree(sibling);
        });
    }

    function collapseSubtree(li) {
        li.classList.remove('menu-open', 'submenu-open');
        const link = li.querySelector(':scope > a');
        if (link) link.classList.remove('subdrop');
        const ul = li.querySelector(':scope > ul');
        if (ul) {
            ul.style.display = 'none';
            // Recurse into any nested open submenus so collapsing a
            // top-level item also closes whatever was open underneath it.
            Array.from(ul.children).forEach(child => {
                if (child.tagName === 'LI' && child.classList.contains('submenu')) {
                    collapseSubtree(child);
                }
            });
        }
    }

    // Closes every open li.submenu in the whole sidebar EXCEPT `keepLi`
    // and `keepLi`'s own ancestor submenu chain. This is stronger than
    // "close same-level siblings only" — it guarantees at most one
    // top-to-bottom open branch anywhere in the sidebar at any time, so
    // you can never end up with two unrelated menus (e.g. "Academics" and
    // "Student Information") open simultaneously.
    function closeAllSubmenusExcept(keepLi, sidebarMenu) {
        const keep = new Set();
        let n = keepLi;
        while (n && n !== sidebarMenu) {
            if (n.tagName === 'LI') keep.add(n);
            n = n.parentElement;
        }

        sidebarMenu.querySelectorAll('li.submenu').forEach(li => {
            if (!keep.has(li)) collapseSubtree(li);
        });
    }

    // Wires up click handling on every parent/submenu toggle link so that
    // opening one submenu automatically closes every other open submenu
    // in the sidebar (true single-branch accordion), regardless of what
    // other scripts on the page try to do.
    //
    // Registered in the CAPTURE phase + stopImmediatePropagation so this
    // handler runs first and prevents any other click handler (e.g. one
    // bundled with the admin template) attached to the same link from
    // firing at all. That other handler is very likely what's fighting
    // with this one if you're seeing mismatched arrows/content — search
    // your other JS files for "menu-open" or "subdrop" to find it and
    // remove its <script> reference if possible.
    function setupAccordionClicks() {
        const sidebarMenu = document.getElementById('sidebar-menu');
        if (!sidebarMenu) return;

        sidebarMenu.addEventListener('click', function (e) {
            const link = e.target.closest('a[href="javascript:void(0);"]');
            if (!link || !sidebarMenu.contains(link)) return;

            const li = link.closest('li.submenu');
            if (!li) return;

            const submenu = li.querySelector(':scope > ul');
            if (!submenu) return;

            // Block any other click handler on this same link/li from
            // running (e.g. a legacy template script also bound here).
            e.preventDefault();
            e.stopImmediatePropagation();

            const isOpen = li.classList.contains('menu-open');

            if (isOpen) {
                collapseSubtree(li);
            } else {
                // Close every other open submenu in the ENTIRE sidebar
                // first (except this one's own ancestor chain)...
                closeAllSubmenusExcept(li, sidebarMenu);
                // ...then open the clicked one.
                li.classList.add('menu-open', 'submenu-open');
                link.classList.add('subdrop');
                submenu.style.display = 'block';
            }
        }, true); // capture phase
    }

    function init() {
        highlightActiveMenu();
        setupAccordionClicks();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();