// Status codes: 1 = Present, 2 = Late, 3 = Absent, 4 = Half Day, 5 = Leave
const NOTE_REQUIRED_STATUSES = [2, 4, 5];

// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_attendance';
let appliedFilters = {};

// IMPORTANT: On every fresh full-page load of this view (server-rendered
// Razor load, not the AJAX partial reload), we intentionally clear out any
// stale filters left over from a previous visit. If the user navigates away
// and comes back to this page later, they should start clean rather than
// see old filters/badges re-applied automatically.
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
// Inline field validation (red border + message) — used instead of
// Swal/toast popups for the Apply Filters flow. Works for both plain
// <select>/<input> elements and Select2-enhanced selects (Select2 hides
// the real <select>, so the red border has to go on its rendered
// .select2-selection element instead).
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

$(document).ready(function () {
    $('.select2').select2({ dropdownParent: $('#filter-dropdown') });

    // Stop dropdown from closing when clicking inside
    $('#filter-dropdown').on('click', function (e) {
        e.stopPropagation();
    });

    $('#classSelect').on('change', function () {
        loadSections($(this).val(), '#sectionSelect');
        if ($(this).val()) clearFieldInvalid('classSelect');
    });

    $('#sectionSelect').on('change', function () {
        //loadStudents($('#classSelect').val(), $(this).val());
        if ($(this).val()) clearFieldInvalid('sectionSelect');
    });

    $('#attendanceDate').on('change', function () {
        if ($(this).val()) clearFieldInvalid('attendanceDate');
    });

    // Enter key in the search box submits the same form
    $('#txtSearchInput').on('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            $('#hdnSearch').val($(this).val());
            $('#hdnPageIndex').val(1);
            $('#frmSearch').submit();
        }
    });

    // Quick client-side filter of already-rendered rows (no reload)
    $('#txtSearchInput').on('keyup', function () {
        filterAttendanceTable();
    });

    // Per-column header checkboxes — toggles that status checkbox on every row.
    // Delegated on document (not bound directly to .select-all-col) because
    // the whole table, including these header checkboxes, gets replaced
    // whenever a filter is applied via loadAttendancePartial(). A direct
    // binding would stop working the moment the partial reloads.
    //
    // Also enforces the same "one status per row" rule as the individual
    // row checkboxes: checking a header status box for the whole column
    // must clear every OTHER status checkbox in that row (since .prop()
    // doesn't fire a native change event, the per-row radio listener below
    // would never get a chance to do this cleanup on its own). After the
    // toggle, all header checkboxes are re-synced to reflect the real
    // state of the rows (see syncSelectAllHeaders below) — otherwise a
    // header can end up showing "checked" even though not every row
    // actually has that status, which is what was happening before.
    $(document).on('change', '.select-all-col', function () {
        const status = String($(this).data('status'));
        const isChecked = $(this).is(':checked');

        $('#attendanceTableBody tr.attendance-row').each(function () {
            const row = $(this);
            const target = row.find(`.atd-check[value="${status}"]`);
            if (!target.length) return;

            target.prop('checked', isChecked);

            if (isChecked) {
                row.find('.atd-check').not(target).prop('checked', false);
            }

            validateRowNote(row);
        });

        syncSelectAllHeaders();
    });

    // Delegated: any status checkbox change re-validates that row's note
    // requirement AND re-syncs the header "select all" checkboxes, since
    // changing one row can flip a header between checked/unchecked.
    $('#attendanceTableBody').on('change', '.atd-check', function () {
        validateRowNote($(this).closest('tr'));
        syncSelectAllHeaders();
    });

    // Delegated: typing in the note clears the invalid state once filled
    $('#attendanceTableBody').on('input', '.attendance-note', function () {
        validateRowNote($(this).closest('tr'));
    });

    // Run note validation once on initial (server-rendered) load, in case a
    // student already has Late/Half Day/Leave set without a note.
    $('#attendanceTableBody tr.attendance-row').each(function () {
        validateRowNote($(this));
    });

    $('#btnSaveAttendance').on('click', function () {
        const classId = $('#hdnClassId').val();
        const sectionId = $('#hdnSectionID').val();
        let date = $('#attendanceDate').val();
        const hdnAttendanceDateRaw = $('#hdnAttendanceDate').val();
        const hdnAttendanceDate = toIsoDate(hdnAttendanceDateRaw);
        date = (!hdnAttendanceDate || hdnAttendanceDate.trim() === '')
            ? date
            : hdnAttendanceDate;
        if (!classId || !sectionId || !date) {
            Swal.fire('Error', 'Please select class, section and date, then click Apply first', 'error');
            return;
        }

        let hasError = false;
        const attendanceData = [];

        $('#attendanceTableBody tr.attendance-row').each(function () {
            const row = $(this);
            const studentId = row.attr('data-student-id');
            if (!studentId) return;

            const statuses = row.find('.atd-check:checked').val();
            const note = row.find('.attendance-note').val().trim();

            if (!statuses) {
                hasError = true;
                row.addClass('table-danger');
            } else {
                row.removeClass('table-danger');
            }

            if (!validateRowNote(row)) {
                hasError = true;
            }

            attendanceData.push({
                StudentID: parseInt(studentId),
                Status: statuses,
                Note: note
            });
        });

        if (hasError) {
            Swal.fire('Error', 'Please select at least one status for every student, and add a Note wherever Late, Half Day, or Leave is checked.', 'error');
            return;
        }

        if (attendanceData.length === 0) {
            Swal.fire('Info', 'No students found to mark attendance', 'info');
            return;
        }

        const req = {
            classId: parseInt(classId),
            sectionId: parseInt(sectionId),
            attendanceDate: date,
            attendanceData: attendanceData
        };

        $.ajax({
            url: '/Attendance/SaveAttendance',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(req),
            success: function (res) {
                if (res.success) {
                    // Clear stored filters/badges on successful save too, since
                    // the user is about to see a fresh reload of this page.
                    clearAppliedFilters();
                    Swal.fire('Success', res.message, 'success')
                        .then(() => location.reload());
                } else {
                    Swal.fire('Error', res.message, 'error');
                }
            },
            error: function () {
                Swal.fire('Error', 'Something went wrong while saving attendance.', 'error');
            }
        });
    });

    // Delegated: status toggle checkboxes / delete icons that live inside
    // the AJAX-loaded partial table need delegated binding since the table
    // body gets replaced by loadAttendancePartial().
    $(document).on('change', '.row-status-toggle', function () {
        const id = $(this).data('id');
        const newStatus = $(this).is(':checked') ? 1 : 0;

        $.post('/Attendance/ToggleStatus', { id: id, isActive: newStatus }, function (res) {
            if (res && res.success) {
                if (window.toast) window.toast.success(res.message || 'Status updated');
                refreshCurrentPage();
            } else {
                Swal.fire('Error', (res && res.message) || 'Could not update status', 'error');
                // revert the checkbox visually since the update failed
                $(this).prop('checked', !$(this).is(':checked'));
            }
        }).fail(function () {
            Swal.fire('Error', 'Could not update status', 'error');
        });
    });

    $(document).on('click', '.row-delete-btn', function () {
        const id = $(this).data('id');
        if (!id) return;

        Swal.fire({
            title: 'Are you sure?',
            text: 'This record will be deleted.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (!result.isConfirmed) return;

            $.post('/Attendance/Delete', { id: id }, function (res) {
                if (res && res.success) {
                    if (window.toast) window.toast.success(res.message || 'Deleted successfully');
                    refreshCurrentPage();
                } else {
                    Swal.fire('Error', (res && res.message) || 'Could not delete record', 'error');
                }
            }).fail(function () {
                Swal.fire('Error', 'Could not delete record', 'error');
            });
        });
    });
});

function loadSections(classId, targetSelector) {
    if (classId) {
        return $.get('/Attendance/GetSectionsByClass', { classId: classId }, function (res) {
            if (res.success) {
                let html = `<option value="">Select Section</option>`;
                res.data.forEach(s => {
                    html += `<option value="${s.sectionID}">${s.sectionName}</option>`;
                });
                $(targetSelector).html(html).trigger('change');
                renderFilterBadges();
            }
        });
    } else {
        $(targetSelector).html('<option value="">Select Section</option>').trigger('change');
        return $.Deferred().resolve().promise();
    }
}

function loadStudents()
{
    var classId = $("#classSelect").val();
    var sectionId = $("#sectionSelect").val();
    if (classId && sectionId) {
        return $.get('/Attendance/GetStudentsForLeave', { classId: classId, sectionId: sectionId }, function (res) {
            if (res.success) {
                let html = '<option value="">Select Student</option>';
                res.data.forEach(s => {
                    html += `<option value="${s.studentID}">${s.fullName} (${s.rollNo})</option>`;
                });
                $('#sectionStudent').html(html).trigger('change');
            }
        });
    } else {
        $('#sectionStudent').html('<option value="">Select Student</option>').trigger('change');
        return $.Deferred().resolve().promise();
    }
}

// Returns true if the row is valid (note present when required), false otherwise.
// Also toggles the .is-invalid class on the note field for visual feedback.
function validateRowNote(row) {
    const checkedStatuses = row.find('.atd-check:checked')
        .map(function () { return parseInt($(this).val()); })
        .get();
    const noteInput = row.find('.attendance-note');
    const noteRequired = checkedStatuses.some(v => NOTE_REQUIRED_STATUSES.includes(v));

    if (noteRequired) {
        noteInput.attr('placeholder', 'Note required');
        if (!noteInput.val().trim()) {
            noteInput.addClass('is-invalid');
            return false;
        } else {
            noteInput.removeClass('is-invalid');
            return true;
        }
    } else {
        noteInput.removeClass('is-invalid');
        noteInput.attr('placeholder', '');
        return true;
    }
}

// Re-evaluates every "select all" column-header checkbox against the actual
// state of the rows currently in the table: a header is checked ONLY if
// every visible row has that exact status checked. This is what keeps the
// headers from showing a false "all checked" state (as seen in the
// screenshot, where every header appeared checked even though only the
// Leave column actually was). Called after: initial page load, every AJAX
// partial reload, any individual row checkbox change, and any header
// checkbox toggle.
function syncSelectAllHeaders() {
    const rows = document.querySelectorAll('#attendanceTableBody tr.attendance-row');

    document.querySelectorAll('.select-all-col').forEach(header => {
        const status = header.dataset.status;

        if (rows.length === 0) {
            header.checked = false;
            return;
        }

        const allChecked = Array.from(rows).every(row => {
            const cb = row.querySelector(`.atd-check[value="${status}"]`);
            return cb && cb.checked;
        });

        header.checked = allChecked;
    });
}

function submitForm() {
    const classEL = document.getElementById('classSelect');
    const sectionEl = document.getElementById('sectionSelect');
    const statusEL = document.getElementById('sectionStudent');
    const dateEL = document.getElementById('attendanceDate');
    const companyEl = document.getElementById('ddlFilterCompany');

    const classId = classEL?.value || '';
    const sectionId = sectionEl?.value || '';
    const studentId = statusEL?.value || '';
    const attendanceDate = dateEL?.value || '';
    const companyId = companyEl?.value || '';
    const search = document.getElementById('hdnSearch')?.value || '';
    const pageIndex = document.getElementById('hdnPageIndex')?.value || 1;

    // Keep hidden fields in sync too, in case anything else reads them
    if (document.getElementById('hdnClassId')) document.getElementById('hdnClassId').value = classId;
    if (document.getElementById('hdnSectionID')) document.getElementById('hdnSectionID').value = sectionId;
    if (document.getElementById('hdnStudentId')) document.getElementById('hdnStudentId').value = studentId;
    if (document.getElementById('hdnAttendanceDate')) document.getElementById('hdnAttendanceDate').value = attendanceDate;
    if (document.getElementById('hdnCompanyId')) document.getElementById('hdnCompanyId').value = companyId;

    // NOTE: the query key here must be "date", not "attendanceDate" — the
    // GetAttendancePartial action's parameter, the hidden form field
    // (name="date" on #hdnAttendanceDate), and the pagination links in
    // _AttendanceTablePartial.cshtml all use "date". Sending "attendanceDate"
    // instead meant the server-side model binder never matched it, so the
    // date always came through as null.
    const params = new URLSearchParams({
        classId,
        sectionId,
        studentId,
        date: attendanceDate,
        companyId,
        search,
        pageIndex
    }).toString();

    loadAttendancePartial(params);
}

function applyFilters() {
    const classEl = document.getElementById('classSelect');
    const companyEl = document.getElementById('ddlFilterCompany');
    const sectionEl = document.getElementById('sectionSelect');
    const statusEL = document.getElementById('sectionStudent');
    const searchEl = document.getElementById('txtSearchInput');
    const dateEl = document.getElementById('attendanceDate');

    // Search
    const searchVal = searchEl?.value.trim();
    if (searchVal) appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    else delete appliedFilters['txtSearchInput'];

    // Date
    //const dateVal = dateEl?.value.trim();
    //if (dateVal) appliedFilters['attendanceDate'] = { label: 'Date', text: dateVal };
    //else delete appliedFilters['attendanceDate'];

    // Date
    const dateVal = dateEl?.value.trim();
    if (dateVal) appliedFilters['attendanceDate'] = { label: 'Date', text: formatDateForDisplay(dateVal) };
    else delete appliedFilters['attendanceDate'];

    // Class
    if (classEl?.value && classEl.value !== '') {
        appliedFilters['classSelect'] = {
            label: 'Class',
            text: classEl.options[classEl.selectedIndex]?.text || classEl.value
        };
    } else delete appliedFilters['classSelect'];

    // Company
    if (companyEl?.value && companyEl.value !== '') {
        appliedFilters['ddlFilterCompany'] = {
            label: 'Company',
            text: companyEl.options[companyEl.selectedIndex]?.text || companyEl.value
        };
    } else delete appliedFilters['ddlFilterCompany'];

    // Section
    if (sectionEl?.value && sectionEl.value !== '') {
        appliedFilters['ddlFilterSection'] = {
            label: 'Section',
            text: sectionEl.options[sectionEl.selectedIndex]?.text || sectionEl.value
        };
    } else delete appliedFilters['ddlFilterSection'];

    // Status / Student
    if (statusEL?.value && statusEL.value !== '') {
        appliedFilters['sectionStudent'] = {
            label: 'Status',
            text: statusEL.options[statusEL.selectedIndex]?.text || statusEL.value
        };
    } else delete appliedFilters['sectionStudent'];

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
    // Clear the matching dropdown/input
    if (filterId === 'classSelect') {
        const el = document.getElementById('classSelect');
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
    } else if (filterId === 'sectionSelect' || filterId === 'ddlFilterSection') {
        const el = document.getElementById('sectionSelect');
        if (el) {
            el.value = '';
            if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
        }
    } else if (filterId === 'statusSelect' || filterId === 'sectionStudent') {
        const el = document.getElementById('sectionStudent');
        if (el) {
            el.value = '';
            if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
        }
    } else if (filterId === 'attendanceDate') {
        const el = document.getElementById('attendanceDate');
        if (el) el.value = '';
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

    ['classSelect', 'ddlFilterCompany', 'ddlFilterSection', 'sectionSelect', 'sectionStudent'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = '';
        if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
    });

    clearFieldInvalid('classSelect');
    clearFieldInvalid('sectionSelect');

    clearAppliedFilters();
    renderFilterBadges();
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

// Converts a yyyy-MM-dd string (native <input type="date"> value) to
// dd-mm-yyyy for display purposes only — badges, labels, etc. The
// underlying form value/hidden field stays yyyy-MM-dd, since that's what
// the server and the date input itself require.
function formatDateForDisplay(isoValue) {
    if (!isoValue) return '';
    const parts = isoValue.split('-');
    if (parts.length !== 3) return isoValue;
    const [y, m, d] = parts;
    return `${d}-${m}-${y}`;
}

// Re-runs the currently applied filters against the partial endpoint —
// used after a delete/toggle so the table + badges stay in sync without a
// full page reload.
function refreshCurrentPage() {
    const form = document.getElementById('frmSearch');
    const params = new URLSearchParams(new FormData(form)).toString();
    loadAttendancePartial(params);
}

// ========================================
// DOMContentLoaded — init DataTable + UI
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    var companyname = localStorage.getItem("comName");
    // ── DataTable (export only) ───────────────────────────────────────
    if ($.fn.DataTable.isDataTable('#tblLeave')) {
        $('#tblLeave').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#tblLeave').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Hostel - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'csv', title: `Hostel - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'excel', title: `Hostel - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'pdf', title: `Hostel - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'print', title: `Hostel - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false
    });

    // ── Select2 ───────────────────────────────────────────────────────
    try {
        if (window.jQuery && typeof jQuery.fn.select2 === 'function') {
            jQuery('#classSelect, #ddlFilterCompany, #ddlFilterSection, #sectionSelect, #sectionStudent, #modalClassSelect').select2({
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
    // Class and Section are required before filters can be applied.
    // Instead of a Swal popup or toast, invalid fields get a red border
    // and an inline "required" message right under the field.
    document.getElementById('btnApplyFilters')?.addEventListener('click', (e) => {
        const classId = document.getElementById('classSelect')?.value;
        const sectionId = document.getElementById('sectionSelect')?.value;
        const companyId = document.getElementById('ddlFilterCompany')?.value;
        const attendanceDateVal = document.getElementById('attendanceDate')?.value;

        let hasError = false;

        if (!companyId) {
            setFieldInvalid('ddlFilterCompany', 'Company is required');
            hasError = true;
        } else {
            clearFieldInvalid('ddlFilterCompany');
        }

        if (!classId) {
            setFieldInvalid('classSelect', 'Class is required');
            hasError = true;
        } else {
            clearFieldInvalid('classSelect');
        }

        if (!sectionId) {
            setFieldInvalid('sectionSelect', 'Section is required');
            hasError = true;
        } else {
            clearFieldInvalid('sectionSelect');
        }

        if (!attendanceDateVal) {
            setFieldInvalid('attendanceDate', 'Attendance date is required');
            hasError = true;
        } else {
            clearFieldInvalid('attendanceDate');
        }

        if (hasError) {
            e.preventDefault();
            return;
        }

        document.getElementById('hdnPageIndex').value = 1;
        document.getElementById('hdnSearch').value = document.getElementById('txtSearchInput').value;
        applyFilters();
        submitForm();
    });

    // ── Reset Filters ─────────────────────────────────────────────────
    document.getElementById('btnResetFilters')?.addEventListener('click', resetAllFilters);

    // ── Render badges on load (will be empty since storage was cleared
    //    at the top of this file for a fresh page visit) ───────────────
    renderFilterBadges();

    var backDaysAllowed = $("#hdnBackDateCount").val();
    if (backDaysAllowed == "0") {
        setAttendanceDateRange(backDaysAllowed, true);
    } else {
        setAttendanceDateRange(backDaysAllowed, false);
    }

    // Set initial min on page load based on existing fromDate value
    setToDateMin();

    // Update min whenever fromDate changes
    $('#fromDate').on('change', function () {
        setToDateMin();

        const fromVal = $('#fromDate').val();
        const toVal = $('#toDate').val();
        if (fromVal && toVal && toVal < fromVal) {
            $('#toDate').val(fromVal);
        }
    });

    function setToDateMin() {
        const fromVal = $('#fromDate').val();
        if (fromVal) {
            $('#toDate').attr('min', fromVal);
        }
    }

    // Default any row with nothing checked to "Present" (value=1) — runs
    // once here for the initial server-rendered load. Rows loaded later via
    // the AJAX partial already come pre-checked to Present server-side (see
    // isPresent in _AttendanceTablePartial.cshtml), so this doesn't need to
    // re-run after every filter.
    document.querySelectorAll('#attendanceTableBody tr.attendance-row').forEach(row => {
        const rowChecks = row.querySelectorAll('.atd-check');
        const anyChecked = Array.from(rowChecks).some(chk => chk.checked);
        if (!anyChecked) {
            const presentBox = row.querySelector('.atd-check[value="1"]');
            if (presentBox) presentBox.checked = true;
        }
    });

    // Make sure the column headers reflect the real, just-rendered row
    // state right away (fixes headers showing "checked" when they
    // shouldn't, as in the reported screenshot).
    syncSelectAllHeaders();
});

// Enforce single-status-per-row (radio-like) behavior for the individual
// row checkboxes.
//
// Delegated on document (not bound to a direct reference to
// #attendanceTableBody) because that whole <tbody> — and every checkbox
// inside it — gets destroyed and replaced by loadAttendancePartial() on
// every filter/search/pagination action. A direct binding captured at
// DOMContentLoaded would go stale and silently stop working the moment a
// filter is applied, the same failure mode as the .select-all-col binding
// fixed above.
document.addEventListener('change', function (e) {
    if (!e.target.classList || !e.target.classList.contains('atd-check')) return;
    if (!e.target.closest('#attendanceTableBody')) return;

    const row = e.target.closest('tr');
    const rowChecks = row.querySelectorAll('.atd-check');

    if (e.target.checked) {
        rowChecks.forEach(chk => {
            if (chk !== e.target) chk.checked = false;
        });
    } else {
        const anyChecked = Array.from(rowChecks).some(chk => chk.checked);
        if (!anyChecked) e.target.checked = true;
    }
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
        renderFilterBadges();

        submitForm();
    }, 500);
});

function toIsoDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

// Constrains the Attendance Date picker to [today - backDaysAllowed, today].
// If isUnlimited is true, only the upper bound (today) applies.
function setAttendanceDateRange(backDaysAllowed, isUnlimited) {
    const dateEl = document.getElementById('attendanceDate');
    if (!dateEl) return;

    const today = new Date();
    const todayStr = formatDateForInput(today);

    dateEl.max = todayStr;
    dateEl.value = todayStr;

    if (isUnlimited) {
        dateEl.removeAttribute('min');
        return;
    }

    const minDate = new Date();
    minDate.setDate(today.getDate() - (backDaysAllowed || 0));
    dateEl.min = formatDateForInput(minDate);
}

// yyyy-MM-dd, using LOCAL date parts (not toISOString, which shifts to UTC
// and can land on the wrong day depending on the user's timezone)
function formatDateForInput(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// ========================================
// Partial reload — used by submitForm() for filter/search/pagination,
// and by refreshCurrentPage() after delete/toggle actions
// ========================================
function loadAttendancePartial(queryString) {
    const container = document.getElementById('attendanceTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/Attendance/GetAttendancePartial?${queryString}`, {
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

            if ($.fn.DataTable.isDataTable('#HostelTypeTable')) {
                $('#HostelTypeTable').DataTable().destroy();
            }
            window.exportTable = $('#HostelTypeTable').DataTable({
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

            // Keep badges in sync every time the table is refreshed,
            // whether from filters, pagination, delete, or toggle.
            renderFilterBadges();
            updateButtonStates();

            // The AJAX-loaded partial brings its own fresh copy of the
            // column-header checkboxes and rows — re-sync headers against
            // this new data so they don't show a stale/incorrect "checked"
            // state (this is what was happening in the reported screenshot).
            syncSelectAllHeaders();
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.toast) window.toast.error('Could not refresh the list.');
        });
}

// ✅ Pagination click interception, scoped to the hostel type container
document.addEventListener('click', function (e) {
    const link = e.target.closest('#attendanceTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('PageIndex') || 1;
    loadAttendancePartial(query);
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

// Clear stored filters whenever the user actually navigates away from this
// page (not on a same-page AJAX refresh), so returning here later starts
// fresh instead of silently re-applying old badges.
window.addEventListener('pagehide', function () {
    clearAppliedFilters();
});