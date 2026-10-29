// ========================================
// Staff Attendance page script
// Matches ids from: Staff Attendance index view + _StaffAttendanceTablePartial
// ========================================

// Row checkboxes use string values: P, L, A, HD, H
// Header "select all" checkboxes use numeric codes (per the Razor markup):
//   1 = Present, 2 = Late, 3 = Absent, 4 = Half Day, 5 = Leave
const STATUS_CODE_TO_VALUE = { '1': 'P', '2': 'L', '3': 'A', '4': 'HD', '5': 'H' };
const NOTE_REQUIRED_VALUES = ['L', 'HD', 'H']; // Late, Half Day, Leave need a note

// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_staffAttendance';
let appliedFilters = {};

// On every fresh full-page load, clear out any stale filters left over
// from a previous visit so returning users start clean.
(function resetFiltersOnFreshLoad() {
    try {
        sessionStorage.removeItem(FILTER_KEY);
    } catch (e) {
        console.warn('sessionStorage unavailable');
    }
    appliedFilters = {};
})();

function saveAppliedFilters() {
    try { sessionStorage.setItem(FILTER_KEY, JSON.stringify(appliedFilters)); }
    catch (e) { console.warn('sessionStorage unavailable'); }
}

function clearAppliedFilters() {
    appliedFilters = {};
    try { sessionStorage.removeItem(FILTER_KEY); } catch (e) { }
}

// ========================================
// Inline field validation (red border + message)
// Select2-enhanced selects hide the real <select>, so the red border has
// to go on the rendered .select2-selection element instead.
// ========================================
function setFieldInvalid(fieldId, message) {
    const el = document.getElementById(fieldId);
    if (!el) return;

    const $el = $(el);
    const $s2 = $el.next('.select2-container').find('.select2-selection');

    if ($s2.length) {
        $s2.css({ 'border-color': '#dc3545', 'border-width': '1px', 'border-style': 'solid' });
    } else {
        $el.addClass('is-invalid').css('border-color', '#dc3545');
    }

    let $feedback = $(`#${fieldId}-error`);
    if ($feedback.length === 0) {
        $feedback = $(`<div id="${fieldId}-error" class="text-danger small mt-1"></div>`);
        $el.closest('.col-md-6, .col-md-12, .mb-3').append($feedback);
    }
    $feedback.text(message).show();
}

function clearFieldInvalid(fieldId) {
    const el = document.getElementById(fieldId);
    if (!el) return;

    const $el = $(el);
    const $s2 = $el.next('.select2-container').find('.select2-selection');

    if ($s2.length) {
        $s2.css({ 'border-color': '', 'border-width': '', 'border-style': '' });
    } else {
        $el.removeClass('is-invalid').css('border-color', '');
    }

    $(`#${fieldId}-error`).hide();
}

// ========================================
// Ready
// ========================================
$(document).ready(function () {

    // --- Select2 for the two filter dropdowns, rendered inside the dropdown ---
    try {
        if (window.jQuery && typeof jQuery.fn.select2 === 'function') {
            jQuery('#ddlFilterCompany, #ddlRole').select2({
                width: '100%',
                dropdownParent: jQuery('#filter-dropdown'),
                allowClear: true,
                placeholder: function () { return jQuery(this).data('placeholder') || 'Select'; }
            });
        }
    } catch (e) {
        console.warn('Select2 init skipped:', e);
    }

    // Keep the filter dropdown open while interacting inside it
    $('#filter-dropdown').on('click', function (e) {
        e.stopPropagation();
    });

    $('#ddlRole').on('change', function () {
        if ($(this).val()) clearFieldInvalid('ddlRole');
    });

    $('#attendanceDate').on('change', function () {
        if ($(this).val()) clearFieldInvalid('attendanceDate');
    });

    $('#ddlFilterCompany').on('change', function () {
        if ($(this).val()) clearFieldInvalid('ddlFilterCompany');
    });

    // Enter key in the search box submits immediately
    $('#txtSearchInput').on('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('hdnPageIndex').value = 1;
            submitForm();
        }
    });

    // Debounced live search as the user types
    let searchTimer = null;
    $('#txtSearchInput').on('input', function () {
        clearTimeout(searchTimer);
        const val = $(this).val();
        searchTimer = setTimeout(() => {
            document.getElementById('hdnSearch').value = val;
            document.getElementById('hdnPageIndex').value = 1;

            const trimmed = val.trim();
            if (trimmed) appliedFilters['txtSearchInput'] = { label: 'Search', text: trimmed };
            else delete appliedFilters['txtSearchInput'];
            saveAppliedFilters();
            renderFilterBadges();

            submitForm();
        }, 500);
    });

    // --- Apply Filters ---
    // Role is required (per the "*" in the label). Company and Date are
    // optional filters here, so only Role is hard-validated; adjust if you
    // want Company/Date required too.
    $('#btnApplyFilters').on('click', function (e) {
        e.preventDefault();

        const roleId = $('#ddlRole').val();
        let hasError = false;

        if (!roleId) {
            setFieldInvalid('ddlRole', 'Role is required');
            hasError = true;
        } else {
            clearFieldInvalid('ddlRole');
        }

        if (hasError) return;

        document.getElementById('hdnPageIndex').value = 1;
        document.getElementById('hdnSearch').value = $('#txtSearchInput').val();
        applyFilters();
        submitForm();

        const toggle = document.getElementById('btnFilterToggle');
        if (toggle) bootstrap.Dropdown.getOrCreateInstance(toggle).hide();
    });

    // --- Reset Filters (also wired via onclick in the markup, kept here too) ---
    $('#btnResetFilters').on('click', resetAllFilters);
    $('#btnCloseFilter').on('click', function () {
        const toggle = document.getElementById('btnFilterToggle');
        if (toggle) bootstrap.Dropdown.getOrCreateInstance(toggle).hide();
    });

    // --- Column header "select all" checkboxes ---
    // Delegated on document because the table body is replaced whenever a
    // filter/search/pagination action reloads the partial.
    $(document).on('change', '.select-all-col', function () {
        const code = String($(this).data('status'));
        const value = STATUS_CODE_TO_VALUE[code];
        if (!value) return;

        const isChecked = $(this).is(':checked');

        $('#attendanceTableBody tr.attendance-row').each(function () {
            const row = $(this);
            const target = row.find(`.atd-check[value="${value}"]`);
            if (!target.length) return;

            target.prop('checked', isChecked);

            // Enforce single-status-per-row: checking this column for the
            // whole table must clear every OTHER status checkbox in the
            // row (native .prop() doesn't fire 'change', so the per-row
            // handler below won't get a chance to do this on its own).
            if (isChecked) {
                row.find('.atd-check').not(target).prop('checked', false);
            }

            validateRowNote(row);
        });

        syncSelectAllHeaders();
    });

    // --- Individual row status checkbox: enforce single-status-per-row ---
    $('#attendanceTableBody').on('change', '.atd-check', function () {
        const row = $(this).closest('tr');

        if ($(this).is(':checked')) {
            row.find('.atd-check').not(this).prop('checked', false);
        } else {
            // Don't let a row end up with nothing checked — fall back to
            // Present if the user tries to uncheck the only active box.
            const anyChecked = row.find('.atd-check:checked').length > 0;
            if (!anyChecked) {
                row.find('.atd-check[value="P"]').prop('checked', true);
            }
        }

        validateRowNote(row);
        syncSelectAllHeaders();
    });

    // --- Note field: clear invalid state once filled ---
    $('#attendanceTableBody').on('input', '.attendance-note', function () {
        validateRowNote($(this).closest('tr'));
    });

    // Run once on the initial server-rendered load, in case a staff member
    // already has Late/Half Day/Leave set without a note.
    $('#attendanceTableBody tr.attendance-row').each(function () {
        validateRowNote($(this));
    });

    syncSelectAllHeaders();
    renderFilterBadges();
});

// ========================================
// Row validation / header sync
// ========================================

// Returns true if the row is valid (note present when required).
// Toggles .is-invalid on the note field for visual feedback.
function validateRowNote(row) {
    const checkedValue = row.find('.atd-check:checked').val();
    const noteInput = row.find('.attendance-note');
    const noteRequired = NOTE_REQUIRED_VALUES.includes(checkedValue);

    if (noteRequired) {
        noteInput.attr('placeholder', 'Note required');
        if (!noteInput.val().trim()) {
            noteInput.addClass('is-invalid');
            return false;
        }
        noteInput.removeClass('is-invalid');
        return true;
    }

    noteInput.removeClass('is-invalid');
    noteInput.attr('placeholder', '');
    return true;
}

// Re-evaluates every "select all" column header against the actual state
// of the rows: a header is checked only if EVERY row currently has that
// exact status checked.
function syncSelectAllHeaders() {
    const rows = document.querySelectorAll('#attendanceTableBody tr.attendance-row');

    document.querySelectorAll('.select-all-col').forEach(header => {
        const value = STATUS_CODE_TO_VALUE[String(header.dataset.status)];
        if (!value) return;

        if (rows.length === 0) {
            header.checked = false;
            return;
        }

        header.checked = Array.from(rows).every(row => {
            const cb = row.querySelector(`.atd-check[value="${value}"]`);
            return cb && cb.checked;
        });
    });
}

// ========================================
// Filters — apply / badges / remove / reset
// ========================================

function applyFilters() {
    const companyEl = document.getElementById('ddlFilterCompany');
    const roleEl = document.getElementById('ddlRole');
    const dateEl = document.getElementById('attendanceDate');
    const searchEl = document.getElementById('txtSearchInput');

    const searchVal = searchEl?.value.trim();
    if (searchVal) appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    else delete appliedFilters['txtSearchInput'];

    const dateVal = dateEl?.value.trim();
    if (dateVal) appliedFilters['attendanceDate'] = { label: 'Date', text: formatDateForDisplay(dateVal) };
    else delete appliedFilters['attendanceDate'];

    if (companyEl?.value) {
        appliedFilters['ddlFilterCompany'] = {
            label: 'Company',
            text: companyEl.options[companyEl.selectedIndex]?.text || companyEl.value
        };
    } else delete appliedFilters['ddlFilterCompany'];

    if (roleEl?.value) {
        appliedFilters['ddlRole'] = {
            label: 'Role',
            text: roleEl.options[roleEl.selectedIndex]?.text || roleEl.value
        };
    } else delete appliedFilters['ddlRole'];

    saveAppliedFilters();
    renderFilterBadges();
}

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

function removeFilter(filterId) {
    if (filterId === 'ddlFilterCompany') {
        const el = document.getElementById('ddlFilterCompany');
        if (el) {
            el.value = '';
            if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
        }
    } else if (filterId === 'ddlRole') {
        const el = document.getElementById('ddlRole');
        if (el) {
            el.value = '';
            if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
        }
    } else if (filterId === 'attendanceDate') {
        const el = document.getElementById('attendanceDate');
        if (el) el.value = '';
    } else if (filterId === 'txtSearchInput') {
        const el = document.getElementById('txtSearchInput');
        if (el) el.value = '';
        document.getElementById('hdnSearch').value = '';
    }

    delete appliedFilters[filterId];
    saveAppliedFilters();
    renderFilterBadges();
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

function resetAllFilters() {
    document.getElementById('txtSearchInput').value = '';
    document.getElementById('hdnSearch').value = '';

    ['ddlFilterCompany', 'ddlRole'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = '';
        if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
    });

    document.getElementById('attendanceDate').value = '';

    clearFieldInvalid('ddlRole');
    clearFieldInvalid('ddlFilterCompany');
    clearFieldInvalid('attendanceDate');

    clearAppliedFilters();
    renderFilterBadges();
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

// Converts a yyyy-MM-dd string (native <input type="date"> value) to
// dd-mm-yyyy for badge display only. The underlying hidden field keeps
// yyyy-MM-dd since that's what the server/model binder expects.
function formatDateForDisplay(isoValue) {
    if (!isoValue) return '';
    const parts = isoValue.split('-');
    if (parts.length !== 3) return isoValue;
    const [y, m, d] = parts;
    return `${d}-${m}-${y}`;
}

// ========================================
// Submit / partial reload
// ========================================

// Reads the visible filter controls, syncs the hidden #frmSearch fields,
// builds the query string and reloads the table via AJAX partial.
//
// NOTE: query keys must match what GetStaffAttendancePartial (or your
// equivalent controller action) binds to: roleId, companyId, date, search,
// pageIndex, pageSize — matching the hidden field `name` attributes in
// #frmSearch on the main view.
function submitForm() {
    const roleEl = document.getElementById('ddlRole');
    const companyEl = document.getElementById('ddlFilterCompany');
    const dateEl = document.getElementById('attendanceDate');

    const roleId = roleEl?.value || '';
    const companyId = companyEl?.value || '';
    const date = dateEl?.value || '';
    const search = document.getElementById('hdnSearch')?.value || '';
    const pageIndex = document.getElementById('hdnPageIndex')?.value || 1;
    const pageSize = document.getElementById('hdnPageSize')?.value || '';

    // Keep hidden fields in sync
    if (document.getElementById('hdnClassId')) document.getElementById('hdnClassId').value = roleId;
    if (document.getElementById('hdnCompanyId')) document.getElementById('hdnCompanyId').value = companyId;
    if (document.getElementById('hdnAttendanceDate')) document.getElementById('hdnAttendanceDate').value = date;

    const params = new URLSearchParams({
        roleId,
        companyId,
        date,
        search,
        pageIndex,
        pageSize
    }).toString();

    loadAttendancePartial(params);
}

function loadAttendancePartial(queryString) {
    const container = document.getElementById('attendanceTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/HumanResource/GetAttendancePartial?${queryString}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to load attendance list');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            container.style.opacity = '1';

            // Default any row with nothing checked to Present, in case the
            // partial ever returns a row without a pre-checked status.
            document.querySelectorAll('#attendanceTableBody tr.attendance-row').forEach(row => {
                const anyChecked = row.querySelector('.atd-check:checked');
                if (!anyChecked) {
                    const presentBox = row.querySelector('.atd-check[value="P"]');
                    if (presentBox) presentBox.checked = true;
                }
                validateRowNote($(row));
            });

            renderFilterBadges();
            syncSelectAllHeaders();
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.toast) window.toast.error('Could not refresh the list.');
            else showToastFallback('Could not refresh the list.', 'danger');
        });
}

// Pagination click interception, scoped to the attendance table container.
// Query param casing must match what the partial's <a> links actually emit
// (pageIndex, pageSize, search, companyId, date — plus roleId if you add it
// to the pagination links in the partial).
document.addEventListener('click', function (e) {
    const link = e.target.closest('#attendanceTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('pageIndex') || 1;
    loadAttendancePartial(query);
    history.replaceState(null, '', href);
});

// ========================================
// Save — called directly by the page's "Save Attendance" button
// (onclick="saveAttendance()")
// ========================================
function saveAttendance() {
    let hasError = false;
    const attendanceData = [];

    $('#attendanceTableBody tr.attendance-row').each(function () {
        const row = $(this);
        const staffId = row.attr('data-staff-id'); // rename data-student-id -> data-staff-id in the Razor row
        if (!staffId) return;

        const attendance = row.find('.atd-check:checked').val();
        const note = row.find('.attendance-note').val().trim();

        if (!attendance) {
            hasError = true;
            row.addClass('table-danger');
        } else {
            row.removeClass('table-danger');
        }

        if (!validateRowNote(row)) {
            hasError = true;
        }

        // Field names here (StaffID, Attendance, Source, Note) must match
        // HRStaffAttendanceUpsertRequest exactly — the controller model-binds
        // this JSON directly, there's no separate mapping step.
        attendanceData.push({
            StaffID: parseInt(staffId),
            Attendance: attendance,
            Source: 'Manual',
            Note: note
        });
    });

    if (hasError) {
        Swal.fire('Error', 'Please select a status for every staff member, and add a Note wherever Late, Half Day, or Leave is checked.', 'error');
        return;
    }

    if (attendanceData.length === 0) {
        Swal.fire('Info', 'No staff members found to mark attendance', 'info');
        return;
    }

    // The date currently loaded in the table lives in #hdnAttendanceDate,
    // kept in sync by submitForm(); fall back to the visible filter field.
    const attendanceDate = $('#attendanceDate').val();

    // #hdnSectionID actually holds Model.SessionID (see the main view's
    // hidden field: name="sectionId" id="hdnSectionID" value=@Model.SessionID).
    // The controller doesn't set SessionId server-side, so it has to be sent
    // from here or it will bind to 0.
    const sessionId = parseInt($('#hdnSectionID').val()) || 0;
    const companyId = parseInt($('#hdnCompanyId').val()) || 0;

    // Matches HRStaffAttendanceUpsertRequestModel. CompanyID is overwritten
    // server-side in the controller (req.CompanyID = await GetCompanyId()),
    // so it doesn't need to be sent from here.
    const req = {
        AttendanceDate: attendanceDate,
        CompanyID: companyId,
        SessionId: sessionId,
        AttendanceData: attendanceData
    };

    $.ajax({
        url: '/HumanResource/SaveAttendance',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(req),
        success: function (res) {
            if (res.success) {
                clearAppliedFilters();
                Swal.fire('Success', res.message, 'success').then(() => location.reload());
            } else {
                Swal.fire('Error', res.message, 'error');
            }
        },
        error: function () {
            Swal.fire('Error', 'Something went wrong while saving attendance.', 'error');
        }
    });
}

// Minimal fallback if window.toast isn't set up on this page
function showToastFallback(msg, type) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<div class="toast align-items-center text-bg-${type} border-0 show position-fixed bottom-0 end-0 m-3" role="alert" style="z-index:9999">
            <div class="d-flex"><div class="toast-body">${msg}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div></div>`;
    document.body.appendChild(wrapper);
    setTimeout(() => wrapper.remove(), 4000);
}

// Clear stored filters when actually navigating away (not on a same-page
// AJAX refresh), so returning here later starts fresh.
window.addEventListener('pagehide', function () {
    clearAppliedFilters();
});