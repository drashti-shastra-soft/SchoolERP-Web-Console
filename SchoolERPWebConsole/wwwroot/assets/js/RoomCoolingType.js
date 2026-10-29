// Letters-only fields
$('#txtRoomTypeName, #txtDisplayLabel').on('input', function () {
    this.value = this.value.replace(/[^a-zA-Z\s]/g, '');
});

function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#RoomTypeTable')) {
        const table = $('#RoomTypeTable').DataTable();
        table.button(index).trigger();
    }
}

// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_roomcoolingtype';
let appliedFilters = {};
try {
    const stored = sessionStorage.getItem(FILTER_KEY);
    if (stored) appliedFilters = JSON.parse(stored);
} catch (e) { appliedFilters = {}; }

function saveAppliedFilters() {
    try { sessionStorage.setItem(FILTER_KEY, JSON.stringify(appliedFilters)); }
    catch (e) { console.warn('sessionStorage unavailable'); }
}

function clearAppliedFilters() {
    appliedFilters = {};
    try { sessionStorage.removeItem(FILTER_KEY); } catch (e) { }
}

function submitForm() {
    // Sync hidden form fields from dropdowns before submit
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
    const searchEl = document.getElementById('txtSearchInput');

    if (sessionEl) document.getElementById('hdnSessionID').value = sessionEl.value;
    if (companyEl) document.getElementById('hdnCompanyId').value = companyEl.value;
    if (searchEl) document.getElementById('hdnSearch').value = searchEl.value.trim();

    const form = document.getElementById('frmSearch');
    const params = new URLSearchParams(new FormData(form)).toString();

    loadRoomTypePartial(params);
}

function applyFilters() {
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
    const searchEl = document.getElementById('txtSearchInput');

    // Search
    const searchVal = searchEl?.value.trim() ?? '';
    document.getElementById('hdnSearch').value = searchVal;

    if (searchVal) {
        appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    } else {
        delete appliedFilters['txtSearchInput'];
    }

    // Session
    if (sessionEl?.value && sessionEl.value !== '') {
        appliedFilters['ddlFilterSessions'] = {
            label: 'Session',
            text: sessionEl.options[sessionEl.selectedIndex]?.text || sessionEl.value,
            value: sessionEl.value
        };
    } else delete appliedFilters['ddlFilterSessions'];

    // Company
    if (companyEl?.value && companyEl.value !== '') {
        appliedFilters['ddlFilterCompany'] = {
            label: 'Company',
            text: companyEl.options[companyEl.selectedIndex]?.text || companyEl.value,
            value: companyEl.value
        };
    } else delete appliedFilters['ddlFilterCompany'];

    document.getElementById('hdnPageIndex').value = 1;

    saveAppliedFilters();
    renderFilterBadges();   // ✅ update badges immediately, don't wait on ajax
    submitForm();
}

function renderFilterBadges() {
    const container = document.getElementById('badgeContainer');
    const mainContainer = document.getElementById('activeFilterBadges');
    if (!container || !mainContainer) return;

    // ✅ removed the sessionStorage re-read that lived here before — it could
    // silently overwrite in-memory appliedFilters with stale data if saveAppliedFilters()
    // ever failed. We keep a single source of truth: the in-memory appliedFilters object.

    container.innerHTML = '';
    const activeCount = Object.keys(appliedFilters).length;

    Object.entries(appliedFilters).forEach(([id, { label, text }]) => {
        const badge = document.createElement('span');
        badge.className = 'badge bg-primary-subtle text-primary border border-primary-subtle d-flex align-items-center gap-1 fw-medium px-2 py-1';
        badge.innerHTML = `${label}: ${text} <i class="ti ti-x ms-1 cursor-pointer" onclick="removeFilter('${id}')" style="font-size:10px;"></i>`;
        container.appendChild(badge);
    });

    mainContainer.style.display = activeCount > 0 ? 'block' : 'none';
}

function removeFilter(filterId) {
    // Clear the matching dropdown/input
    if (filterId === 'ddlFilterSessions') {
        const el = document.getElementById('ddlFilterSessions');
        if (el) {
            el.value = '';
            if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
        }
    } else if (filterId === 'ddlFilterCompany') {
        const el = document.getElementById('ddlFilterCompany');
        if (el) {
            el.value = '';
            if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
        }
    } else if (filterId === 'txtSearchInput') {
        const el = document.getElementById('txtSearchInput');
        if (el) el.value = '';
        document.getElementById('hdnSearch').value = '';
    }

    delete appliedFilters[filterId];
    saveAppliedFilters();
    renderFilterBadges();   // ✅ badge was left showing after removal — now updates immediately
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

function resetAllFilters() {
    document.getElementById('txtSearchInput').value = '';
    document.getElementById('hdnSearch').value = '';

    // ✅ properly clear each dropdown's value, not just re-run select2() config
    ['ddlFilterSessions', 'ddlFilterCompany'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = '';
        if (window.jQuery && jQuery(el).data('select2')) {
            jQuery(el).val('').trigger('change');
        }
    });

    clearAppliedFilters();
    document.getElementById('hdnPageIndex').value = 1;
    renderFilterBadges();   // ✅ clear badges visually right away

    // ── Force-close the filter dropdown ─────────────────────────
    const toggleEl = document.getElementById('btnFilterToggle');
    if (toggleEl && window.bootstrap) {
        const dd = bootstrap.Dropdown.getInstance(toggleEl) || new bootstrap.Dropdown(toggleEl);
        dd.hide();
    }

    // ✅ removed the hard `window.location.href = "/RoomType/Index"` redirect —
    // it fired right after submitForm()'s ajax call, aborting it and forcing a
    // full page reload every time Reset was clicked. Now it resets in place,
    // same behavior as Apply Filters / remove filter.
    submitForm();
}

// ✅ Auto-apply filter as user types (300ms debounce)
const searchInput = document.getElementById('txtSearchInput');
if (searchInput) {
    let debounceTimer = null;
    searchInput.addEventListener('input', function () {
        const val = this.value.trim();
        document.getElementById('hdnSearch').value = val;
        if (val) {
            appliedFilters['txtSearchInput'] = { label: 'Search', text: val };
        } else {
            delete appliedFilters['txtSearchInput'];
        }
        saveAppliedFilters();
        renderFilterBadges();   // ✅ badges now update live while typing too

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
            document.getElementById('hdnPageIndex').value = 1;
            submitForm();
        }, 300);
    });

    // Enter key — submit immediately without waiting for debounce
    searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(debounceTimer);
            applyFilters();
        }
    });
}

// ========================================
// DOMContentLoaded — init DataTable + UI
// ========================================
document.addEventListener('DOMContentLoaded', function () {
    var companyname = localStorage.getItem("comName");
    // ── DataTable (export only) ───────────────────────────────────────
    if ($.fn.DataTable.isDataTable('#RoomTypeTable')) {
        $('#RoomTypeTable').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    try {
        window.exportTable = $('#RoomTypeTable').DataTable({
            dom: 'Bfrtip',
            buttons: [
                { extend: 'copy', title: `Room Type - ${companyname}`, exportOptions: { columns: [1, 2, 3] } },
                { extend: 'csv', title: `Room Type - ${companyname}`, exportOptions: { columns: [1, 2, 3] } },
                { extend: 'excel', title: `Room Type - ${companyname}`, exportOptions: { columns: [1, 2, 3] } },
                { extend: 'pdf', title: `Room Type - ${companyname}`, exportOptions: { columns: [1, 2, 3] } },
                { extend: 'print', title: `Room Type - ${companyname}`, exportOptions: { columns: [1, 2, 3] } }
            ],
            searching: false,
            paging: false,
            info: false,
            ordering: false,
            language: {
                emptyTable: 'No records found.',
                zeroRecords: 'No matching records found.'
            }
        });
    } catch (e) {
        console.warn('DataTable init warning (RoomTypeTable):', e);
    }

    // ── Clear stale filters on every full page load / redirect back ────
    clearAppliedFilters();
    renderFilterBadges();

    // ── Wire up Apply Filters button — moved to top level, was previously
    //    trapped inside the pincode input handler and never fired on this
    //    page because #txtPinCode doesn't exist here. Also preventDefault()
    //    is now called since the button is type="submit" inside #frmSearch —
    //    without it, the browser's native form submission (full page reload)
    //    was racing against our ajax submitForm() call. ─────────────────
    document.getElementById('btnApplyFilters')?.addEventListener('click', function (e) {
        e.preventDefault();
        applyFilters();
    });

    document.getElementById('btnResetFilters')?.addEventListener('click', function (e) {
        e.preventDefault();
        resetAllFilters();
    });

    // ── PinCode autocomplete + Country/State/City cascade ──────────────
    // (kept self-contained so its absence on this page can never block the
    //  filter/badge wiring above, unlike before.)
    const input = document.getElementById('txtPinCode');
    const list = document.getElementById('pinCodeSuggestions');

    // ── Country -> State cascade (used on Add/Edit form even without pincode) ──
    const formCountry = document.getElementById('ddlCountry');
    if (formCountry) {
        const preselectState = document.getElementById('hdnSelectedStateId')?.value;
        const preselectCity = document.getElementById('hdnSelectedCityId')?.value;

        if (window.jQuery) {
            jQuery(formCountry).on('change', function () {
                loadStatesByCountry(this.value, 'ddlState');
            });
        } else {
            formCountry.addEventListener('change', function () {
                loadStatesByCountry(this.value, 'ddlState');
            });
        }

        if (formCountry.value) {
            loadStatesByCountry(formCountry.value, 'ddlState', preselectState).then(() => {
                const stateEl = document.getElementById('ddlState');
                if (stateEl && stateEl.value) {
                    loadCitiesByState(stateEl.value, 'ddlCity', preselectCity);
                }
            });
        }
    }

    const formState = document.getElementById('ddlState');
    if (formState) {
        if (window.jQuery) {
            jQuery(formState).on('change', function () {
                loadCitiesByState(this.value, 'ddlCity');
            });
        } else {
            formState.addEventListener('change', function () {
                loadCitiesByState(this.value, 'ddlCity');
            });
        }
    }

    if (!input || !list) {
        console.warn('PinCode autocomplete: input or list element not found (expected on RoomType page)');
        return; // ✅ safe now — everything critical already ran above this point
    }

    let debounceTimer;
    let currentItems = [];

    input.addEventListener('input', function () {
        const term = this.value.trim();
        clearTimeout(debounceTimer);

        if (term.length < 2) {
            hideList();
            return;
        }
        debounceTimer = setTimeout(() => fetchPinCodes(term), 300);
    });

    async function fetchPinCodes(term) {
        try {
            const res = await fetch(`/Hostel/SearchPostalCode?term=${encodeURIComponent(term)}`);
            const result = await res.json();

            if (result.success && result.data && result.data.length > 0) {
                currentItems = result.data;
                renderList(currentItems);
            } else {
                hideList();
            }
        } catch (err) {
            console.error('SearchPostalCode error:', err);
            hideList();
        }
    }

    function renderList(items) {
        list.innerHTML = '';
        items.forEach((item, idx) => {
            const li = document.createElement('li');
            li.className = 'list-group-item list-group-item-action';
            li.style.cursor = 'pointer';
            li.textContent = `${item.postalCode ?? item.postalCode}`;
            li.addEventListener('click', () => selectPinItem(idx));
            list.appendChild(li);
        });
        list.style.display = 'block';
    }

    async function selectPinItem(idx) {
        const item = currentItems[idx];
        input.value = item.postalCode ?? item.postalCode;
        hideList();
        const countryId = item.countryId ?? item.countryId;
        const stateId = item.stateId ?? item.stateId;
        const cityId = item.cityId ?? item.cityId;

        if (countryId) {
            $('#ddlCountry').val(countryId).trigger('change.select2');
            $('#ddlCountry').trigger('change');
        }

        if (countryId && stateId) {
            await loadStatesByCountry(countryId, 'ddlState', stateId);
        }

        if (stateId && cityId) {
            await loadCitiesByState(stateId, 'ddlCity', cityId);
        }
    }

    function hideList() {
        list.style.display = 'none';
        list.innerHTML = '';
    }

    document.addEventListener('click', function (e) {
        if (!input.contains(e.target) && !list.contains(e.target)) {
            hideList();
        }
    });
});

const permCanAdd = window.canAdd;
const permCanEdit = window.canEdit;
const permCanDelete = window.canDelete;
const IV = window.InlineFormValidation || {
    clearMap: (map) => Object.keys(map).forEach(k => {
        document.getElementById(k)?.classList.remove('is-invalid');
        const err = document.getElementById(map[k]); if (err) err.textContent = '';
    }),
    setFieldError: (id, errId, msg) => {
        document.getElementById(id)?.classList.add('is-invalid');
        const err = document.getElementById(errId); if (err) err.textContent = msg;
    },
    setNotice: (id, msg) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<div class="alert alert-danger alert-dismissible fade show" role="alert">${msg}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
    },
    clearNotice: (id) => { const el = document.getElementById(id); if (el) el.innerHTML = ''; },
    bindAutoClear: (map) => Object.keys(map).forEach(k => document.getElementById(k)?.addEventListener('input', () => {
        document.getElementById(k)?.classList.remove('is-invalid');
        const err = document.getElementById(map[k]); if (err) err.textContent = '';
    }))
};
window.selectedClassId = 0;
const classFieldMap = { txtRoomTypeName: 'errTxtHostelTypeName' };

$(document).ready(function () {

    $('#btnFilterToggle').on('shown.bs.dropdown', function () {
        $('#ddlFilterCompany').select2({
            dropdownParent: $('#filter-dropdown'),
            width: '100%'
        });

        $('#ddlFilterSessions').select2({
            dropdownParent: $('#filter-dropdown'),
            width: '100%'
        });
    });

    if ($('#ddlSections').length) {
        $('#ddlSections').select2({
            placeholder: "Select Sections",
            allowClear: true
        });
    }
});

function clearModalValidation() {
    IV.clearMap(classFieldMap);
    IV.clearNotice('classModalNotice');
}

IV.bindAutoClear(classFieldMap);

function selectItem(id, row) {
    IV.clearNotice('classPageNotice');
    window.selectedClassId = id;
    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));
    row.classList.add('bg-light');
    const btnEdit = document.getElementById('btnEdit');
    const btnDelete = document.getElementById('btnDelete');
    if (btnEdit && permCanEdit) btnEdit.disabled = false;
    if (btnDelete && permCanDelete) btnDelete.disabled = false;
    let checkedCount = $('.student-checkbox:checked').length;
    $('#btnDelete').prop('disabled', checkedCount === 0);
    // Edit sirf 1 record select hone par
    $('#btnEdit').prop('disabled', checkedCount !== 1);
    $('#btnActive').prop('disabled', checkedCount === 0);
    $('#btnInactive').prop('disabled', checkedCount === 0);
}

async function editSelected() {
    if (!permCanEdit) {
        IV.setNotice('classPageNotice', 'You do not have permission to edit.');
        return;
    }
    if (window.selectedClassId === 0) return;
    IV.clearNotice('classPageNotice');
    clearModalValidation();
    try {
        if (window.selectedClassId) {
            location.href = `/RoomType/Add/${window.selectedClassId}`;
        }
    } catch (err) {
        console.error(err);
    }
}

async function deleteSelected() {
    if (!permCanDelete) {
        IV.setNotice('classPageNotice', 'You do not have permission to delete.');
        return;
    }

    let selectedIds = [];
    $('.student-checkbox:checked').each(function () {
        selectedIds.push(parseInt($(this).val()));
    });
    if (selectedIds.length === 0) {
        alert("Please select at least one Room Type.");
        return;
    }
    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to delete this Room Type record. This action cannot be undone!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        customClass: {
            confirmButton: 'btn btn-danger me-2',
            cancelButton: 'btn btn-secondary'
        },
        buttonsStyling: false
    }).then((result) => {
        if (result.isConfirmed) {
            $.ajax({
                url: '/RoomType/Delete',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Room type record has been deleted.', 'success')
                            .then(() => location.reload());
                    } else {
                        Swal.fire('Error!', res.message || 'Failed to delete room Type.', 'error');
                    }
                },
                error: function () {
                    Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                }
            });
        }
    });
}

async function saveItem() {
    const cid = parseInt(document.getElementById('txtItemId').value);
    if (cid === 0 && !permCanAdd) {
        IV.setNotice('classModalNotice', 'You do not have permission to add.');
        return;
    }
    if (cid > 0 && !permCanEdit) {
        IV.setNotice('classModalNotice', 'You do not have permission to edit.');
        return;
    }
    clearModalValidation();

    const name = document.getElementById('txtRoomTypeName').value.trim();
    if (!name) {
        IV.setFieldError('txtRoomTypeName', 'errTxtHostelTypeName', 'Room Type is required.');
        return;
    }

    const selectedGender = $('.ddlGender').val();
    const description = $('#txtDescription').val();
    const companyId = $('#hdnCompanyId').val();
    const sessionID = $('#hdnSessionID').val();
    const displayLabel = $('#txtDisplayLabel').val();
    const isActiveEl = document.getElementById('isActive');
    const isActive = isActiveEl ? isActiveEl.checked : false;
    const isEdit = cid > 0;
    const data = {
        roomCoolingTypeId: cid,
        roomCoolingTypeName: name,
        displayLabel: displayLabel || name,
        description: description,
        isActive: isActive,
        companyId: companyId,
        sessionID: sessionID
    };

    try {
        const r = await fetch('/RoomType/Save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        const res = await r.json();
        if (res.success) {
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: isEdit
                    ? 'Room type has been updated successfully.'
                    : 'Room type has been added successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            }).then(() => {
                window.location.href = '/RoomType/Index';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.message || 'Failed to save room type.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-danger' },
                buttonsStyling: false
            });
        }
    } catch (err) {
        console.error(err);
        IV.setNotice('classModalNotice', 'Could not save room type.');
    }
}


async function toggleStatus(id, isActive, checkboxEl) {
    if (!permCanEdit) {
        IV.setNotice('classPageNotice', 'You do not have permission to change status.');
        if (checkboxEl) {
            checkboxEl.checked = !isActive;
            $(checkboxEl).trigger('change'); // ensure UI/plugin state syncs
        }
        location.reload();
        return;
    }

    let sectionIds = [];
    let checkedBoxes = [];
    $('.student-checkbox:checked').each(function () {
        sectionIds.push(parseInt($(this).val()));
        checkedBoxes.push(this);
    });

    // single-row toggle (checkboxEl passed from the row switch)
    if (sectionIds.length === 0) {
        if (id != 0) {
            sectionIds.push(parseInt(id));
            if (checkboxEl) checkedBoxes.push(checkboxEl);
        } else {
            showToast('Please select at least one user', false);
            return;
        }
    }

    const request = { ids: sectionIds.join(','), isActive: isActive };

    // helper to revert every affected checkbox/switch
    // helper to revert every affected checkbox
    //function revertAll() {
    //    checkedBoxes.forEach(cb => { cb.checked = !isActive; });
    //}
    function revertAll() {
        checkedBoxes.forEach(cb => {
            if (cb.classList.contains('student-checkbox')) {
                // Bulk action path: this is a row-selection checkbox, not the status switch.
                // On cancel/failure we deselect it — we never toggle its "value" based on isActive.
                cb.checked = false;
            } else {
                // Single-row inline switch path: revert the switch to the state it had
                // before the attempted change.
                cb.checked = !isActive;
            }
        });
    }

    try {
        const config = isActive
            ? { icon: 'question', title: 'Activate Record(s)?', text: 'Activating this record will make it visible and available for use across the system. Do you want to continue?', confirmText: 'Yes, Activate', confirmBtnClass: 'btn btn-success me-2', successTitle: 'Activated Successfully!', successText: 'The selected record(s) have been activated and are now available for use.' }
            : { icon: 'warning', title: 'Deactivate Record(s)?', text: 'Deactivating this record will hide it from the system and prevent it from being used. Do you want to continue?', confirmText: 'Yes, Deactivate', confirmBtnClass: 'btn btn-danger me-2', successTitle: 'Deactivated Successfully!', successText: 'The selected record(s) have been deactivated and are no longer available for use.' };

        Swal.fire({
            icon: config.icon,
            title: config.title,
            text: config.text,
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, proceed!',
            customClass: { confirmButton: 'btn btn-danger me-2', cancelButton: 'btn btn-secondary' },
            buttonsStyling: false
        }).then((result) => {
            if (result.isConfirmed) {
                $.ajax({
                    url: '/RoomType/ToggleStatusChange',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(request),
                    success: function (res) {
                        if (res.success) {
                            Swal.fire('Updated!', res.message || 'Status updated successfully.', 'success')
                                .then(() => location.reload());
                        } else {
                            revertAll();
                            updateButtonStates();
                            Swal.fire('Error!', res.message || 'Failed to update status.', 'error');
                        }
                    },
                    error: function (xhr) {
                        revertAll();
                        updateButtonStates();
                        console.error('Status update error:', xhr.status, xhr.responseText);
                        Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                    }
                });
            } else {
                // Cancel clicked — revert whatever was optimistically toggled,
                // and fully resync selection state + buttons + row highlight.
                revertAll();
                selectedId = 0;
                window.selectedId = 0;
                document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));
                updateButtonStates();
            }
        });
    }
    catch (err) {
        revertAll();
        console.error(err);
        IV.setNotice('sectionPageNotice', 'Could not update status.');
        location.reload();
    }
}

// ✅ Popper flip/overflow fix for the filter dropdown — merged into the
//    single 'shown.bs.dropdown' handler above instead of a second separate
//    binding on the same event (both used to fire independently; harmless
//    but redundant — consolidated here as its own concern for clarity).
$('#btnFilterToggle').on('shown.bs.dropdown', function () {
    const dropdownInstance = bootstrap.Dropdown.getInstance(this);
    if (dropdownInstance && dropdownInstance._popper) {
        dropdownInstance._popper.setOptions({
            modifiers: [
                { name: 'flip', enabled: false },
                { name: 'preventOverflow', enabled: false }
            ]
        });
    }
});

// ========================================
// Partial reload — used by submitForm() for filter/search/pagination
// ========================================
function loadRoomTypePartial(queryString) {
    const container = document.getElementById('roomTypeTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/RoomType/GetRoomTypePartial?${queryString}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to load subjects');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            container.style.opacity = '1';

            if ($.fn.DataTable.isDataTable('#RoomTypeTable')) {
                $('#RoomTypeTable').DataTable().destroy();
            }

            $.fn.dataTable.ext.errMode = 'none';

            try {
                exportTable = $('#RoomTypeTable').DataTable({
                    dom: 'Bfrtip',
                    buttons: [
                        { extend: 'copy', exportOptions: { columns: [1, 2, 3], rows: ':visible' } },
                        { extend: 'csv', exportOptions: { columns: [1, 2, 3], rows: ':visible' } },
                        { extend: 'excel', exportOptions: { columns: [1, 2, 3], rows: ':visible' } },
                        { extend: 'pdf', exportOptions: { columns: [1, 2, 3], rows: ':visible' } },
                        { extend: 'print', exportOptions: { columns: [1, 2, 3], rows: ':visible' } }
                    ],
                    searching: false,
                    paging: false,
                    info: false,
                    ordering: false,
                    language: {
                        emptyTable: 'No records found.',
                        zeroRecords: 'No matching records found.'
                    }
                });
            } catch (e) {
                console.warn('DataTable init warning (RoomTypeTable partial):', e);
            }

            if (typeof initStickyTable === 'function') initStickyTable();
            if (typeof stickyHeader === 'function') stickyHeader();

            updateButtonStates();
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.toast) window.toast.error('Could not refresh the list.');
        });
}

// ✅ Pagination click interception, scoped to the room type container
document.addEventListener('click', function (e) {
    const link = e.target.closest('#roomTypeTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('PageIndex') || 1;
    loadRoomTypePartial(query); // ✅ was calling the wrong function: loadHostelPartial (didn't exist here)
    history.replaceState(null, '', href);
});

// ========================================
// Helpers
// ========================================
function updateButtonStates() {
    const count = $('.student-checkbox:checked').length;
    $('#btnEdit').prop('disabled', count !== 1);
    $('#btnDelete').prop('disabled', count === 0);
    $('#btnActive').prop('disabled', count === 0);
    $('#btnInactive').prop('disabled', count === 0);
}