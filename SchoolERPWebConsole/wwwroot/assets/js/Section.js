function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#sectionsTable')) {
        const table = $('#sectionsTable').DataTable();
        table.button(index).trigger();
    }
}
// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_class';
let appliedFilters = {};
sessionStorage.removeItem(FILTER_KEY);
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

// ✅ CHANGED — was: document.getElementById('frmSearch').submit();
// Now builds the query string from the form and loads via AJAX instead of a full page submit.
function submitForm() {
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
    if (sessionEl) document.getElementById('hdnSessionId').value = sessionEl.value;
    if (companyEl) document.getElementById('hdnCompanyId').value = companyEl.value;

    const form = document.getElementById('frmSearch');
    const params = new URLSearchParams(new FormData(form)).toString();

    loadSectionsPartial(params); // ✅ NEW — AJAX call instead of form.submit()
}

// ✅ NEW — fetches just the table+pagination partial and swaps it in, no full reload
function loadSectionsPartial(queryString) {
    const container = document.getElementById('sectionsTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/Section/GetSectionsPartial?${queryString}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to load sections');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            container.style.opacity = '1';

            // Re-init DataTable export buttons since the DOM was replaced
            if ($.fn.DataTable.isDataTable('#sectionsTable')) {
                $('#sectionsTable').DataTable().destroy();
            }
            exportTable = $('#sectionsTable').DataTable({
                dom: 'Bfrtip',
                buttons: [
                     { extend: 'copy', exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
                     { extend: 'csv', exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
                     { extend: 'excel', exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
                     { extend: 'pdf', exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
                     { extend: 'print', exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } }
                ],
                searching: false,
                paging: false,
                info: false,
                ordering: false
            });

            // Reset selection-dependent buttons since rows are freshly rendered
            updateButtonStates();
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.toast) window.toast.error('Could not refresh the list.');
        });
}

// ✅ NEW — intercepts pagination link clicks so they go through AJAX instead of full navigation
document.addEventListener('click', function (e) {
    const link = e.target.closest('#sectionsTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    loadSectionsPartial(query);

    // keep the address bar in sync without triggering a real navigation
    history.replaceState(null, '', href);
});



function renderFilterBadges() {
    const container = document.getElementById('badgeContainer');
    const mainContainer = document.getElementById('activeFilterBadges');
    if (!container || !mainContainer) return;

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
function applyFilters() {
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
    const searchEl = document.getElementById('txtSearchInput');

    // Search
    const searchVal = searchEl?.value.trim();
    if (searchVal) appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    else delete appliedFilters['txtSearchInput'];

    // Session
    if (sessionEl?.value && sessionEl.value !== '') {
        appliedFilters['ddlFilterSessions'] = {
            label: 'Session',
            text: sessionEl.options[sessionEl.selectedIndex]?.text || sessionEl.value
        };
    } else delete appliedFilters['ddlFilterSessions'];

    // Company
    if (companyEl?.value && companyEl.value !== '') {
        appliedFilters['ddlFilterCompany'] = {
            label: 'Company',
            text: companyEl.options[companyEl.selectedIndex]?.text || companyEl.value
        };
    } else delete appliedFilters['ddlFilterCompany'];

    saveAppliedFilters();
    renderFilterBadges(); // ✅ NEW — badges now update immediately, not just on page load
}

function removeFilter(filterId) {
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
    renderFilterBadges(); // ✅ NEW — remove the clicked badge immediately
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

// ✅ CHANGED — this is now the SINGLE source of truth for "reset all".
// The DOMContentLoaded btnResetFilters listener below now just calls this,
// instead of duplicating the logic (which caused the double-submit race).
function resetAllFilters() {
    document.getElementById('txtSearchInput').value = '';
    document.getElementById('hdnSearch').value = '';

    ['ddlFilterSessions', 'ddlFilterCompany'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = '';
        if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
    });

    clearAppliedFilters();
    renderFilterBadges();
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}
// ========================================
// DOMContentLoaded — init DataTable + UI
// ========================================
document.addEventListener('DOMContentLoaded', () => {  
    
    document.getElementById('btnApplyFilters')?.addEventListener('click', () => {
        document.getElementById('hdnPageIndex').value = 1;
        document.getElementById('hdnSearch').value = document.getElementById('txtSearchInput').value;
        applyFilters();
        submitForm();
    });
    var companyname = localStorage.getItem("comName");
    function resetAllFilters() {
        clearAppliedFilters();
        window.location.href = window.location.pathname; // ✅ full reload, no query string
    }
    // ── DataTable (export only) ───────────────────────────────────────
    if ($.fn.DataTable.isDataTable('#sectionsTable')) {
        $('#sectionsTable').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#sectionsTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Sections - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
            { extend: 'csv', title: `Sections - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
            { extend: 'excel', title: `Sections - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
            { extend: 'pdf', title: `Sections - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
            { extend: 'print', title: `Sections - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false
    });

    // ── Select2 ───────────────────────────────────────────────────────
    try {
        if (window.jQuery && typeof jQuery.fn.select2 === 'function') {
            jQuery('#ddlFilterSessions, #ddlFilterCompany').select2({
                width: '100%',
                dropdownParent: jQuery('#filter-dropdown'),
                allowClear: true,
                placeholder: function () { return jQuery(this).data('placeholder') || 'Select'; }
            });
        }
    } catch (e) {
        console.warn('Select2 init skipped:', e);
    }

    // ── Keep filter dropdown open while interacting inside ────────────
    document.getElementById('filter-dropdown')?.addEventListener('click', e => e.stopPropagation());

    // ── Apply Filters ─────────────────────────────────────────────────
    document.getElementById('btnApplyFilters')?.addEventListener('click', () => {
        document.getElementById('hdnPageIndex').value = 1;
        document.getElementById('hdnSearch').value = document.getElementById('txtSearchInput').value;
        applyFilters();
        submitForm();
    });

    // ── Reset Filters ───────────────────────────────────────────────
    // ✅ CHANGED — was a full duplicate of resetAllFilters()'s body inline here.
    // Now it just calls the single resetAllFilters() function, so there's
    // no risk of double-binding / double AJAX submission if resetAllFilters()
    // is ALSO wired to an onclick in the HTML markup.
    document.getElementById('btnResetFilters')?.addEventListener('click', resetAllFilters);

    // ── Render badges on load ─────────────────────────────────────────
    renderFilterBadges();
});

// ========================================
// Search input — debounced server submit
// ========================================
let searchTimer = null;

document.getElementById('txtSearchInput')?.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        document.getElementById('hdnSearch').value = this.value;
        document.getElementById('hdnPageIndex').value = 1;

        const val = this.value.trim();
        if (val) appliedFilters['txtSearchInput'] = { label: 'Search', text: val };
        else delete appliedFilters['txtSearchInput'];
        saveAppliedFilters();
        renderFilterBadges(); // ✅ NEW — search badge now shows/updates as you type (debounced)

        submitForm();
    }, 700);
});
const permCanAdd = window.canAdd;
const permCanEdit = window.canEdit;
const permCanDelete = window.canDelete;
const IV = window.InlineFormValidation;
const sectionFieldMap = { txtSectionName: 'errTxtSectionName' };
let selectedSectionId = 0;

async function saveItem() {
    const sid = parseInt(document.getElementById('txtItemId').value);
    const companyID = parseInt(document.getElementById('hdnCompanyID').value);
    const sessionID = parseInt(document.getElementById('hdnSessionID').value);
    if (sid === 0 && !permCanAdd) {
        IV.setNotice('sectionModalNotice', 'You do not have permission to add.');
        return;
    }
    if (sid > 0 && !permCanEdit) {
        IV.setNotice('sectionModalNotice', 'You do not have permission to edit.');
        return;
    }
    clearSectionModalValidation();
    const name = document.getElementById('txtSectionName').value.trim();
    if (!name) {
        IV.setFieldError('txtSectionName', 'errTxtSectionName', 'Section is required.');
        return;
    }
    const displayLabel = document.getElementById('txtDisplayLabel').value.trim();
    const data = {
        sectionID: parseInt(document.getElementById('txtItemId').value),
        sectionName: name,
        displayLabel: displayLabel || name,
        isActive: document.getElementById('isActive').checked,
        companyID: companyID,
        sessionID: sessionID
    };
    var sectionID = parseInt(document.getElementById('txtItemId').value);
    const isEdit = sectionID > 0;
    try {
        const resp = await fetch('/Section/Save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const res = await resp.json();
        if (res.success) {
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: isEdit
                    ? 'Section has been updated successfully.'
                    : 'Section has been added successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            }).then(() => {
                window.location.href = '/Section/Index';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.message || 'Failed to save section.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-danger' },
                buttonsStyling: false
            });
        }
    } catch (err) {
        console.error(err);
        IV.setNotice('sectionModalNotice', 'Could not save section.');
    }
}

function clearSectionModalValidation() {
    IV.clearMap(sectionFieldMap);
    IV.clearNotice('sectionModalNotice');
}

IV.bindAutoClear(sectionFieldMap);

function selectItem(id, row) {
    IV.clearNotice('sectionPageNotice');
    selectedSectionId = id;
    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));
    row.classList.add('bg-light');
    const btnEdit = document.getElementById('btnEdit');
    const btnDelete = document.getElementById('btnDelete');
    if (btnEdit && permCanEdit) btnEdit.disabled = false;
    if (btnDelete && permCanDelete) btnDelete.disabled = false;
    let checkedCount = $('.student-checkbox:checked').length;
    $('#btnDelete').prop('disabled', checkedCount === 0);
    $('#btnEdit').prop('disabled', checkedCount !== 1);
    $('#btnActive').prop('disabled', checkedCount === 0);
    $('#btnInactive').prop('disabled', checkedCount === 0);
    $('#btnCopy').prop('disabled', checkedCount === 0);
}

async function editSelected() {
    if (!permCanEdit) {
        IV.setNotice('sectionPageNotice', 'You do not have permission to edit.');
        return;
    }

    if (selectedSectionId === 0) return;
    IV.clearNotice('sectionPageNotice');
    clearSectionModalValidation();
    try {
        if (selectedSectionId) {
            location.href = `/Section/Add/${selectedSectionId}`;
        }
    } catch (err) {
        console.error(err);
        IV.setNotice('sectionPageNotice', 'Could not load section details.');
    }
}

async function deleteSelected() {
    if (!permCanDelete) {
        IV.setNotice('sectionPageNotice', 'You do not have permission to delete.');
        return;
    }

    let selectedIds = [];
    $('.student-checkbox:checked').each(function () {
        selectedIds.push(parseInt($(this).val()));
    });
    if (selectedIds.length === 0) {
        alert("Please select at least one section.");
        return;
    }
    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to delete this section record. This action cannot be undone!",
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
                url: '/Section/Delete',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'section record has been deleted.', 'success')
                            .then(() => loadSectionsPartial(new URLSearchParams(new FormData(document.getElementById('frmSearch'))).toString())); // ✅ CHANGED — was location.reload()
                    } else {
                        Swal.fire('Error!', res.message || 'Failed to delete section.', 'error');
                    }
                },
                error: function () {
                    Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                }
            });
        }
    });
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
                    url: '/Section/ToggleStatus',
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

let exportTable;
$(document).ready(function () {
    var companyname = localStorage.getItem("comName");
    if ($.fn.DataTable.isDataTable('#sectionsTable')) {
        $('#sectionsTable').DataTable().destroy();
    }
    exportTable = $('#sectionsTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Sections - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
            { extend: 'csv', title: `Sections - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
            { extend: 'excel', title: `Sections - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
            { extend: 'pdf', title: `Sections - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
            { extend: 'print', title: `Sections - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false
    });
    $('#btnFilterToggle').on('shown.bs.dropdown', function () {
        var $panel = $('#filter-dropdown');

        if (!$('#ddlFilterCompany').hasClass('select2-hidden-accessible')) {
            $('#ddlFilterCompany').select2({
                placeholder: 'Select company',
                allowClear: true,
                width: '100%',
                dropdownParent: $panel
            });
        }

        if (!$('#ddlFilterSessions').hasClass('select2-hidden-accessible')) {
            $('#ddlFilterSessions').select2({
                placeholder: 'Select session',
                allowClear: true,
                width: '100%',
                dropdownParent: $panel
            });
        }
    });
});



// ── COPY TO SESSION ───────────────────────────────────────────────────────
async function openCopyModal() {
    const ids = getSelectedIds();
    const names = getSelectedNames();

    if (ids.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'No Selection',
            text: 'Please select at least one section to copy.',
            confirmButtonText: 'OK',
            customClass: { confirmButton: 'btn btn-primary' },
            buttonsStyling: false
        });
        return;
    }

    const badgeContainer = document.getElementById('copySelectedBadges');
    badgeContainer.innerHTML = names
        .map(n => `<span class="badge bg-primary-subtle text-primary border border-primary-subtle">${n}</span>`)
        .join('');

    const ddl = document.getElementById('ddlTargetSession');
    ddl.innerHTML = '<option value="">Loading sessions...</option>';
    ddl.disabled = true;

    try {
        const [sessions, currentSessionId] = await Promise.all([
            window.fetchSessions(),
            window.fetchUserCurrentSession()
        ]);

        ddl.innerHTML = '<option value="">-- Select Session --</option>';

        const filtered = sessions.filter(s =>
            (s.sessionId || s.sessionId) !== currentSessionId
        );

        if (filtered.length === 0) {
            ddl.innerHTML = '<option value="">No other sessions available</option>';
        } else {
            filtered.forEach(s => {
                const id = s.sessionId ?? s.sessionId;
                const name = s.sessionTitle ?? s.sessionTitle;
                ddl.innerHTML += `<option value="${id}">${name}</option>`;
            });
        }

        ddl.disabled = false;

    } catch (err) {
        console.error('Failed to load sessions:', err);
        ddl.innerHTML = '<option value="">Failed to load sessions</option>';
        ddl.disabled = false;
    }

    ddl.classList.remove('is-invalid');

    new bootstrap.Modal(document.getElementById('modalCopySession')).show();
}

function confirmCopy() {
    const ids = getSelectedIds();
    const targetSession = document.getElementById('ddlTargetSession').value;
    const ddl = document.getElementById('ddlTargetSession');

    if (!targetSession) {
        ddl.classList.add('is-invalid');
        return;
    }
    ddl.classList.remove('is-invalid');

    const selectedName = ddl.options[ddl.selectedIndex].text;

    Swal.fire({
        icon: 'question',
        title: 'Confirm Copy',
        text: `Copy ${ids.length} section(s) to "${selectedName}"?`,
        showCancelButton: true,
        confirmButtonText: 'Yes, Copy',
        cancelButtonText: 'Cancel',
        customClass: {
            confirmButton: 'btn btn-primary me-2',
            cancelButton: 'btn btn-secondary'
        },
        buttonsStyling: false
    }).then(result => {
        if (!result.isConfirmed) return;

        Swal.fire({
            title: 'Copying...',
            text: 'Please wait while sections are being copied.',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => Swal.showLoading()
        });

        $.ajax({
            url: `/Section/CopyToSession`,
            type: 'POST',
            contentType: 'application/json',
            headers: { 'Authorization': 'Bearer ' + window.jwtToken },
            data: JSON.stringify({
                sectionIds: ids.join(','),
                targetSessionId: parseInt(targetSession)
            }),
            success: function (res) {
                bootstrap.Modal.getInstance(
                    document.getElementById('modalCopySession')).hide();

                if (res.success) {
                    let msg = res.message;
                    Swal.fire({
                        icon: 'success',
                        title: 'Copied Successfully!',
                        text: msg,
                        confirmButtonText: 'OK',
                        customClass: { confirmButton: 'btn btn-primary' },
                        buttonsStyling: false
                    }).then(() => loadSectionsPartial(new URLSearchParams(new FormData(document.getElementById('frmSearch'))).toString())); // ✅ CHANGED — was location.reload()
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Copy Failed',
                        text: res.message || 'Unable to copy sections.',
                        confirmButtonText: 'OK',
                        customClass: { confirmButton: 'btn btn-danger' },
                        buttonsStyling: false
                    });
                }
            },
            error: function (xhr) {
                console.error(xhr.status, xhr.responseText);
                Swal.fire({
                    icon: 'error',
                    title: 'Unexpected Error',
                    text: 'Something went wrong. Please try again.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-danger' },
                    buttonsStyling: false
                });
            }
        });
    });
}

// ── HELPERS ───────────────────────────────────────────────────────────────

function getSelectedIds() {
    let ids = [];
    $('.student-checkbox:checked').each(function () {
        ids.push(parseInt($(this).val()));
    });
    return ids;
}

function getSelectedNames() {
    let names = [];
    $('.student-checkbox:checked').each(function () {
        names.push($(this).closest('tr').find('td:eq(1)').text().trim());
    });
    return names;
}

function updateButtonStates() {
    const count = $('.student-checkbox:checked').length;
    const single = count === 1;
    const any = count > 0;

    $('#btnEdit').prop('disabled', !single);
    $('#btnDelete').prop('disabled', !any);
    $('#btnActive').prop('disabled', !any);
    $('#btnInactive').prop('disabled', !any);
    $('#btnCopy').prop('disabled', !any);
}