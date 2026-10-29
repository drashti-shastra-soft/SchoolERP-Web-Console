(function (window) {
    'use strict';

    var perms = window.ftPermissions || { canAdd: false, canEdit: false, canDelete: false, canPrint: false, canExport: false };

    // ---------------------------------------------------------------
    // Element refs
    // ---------------------------------------------------------------
    var $class = document.getElementById('fltClass');
    var $section = document.getElementById('fltSection');
    var $installment = document.getElementById('fltInstallment');
    var $isActive = document.getElementById('fltIsActive');
    var $searchText = document.getElementById('fltSearchText');
    var $pageSize = document.getElementById('fltPageSize');
    var $gridContainer = document.getElementById('ftGridContainer');

    var $btnEdit = document.getElementById('btnEditFT');
    var $btnDelete = document.getElementById('btnDeleteFT');
    var $btnActive = document.getElementById('btnActiveFT');
    var $btnInactive = document.getElementById('btnInactiveFT');

    var $btnApplyFilters = document.getElementById('btnApplyFiltersFT');
    var $btnResetFilters = document.getElementById('btnResetFiltersFT');
    var $btnResetAllFilters = document.getElementById('btnResetAllFiltersFT');
    var $btnCloseFilter = document.getElementById('btnCloseFilterFT');
    var $badgeRow = document.getElementById('ftActiveFilterBadges');
    var $badgeContainer = document.getElementById('ftBadgeContainer');

    // Applied filters (only these drive fetchGrid — the dropdown fields
    // are staged until "Apply" is clicked, same UX as Fee Head/Category Group)
    var state = {
        classId: '',
        classLabel: '',
        sectionId: '',
        sectionLabel: '',
        installmentId: '',
        installmentLabel: '',
        isActive: '',
        searchText: '',
        pageIndex: 1,
        pageSize: parseInt(($pageSize && $pageSize.value) || '10', 10) || 10,
        sortColumn: 'CLASSNAME',
        sortDirection: 'ASC'
    };

    var selectedIds = new Set();
    var searchDebounceTimer = null;

    // ---------------------------------------------------------------
    // Class -> Section cascade (inside the filter dropdown)
    // ---------------------------------------------------------------
    function loadSectionsForFilter(classId, selectedSectionId) {
        $section.innerHTML = '<option value="">All</option>';
        if (!classId) return Promise.resolve();

        return fetch('/Academics/GetSectionsByClass/' + classId)
            .then(function (r) { return r.json(); })
            .then(function (res) {
                if (res && res.success && res.data) {
                    res.data.forEach(function (s) {
                        var opt = document.createElement('option');
                        opt.value = s.sectionID;
                        opt.textContent = s.sectionName;
                        $section.appendChild(opt);
                    });
                }
                if (selectedSectionId) $section.value = selectedSectionId;
            });
    }

    $class.addEventListener('change', function () {
        loadSectionsForFilter($class.value, null);
    });

    // ---------------------------------------------------------------
    // Core fetch: POST applied filters -> receive rendered partial HTML
    // ---------------------------------------------------------------
    function fetchGrid() {
        var payload = {
            CLASSID: state.classId ? parseInt(state.classId, 10) : null,
            SECTIONID: state.sectionId ? parseInt(state.sectionId, 10) : null,
            INSTALLMENTID: state.installmentId ? parseInt(state.installmentId, 10) : null,
            ISACTIVE: state.isActive === '' ? null : (state.isActive === 'true'),
            SEARCHTEXT: state.searchText || null,
            PAGEINDEX: state.pageIndex,
            PAGESIZE: state.pageSize,
            SORTCOLUMN: state.sortColumn,
            SORTDIRECTION: state.sortDirection
        };

        $gridContainer.innerHTML = '<div class="text-center text-muted p-3">Loading...</div>';
        clearSelection();

        fetch('/FeeTemplate/GetPageIndex', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(function (r) { return r.text(); })
            .then(function (html) {
                $gridContainer.innerHTML = html;
                wireGridEvents();
            })
            .catch(function () {
                $gridContainer.innerHTML = '<div class="text-center text-danger p-3">Failed to load Fee Templates.</div>';
            });
    }

    // ---------------------------------------------------------------
    // Wire up sort headers + pager buttons inside whatever grid HTML
    // is currently in the DOM — called both after the server-rendered
    // initial page load AND after every AJAX refresh from fetchGrid().
    // (Row selection itself uses inline onclick/onchange in the Razor
    // partial, so it works with either source of HTML automatically —
    // no separate wiring needed for that part.)
    // ---------------------------------------------------------------
    function wireGridEvents() {
        $gridContainer.querySelectorAll('th.sortable').forEach(function (th) {
            th.addEventListener('click', function () {
                var col = th.dataset.sort;
                if (state.sortColumn === col) {
                    state.sortDirection = state.sortDirection === 'ASC' ? 'DESC' : 'ASC';
                } else {
                    state.sortColumn = col;
                    state.sortDirection = 'ASC';
                }
                state.pageIndex = 1;
                fetchGrid();
            });
        });

        var pager = $gridContainer.querySelector('.ft-grid-pager');
        if (!pager) return;

        var totalPages = parseInt(pager.dataset.totalPages, 10) || 1;

        var $first = pager.querySelector('.btnPagerFirst');
        var $prev = pager.querySelector('.btnPagerPrev');
        var $next = pager.querySelector('.btnPagerNext');
        var $last = pager.querySelector('.btnPagerLast');

        if ($first) $first.addEventListener('click', function () { goToPage(1); });
        if ($prev) $prev.addEventListener('click', function () { goToPage(state.pageIndex - 1); });
        if ($next) $next.addEventListener('click', function () { goToPage(state.pageIndex + 1); });
        if ($last) $last.addEventListener('click', function () { goToPage(totalPages); });
    }

    function goToPage(page) {
        if (page < 1) page = 1;
        state.pageIndex = page;
        fetchGrid();
    }

    // ---------------------------------------------------------------
    // Sync JS paging state from the server-rendered pager on first
    // load, so Next/Prev/sort continue from wherever the SSR grid
    // actually landed (e.g. if the Index action was hit with query
    // params) instead of always assuming page 1 / the default size.
    // ---------------------------------------------------------------
    function initStateFromDom() {
        var pager = $gridContainer.querySelector('.ft-grid-pager');
        if (!pager) return;

        state.pageIndex = parseInt(pager.dataset.pageIndex, 10) || 1;
        state.pageSize = parseInt(pager.dataset.pageSize, 10) || state.pageSize;
        if ($pageSize) $pageSize.value = String(state.pageSize);
    }

    // ---------------------------------------------------------------
    // Row selection (MULTI-select) — every checked row's id lives in
    // `selectedIds`. Delete / Active / Inactive act on however many
    // are checked (>=1); Edit only makes sense for exactly one, so
    // it stays disabled unless the count is exactly 1.
    // Clicking anywhere on a row toggles THAT row's own checkbox
    // (rather than replacing the whole selection), so multiple rows
    // can be picked the normal checkbox-grid way.
    // ---------------------------------------------------------------
    function clearSelection() {
        selectedIds.clear();
        setToolbarEnabled();
    }

    function setToolbarEnabled() {
        var count = selectedIds.size;
        if ($btnEdit) $btnEdit.disabled = count !== 1;
        if ($btnDelete) $btnDelete.disabled = count === 0;
        if ($btnActive) $btnActive.disabled = count === 0;
        if ($btnInactive) $btnInactive.disabled = count === 0;
    }

    // Called by the checkbox's onchange — the single source of truth
    // for selection state. Checking adds the id, unchecking removes it.
    function onCheckboxChange(id, checkboxEl) {
        var trEl = checkboxEl.closest('tr.item-row');
        if (checkboxEl.checked) {
            selectedIds.add(id);
            if (trEl) trEl.classList.add('row-selected');
        } else {
            selectedIds.delete(id);
            if (trEl) trEl.classList.remove('row-selected');
        }
        setToolbarEnabled();
    }

    // Called by the row's onclick — toggles that row's own checkbox
    // (checkbox onclick has stopPropagation, so this only fires when
    // the click landed elsewhere on the row) and routes through the
    // same onCheckboxChange logic above so the two stay in sync.
    function selectItem(id, trEl) {
        var checkbox = trEl.querySelector('.ft-row-checkbox');
        if (!checkbox) return;
        checkbox.checked = !checkbox.checked;
        onCheckboxChange(id, checkbox);
    }

    function editSelected() {
        if (selectedIds.size !== 1) return;
        var id = selectedIds.values().next().value;
        window.location.href = '/FeeTemplate/Add?id=' + id;
    }

    function deleteSelected() {
        if (selectedIds.size === 0) return;
        var ids = Array.from(selectedIds);

        Swal.fire({
            title: 'Are you sure?',
            text: 'You are about to delete ' + ids.length + ' Fee Template' + (ids.length > 1 ? 's' : '') + '. This action cannot be undone!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            customClass: { confirmButton: 'btn btn-danger me-2', cancelButton: 'btn btn-secondary' },
            buttonsStyling: false
        }).then(function (result) {
            if (!result.isConfirmed) return;

            fetch('/FeeTemplate/Delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ids)
            })
                .then(function (r) { return r.json(); })
                .then(function (res) {
                    if (res && res.RESULT === 1) {
                        alertSuccess(res.MESSAGE || 'Fee Template(s) deleted successfully.', function () {
                            fetchGrid();
                        });
                    } else {
                        alertError((res && res.MESSAGE) || 'Failed to delete Fee Template(s).');
                    }
                })
                .catch(function () {
                    alertError('An error occurred while deleting.');
                });
        });
    }

    // ---------------------------------------------------------------
    // Status toggle — used both by the per-row switch and the
    // toolbar Active / Inactive buttons.
    //
    // NOTE: this still calls POST /FeeTemplate/ToggleStatus, which is
    // not on the controller yet (only Save / Delete / GetByID /
    // GetPageIndex / GetFeeHeadDropdown exist there today). Add:
    //
    //   [HttpPost]
    //   public async Task<IActionResult> ToggleStatus(int id, bool isActive)
    //
    // or tell me and I'll wire it through Save instead.
    // ---------------------------------------------------------------
    function toggleStatus(id, isActive, switchEl) {
        if (!id) return Promise.resolve();

        return fetch('/FeeTemplate/ToggleStatus?id=' + id + '&isActive=' + isActive, {
            method: 'POST'
        })
            .then(function (r) { return r.json(); })
            .then(function (res) {
                if (!res || res.RESULT !== 1) {
                    if (switchEl) switchEl.checked = !isActive; // revert on failure
                    alertError((res && res.MESSAGE) || 'Failed to update status.');
                }
            })
            .catch(function () {
                if (switchEl) switchEl.checked = !isActive;
                alertError('An error occurred while updating status.');
            });
    }

    function toggleSelectedStatus(isActive) {
        if (selectedIds.size === 0) return;

        var promises = Array.from(selectedIds).map(function (id) {
            var row = $gridContainer.querySelector('tr.item-row[data-id="' + id + '"]');
            var switchEl = row ? row.querySelector('.form-switch input[type="checkbox"]') : null;
            if (switchEl) switchEl.checked = isActive;
            return toggleStatus(id, isActive, switchEl);
        });

        Promise.all(promises).then(function () {
            fetchGrid();
        });
    }

    // ---------------------------------------------------------------
    // Export / Print — hook up to your existing export endpoint.
    // type: 0=Copy, 1=CSV, 2=Excel, 3=PDF, 4=Print
    // ---------------------------------------------------------------
    function triggerExport(type) {
        alertWarning('Export/Print is not wired to an endpoint yet.');
    }

    // ---------------------------------------------------------------
    // Filters dropdown: Apply / Reset / badges
    // ---------------------------------------------------------------
    function applyFilters() {
        state.classId = $class.value || '';
        state.classLabel = $class.options[$class.selectedIndex] ? $class.options[$class.selectedIndex].textContent : '';
        state.sectionId = $section.value || '';
        state.sectionLabel = $section.options[$section.selectedIndex] ? $section.options[$section.selectedIndex].textContent : '';
        state.installmentId = $installment.value || '';
        state.installmentLabel = $installment.options[$installment.selectedIndex] ? $installment.options[$installment.selectedIndex].textContent : '';
        state.isActive = $isActive.value || '';
        state.pageSize = parseInt($pageSize.value, 10) || 10;
        state.pageIndex = 1;

        renderBadges();
        fetchGrid();
        closeFilterDropdown();
    }

    function resetFilterInputs() {
        $class.value = '';
        $section.innerHTML = '<option value="">All</option>';
        $installment.value = '';
        $isActive.value = '';
        $pageSize.value = '10';
    }

    function resetAllFilters() {
        resetFilterInputs();
        $searchText.value = '';

        state.classId = '';
        state.classLabel = '';
        state.sectionId = '';
        state.sectionLabel = '';
        state.installmentId = '';
        state.installmentLabel = '';
        state.isActive = '';
        state.searchText = '';
        state.pageSize = 10;
        state.pageIndex = 1;

        renderBadges();
        fetchGrid();
    }

    function renderBadges() {
        var badges = [];
        if (state.classId) badges.push({ label: 'Class: ' + state.classLabel, key: 'classId' });
        if (state.sectionId) badges.push({ label: 'Section: ' + state.sectionLabel, key: 'sectionId' });
        if (state.installmentId) badges.push({ label: 'Installment: ' + state.installmentLabel, key: 'installmentId' });
        if (state.isActive) badges.push({ label: 'Status: ' + (state.isActive === 'true' ? 'Active' : 'Inactive'), key: 'isActive' });

        if (badges.length === 0) {
            $badgeRow.style.display = 'none';
            $badgeContainer.innerHTML = '';
            return;
        }

        $badgeRow.style.display = '';
        $badgeContainer.innerHTML = '';
        badges.forEach(function (b) {
            var span = document.createElement('span');
            span.className = 'badge bg-light text-dark border d-inline-flex align-items-center gap-1';
            span.innerHTML = b.label + ' <i class="ti ti-x ms-1" style="cursor:pointer" data-key="' + b.key + '"></i>';
            span.querySelector('i').addEventListener('click', function () {
                clearOneFilter(b.key);
            });
            $badgeContainer.appendChild(span);
        });
    }

    function clearOneFilter(key) {
        if (key === 'classId') {
            $class.value = '';
            $section.innerHTML = '<option value="">All</option>';
            state.classId = '';
            state.classLabel = '';
            state.sectionId = '';
            state.sectionLabel = '';
        } else if (key === 'sectionId') {
            $section.value = '';
            state.sectionId = '';
            state.sectionLabel = '';
        } else if (key === 'installmentId') {
            $installment.value = '';
            state.installmentId = '';
            state.installmentLabel = '';
        } else if (key === 'isActive') {
            $isActive.value = '';
            state.isActive = '';
        }
        state.pageIndex = 1;
        renderBadges();
        fetchGrid();
    }

    function closeFilterDropdown() {
        var toggle = document.getElementById('btnFilterToggleFT');
        if (window.bootstrap && toggle) {
            var dd = bootstrap.Dropdown.getInstance(toggle) || new bootstrap.Dropdown(toggle);
            dd.hide();
        }
    }

    // ---------------------------------------------------------------
    // Search (debounced, applies immediately — not staged behind Apply)
    // ---------------------------------------------------------------
    $searchText.addEventListener('input', function () {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(function () {
            state.searchText = $searchText.value || '';
            state.pageIndex = 1;
            fetchGrid();
        }, 400);
    });

    if ($btnApplyFilters) $btnApplyFilters.addEventListener('click', applyFilters);
    if ($btnResetFilters) $btnResetFilters.addEventListener('click', function () {
        resetFilterInputs();
        applyFilters();
    });
    if ($btnResetAllFilters) $btnResetAllFilters.addEventListener('click', resetAllFilters);
    if ($btnCloseFilter) $btnCloseFilter.addEventListener('click', closeFilterDropdown);

    // ---------------------------------------------------------------
    // Alerts (Swal) — same look used across the app
    // ---------------------------------------------------------------
    function alertWarning(text) {
        Swal.fire({
            icon: 'warning', title: 'Warning', text: text,
            confirmButtonText: 'OK',
            customClass: { confirmButton: 'btn btn-success' }, buttonsStyling: false
        });
    }
    function alertError(text) {
        Swal.fire({
            icon: 'error', title: 'Error', text: text,
            confirmButtonText: 'OK',
            customClass: { confirmButton: 'btn btn-danger' }, buttonsStyling: false
        });
    }
    function alertSuccess(text, onOk) {
        Swal.fire({
            icon: 'success', title: 'Success', text: text,
            confirmButtonText: 'OK',
            customClass: { confirmButton: 'btn btn-success' }, buttonsStyling: false
        }).then(function () { if (typeof onOk === 'function') onOk(); });
    }

    // ---------------------------------------------------------------
    // Public API used by inline onclick/onchange handlers in the
    // .cshtml files
    // ---------------------------------------------------------------
    window.FeeTemplateGrid = {
        selectItem: selectItem,
        onCheckboxChange: onCheckboxChange,
        editSelected: editSelected,
        deleteSelected: deleteSelected,
        toggleStatus: toggleStatus,
        toggleSelectedStatus: toggleSelectedStatus,
        triggerExport: triggerExport
    };

    // ---------------------------------------------------------------
    // Initial load — the grid HTML is already server-rendered in
    // Index.cshtml, so we DON'T re-fetch it here. We just sync paging
    // state from what's on the page and wire up sort/pager clicks.
    // ---------------------------------------------------------------
    document.addEventListener('DOMContentLoaded', function () {
        initStateFromDom();
        wireGridEvents();
    });

})(window);