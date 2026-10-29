function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#tblLeave')) {   
        const table = $('#tblLeave').DataTable();
        table.button(index).trigger();
    }
}
// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_approveLeave';
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
// Lightweight toast helper.
// FIX: saveLeave() called showToast(...) but this function never existed
// anywhere in the file, so every path that relied on it (To Date < From
// Date, required-field check) threw a silent ReferenceError and aborted
// before showing the user anything. Defined here using SweetAlert2's
// built-in toast mode so it matches the Swal usage already used elsewhere
// in this file. If some other shared script already defines
// window.showToast globally, that one wins and this is skipped.
// ========================================
window.showToast = window.showToast || function (message, icon = 'info') {
    if (window.Swal) {
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: icon,
            title: message,
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
    } else {
        console.warn('[toast]', icon, message);
    }
};

function submitForm() {
    // Sync hidden form fields from dropdowns before submit
    const classEL = document.getElementById('classSelect');
    const companyEl = document.getElementById('ddlFilterCompany');
    const sectionEl = document.getElementById('sectionSelect');
    const statusEL = document.getElementById('statusSelect');
    if (classEL) document.getElementById('hdnSessionID').value = classEL.value;
    if (companyEl) document.getElementById('hdnCompanyId').value = companyEl.value;
    if (sectionEl) document.getElementById('hdnSectionID').value = sectionEl.value;
    if (statusEL) document.getElementById('hdnstatus').value = statusEL.value;

    const form = document.getElementById('frmSearch');
    const params = new URLSearchParams(new FormData(form)).toString();

    loadApproveLeavePartial(params);
}

// Re-runs the currently applied filters against the partial endpoint —
// used after delete/approve/reject so the table + badges stay in sync
// without a full page reload.
function refreshCurrentPage() {
    const form = document.getElementById('frmSearch');
    const params = new URLSearchParams(new FormData(form)).toString();
    loadApproveLeavePartial(params);
}

function applyFilters() {
    const classEl = document.getElementById('classSelect');
    const companyEl = document.getElementById('ddlFilterCompany');
    const sectionEl = document.getElementById('sectionSelect');
    const statusEL = document.getElementById('statusSelect');
    const searchEl = document.getElementById('txtSearchInput');

    // Search
    const searchVal = searchEl?.value.trim();
    if (searchVal) appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    else delete appliedFilters['txtSearchInput'];

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

    // Status
    if (statusEL?.value && statusEL.value !== '') {
        appliedFilters['statusSelect'] = {
            label: 'Status',
            text: statusEL.options[statusEL.selectedIndex]?.text || statusEL.value
        };
    } else delete appliedFilters['statusSelect'];

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
    } else if (filterId === 'statusSelect') {
        const el = document.getElementById('statusSelect');
        if (el) {
            el.value = '';
            if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
        }
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

    ['classSelect', 'ddlFilterSessions', 'ddlFilterCompany', 'ddlFilterSection', 'sectionSelect', 'statusSelect'].forEach(id => {
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
// Select2 init — SINGLE guarded entry point.
//
// FIX: this used to be initialized in TWO different places
// (DOMContentLoaded, then again in a separate $(document).ready block a
// bit further down) with no guard against double-initialization. Calling
// .select2() twice on the same <select> corrupts its internal DOM
// references, and the NEXT time that dropdown opens, Select2's
// _positionDropdown() throws "Cannot read properties of undefined
// (reading 'isConnected')" — that's the crash from the console log.
//
// FIX: #modalClassSelect (and modalSectionSelect/modalStudentSelect, used
// on the separate "Add Leave Request" page) were being forced onto
// dropdownParent: jQuery('#filter-dropdown') — but #filter-dropdown only
// exists on the ApproveLeave LIST page, not the Add Leave Request page.
// An empty jQuery object as dropdownParent causes the same crash the
// moment that dropdown is opened. Each group below now only uses
// dropdownParent when that container actually exists on the current page.
// ========================================
function initSelect2Once(selector, opts) {
    const $el = jQuery(selector);
    if (!$el.length) return; // element doesn't exist on this page — skip silently
    $el.each(function () {
        const $this = jQuery(this);
        if ($this.hasClass('select2-hidden-accessible')) return; // already initialized — skip
        $this.select2(opts);
    });
}

function initAllSelect2() {
    if (!(window.jQuery && typeof jQuery.fn.select2 === 'function')) return;

    const $filterDropdown = jQuery('#filter-dropdown');
    const filterOpts = {
        width: '100%',
        allowClear: true,
        placeholder: function () { return jQuery(this).data('placeholder') || 'Select'; }
    };
    if ($filterDropdown.length) filterOpts.dropdownParent = $filterDropdown;

    // ── ApproveLeave list-page filter selects (present only on that page) ──
    initSelect2Once('#classSelect', filterOpts);
    initSelect2Once('#ddlFilterCompany', filterOpts);
    initSelect2Once('#ddlFilterSection', filterOpts);
    initSelect2Once('#sectionSelect', filterOpts);
    initSelect2Once('#statusSelect', filterOpts);

    // ── Add Leave Request page selects — no #filter-dropdown on this page,
    //    so no dropdownParent override; let Select2 default to <body>. ──
    const modalOpts = {
        width: '100%',
        allowClear: true,
        placeholder: function () { return jQuery(this).data('placeholder') || 'Select'; }
    };
    initSelect2Once('#modalClassSelect', modalOpts);
    initSelect2Once('#modalSectionSelect', modalOpts);
    initSelect2Once('#modalStudentSelect', modalOpts);
}

// ========================================
// DOMContentLoaded — init DataTable + UI
// ========================================
document.addEventListener('DOMContentLoaded', () => {

    // ── DataTable (export only) ───────────────────────────────────────
    if ($.fn.DataTable.isDataTable('#tblLeave')) {
        $('#tblLeave').DataTable().destroy();
    }
    var companyname = localStorage.getItem("comName");
    $.fn.dataTable.ext.errMode = 'none';
    if (document.getElementById('tblLeave')) {
        window.exportTable = $('#tblLeave').DataTable({
            dom: 'Bfrtip',
            buttons: [
                { extend: 'copy', title: `Approve Leave - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] } },
                { extend: 'csv', title: `Approve Leave - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] } },
                { extend: 'excel', title: `Approve Leave - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] } },
                { extend: 'pdf', title: `Approve Leave - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] } },
                { extend: 'print', title: `Approve Leave - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] } }
            ],
            searching: false,
            paging: false,
            info: false,
            ordering: false
        });
    }

    // ── Select2 (single guarded init — see initAllSelect2 above) ───────
    try {
        initAllSelect2();
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

    // ── Reset Filters ─────────────────────────────────────────────────
    document.getElementById('btnResetFilters')?.addEventListener('click', resetAllFilters);

    // ── Render badges on load (will be empty since storage was cleared
    //    at the top of this file for a fresh page visit) ───────────────
    renderFilterBadges();

    var classId = $("#modalClassSelect").val();

    if (classId > 0) {
        $('#modalClassSelect').trigger('change').trigger('change.select2');
        var sectionID = $("#hdnSectionId").val();
        var studentID = $("#hdnStudentID").val();
        loadSections(classId, '#modalSectionSelect').then(() => {
            $('#modalSectionSelect').val(sectionID).trigger('change.select2');
            return loadStudents(classId, sectionID);
        }).then(() => {
            $('#modalStudentSelect').val(studentID).trigger('change.select2');
        });
    }

    // NOTE: kept a single #classSelect -> section-loading binding
    // (previously there were two separate handlers here loading into two
    // different targets — '#modalClassSelect' and '#sectionSelect' — which
    // doesn't make sense for the same trigger element and risked the same
    // kind of race/duplication seen on the Attendance Report page).
    $('#classSelect').on('change', function () {
        loadSections($(this).val(), '#sectionSelect');
    });
    $('#modalClassSelect').on('change', function () {
        loadSections($(this).val(), '#modalSectionSelect');
    });

    $('#modalSectionSelect').on('change', function () {
        loadStudents($('#modalClassSelect').val(), $(this).val());
    });

    // Set initial min on page load based on existing fromDate value
    setToDateMin();

    // Update min whenever fromDate changes
    $('#fromDate').on('change', function () {
        setToDateMin();

        // If toDate is already less than the new fromDate, reset/clear it
        const fromVal = $('#fromDate').val();
        const toVal = $('#toDate').val();
        if (fromVal && toVal && toVal < fromVal) {
            $('#toDate').val(fromVal); // or use '' to clear instead
        }
        document.getElementById('toDate')?.classList.remove('is-invalid');
    });

    $('#toDate').on('change', function () {
        document.getElementById('toDate')?.classList.remove('is-invalid');
    });

    function setToDateMin() {
        const fromVal = $('#fromDate').val();
        if (fromVal) {
            $('#toDate').attr('min', fromVal);
        }
    }

    // ── Save Leave ───────────────────────────────────────────────────
    // FIX: #btnSaveLeave has no type="button" in the markup, so it
    // defaults to type="submit" — and it sits inside <form id="leaveForm">,
    // which has several native `required` fields. Without preventDefault,
    // clicking Save ran our validation AND triggered the browser's native
    // form submit/validation UI right after, so the native "Please fill
    // out this field" bubble showed instead of (or over) our toast. This
    // stops the native submit so validateLeaveForm()/showToast is the
    // only thing that runs.
    $('#btnSaveLeave').on('click', function (e) {
        e.preventDefault();
        saveLeave();
    });
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

        // ── Sync search into appliedFilters before submit ─────────────
        const val = this.value.trim();
        if (val) appliedFilters['txtSearchInput'] = { label: 'Search', text: val };
        else delete appliedFilters['txtSearchInput'];
        saveAppliedFilters(); // ← persist before submit
        renderFilterBadges();

        submitForm();
    }, 500);
});

let selectedId = 0;
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

function selectItem(id, row) {
    selectedId = id;
    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));
    row.classList.add('bg-light');

    document.getElementById('btnEdit').disabled = false;
    document.getElementById('btnDelete').disabled = false;

    let checkedCount = $('.student-checkbox:checked').length;
    $('#btnDelete').prop('disabled', checkedCount === 0);
    // Edit sirf 1 record select hone par
    $('#btnEdit').prop('disabled', checkedCount !== 1);
}

function handleEditAction() {
    if (selectedId) {
        editLeave(selectedId);
    }
}

async function handleDeleteAction() {
    let selectedIds = [];
    $('.student-checkbox:checked').each(function () {
        selectedIds.push(parseInt($(this).val()));
    });
    if (selectedIds.length === 0) {
        Swal.fire('Notice', 'Please select at least one record.', 'info');
        return;
    }
    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to delete this leave application record. This action cannot be undone!",
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
                url: '/Attendance/DeleteLeaveApplication',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        if (window.toast) window.toast.success(res.message || 'Deleted successfully');
                        // Stay on this page — refresh the table/badges instead
                        // of a full navigation/reload.
                        refreshCurrentPage();
                    } else {
                        Swal.fire('Error!', res.message || 'Failed to delete leave application.', 'error');
                    }
                },
                error: function () {
                    Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                }
            });
        }
    });
}

function resetForm() {
    $('#modalTitle').text('Add Leave Request');
    $('#leaveAppId').val(0);
    $('#leaveForm')[0].reset();
    $('.select2-modal').val('').trigger('change');
    $('#pen').prop('checked', true);

    // Clear selection
    selectedId = 0;
    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));
    document.querySelectorAll('input[name="selectedItem"]').forEach(r => r.checked = false);
    document.getElementById('btnEdit').disabled = true;
    document.getElementById('btnDelete').disabled = true;
    let checkedCount = $('.student-checkbox:checked').length;
    $('#btnDelete').prop('disabled', checkedCount === 0);
    // Edit sirf 1 record select hone par
    $('#btnEdit').prop('disabled', checkedCount !== 1);
}

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

function loadStudents(classId, sectionId) {
    if (classId && sectionId) {
        return $.get('/Attendance/GetStudentsForLeave', { classId: classId, sectionId: sectionId }, function (res) {
            if (res.success) {
                let html = '<option value="">Select Student</option>';
                res.data.forEach(s => {
                    html += `<option value="${s.studentID}">${s.fullName} (${s.rollNo})</option>`;
                });
                $('#modalStudentSelect').html(html).trigger('change');
            }
        });
    } else {
        $('#modalStudentSelect').html('<option value="">Select Student</option>').trigger('change');
        return $.Deferred().resolve().promise();
    }
}

function editLeave(id) {
    if (id === 0) return;
    try {
        if (id) {
            location.href = `/Attendance/AddLeaveRequest/${id}`;
        }
    } catch (err) {
        console.error(err);
    }
}

// ========================================
// Full form validation for the Add/Edit Leave Request page.
// Checks: Class, Section, Student, To Date, Reason required, and
// To Date must not be earlier than From Date. Shows a red border PLUS an
// inline message under every invalid field at once (not a toast, and not
// just the first error) — matches the #errreason pattern already used
// for the Reason field.
// ========================================

// fieldId  = the <select>/<input> to put the red border on
// errId    = the <div> that receives the message text
function setInlineFieldError(fieldId, errId, message) {
    const el = document.getElementById(fieldId);
    if (el) {
        const $el = $(el);
        const $s2 = $el.next('.select2-container').find('.select2-selection');
        if ($s2.length) {
            // Select2 hides the real <select>, so the red border has to go
            // on its rendered widget instead.
            $s2.css({ 'border-color': '#dc3545', 'border-width': '1px', 'border-style': 'solid' });
        } else {
            el.classList.add('is-invalid');
        }
    }
    const err = document.getElementById(errId);
    if (err) {
        err.textContent = message;
        err.style.display = 'block';
    }
}

function clearInlineFieldError(fieldId, errId) {
    const el = document.getElementById(fieldId);
    if (el) {
        const $el = $(el);
        const $s2 = $el.next('.select2-container').find('.select2-selection');
        if ($s2.length) {
            $s2.css({ 'border-color': '', 'border-width': '', 'border-style': '' });
        } else {
            el.classList.remove('is-invalid');
        }
    }
    const err = document.getElementById(errId);
    if (err) {
        err.textContent = '';
        err.style.display = 'none';
    }
}

// (fieldId, errId) pairs for every field this form validates inline.
const LEAVE_FORM_FIELDS = [
    ['modalClassSelect', 'errClass'],
    ['modalSectionSelect', 'errSection'],
    ['modalStudentSelect', 'errStudent'],
    ['fromDate', 'errFromDate'],
    ['toDate', 'errToDate'],
    ['reason', 'errreason']
];

function clearLeaveFormErrors() {
    LEAVE_FORM_FIELDS.forEach(([fieldId, errId]) => clearInlineFieldError(fieldId, errId));
}

function validateLeaveForm() {
    let isValid = true;

    const classVal = $('#modalClassSelect').val();
    const sectionVal = $('#modalSectionSelect').val();
    const studentVal = $('#modalStudentSelect').val();
    const fromDateVal = $('#fromDate').val();
    const toDateVal = $('#toDate').val();
    const reasonVal = $('#reason').val().trim();

    clearLeaveFormErrors();

    if (!classVal) {
        setInlineFieldError('modalClassSelect', 'errClass', 'Class is required.');
        isValid = false;
    }
    if (!sectionVal) {
        setInlineFieldError('modalSectionSelect', 'errSection', 'Section is required.');
        isValid = false;
    }
    if (!studentVal) {
        setInlineFieldError('modalStudentSelect', 'errStudent', 'Student is required.');
        isValid = false;
    }
    if (!toDateVal) {
        setInlineFieldError('toDate', 'errToDate', 'To Date is required.');
        isValid = false;
    } else if (fromDateVal) {
        // Only compare when both dates are present
        const fromDate = new Date(fromDateVal);
        const toDate = new Date(toDateVal);
        if (toDate < fromDate) {
            setInlineFieldError('toDate', 'errToDate', 'To Date cannot be earlier than From Date.');
            setInlineFieldError('fromDate', 'errFromDate', 'From Date cannot be after To Date.');
            isValid = false;
        }
    }
    if (!reasonVal) {
        setInlineFieldError('reason', 'errreason', 'Reason is required.');
        isValid = false;
    }

    return isValid;
}

function saveLeave() {
    if (!validateLeaveForm()) return;

    const formData = new FormData();
    formData.append('LeaveAppID', $('#leaveAppId').val());
    formData.append('StudentID', $('#modalStudentSelect').val());
    formData.append('FromDate', $('#fromDate').val());
    formData.append('ToDate', $('#toDate').val());
    formData.append('ApplyDate', $('#applyDate').val());
    formData.append('Reason', $('#reason').val());
    formData.append('Status', $('input[name="leaveStatus"]:checked').val());

    const fileInput = document.getElementById('attachFile');
    if (fileInput.files[0]) {
        formData.append('attachment', fileInput.files[0]);
    }

    $.ajax({
        url: '/Attendance/UpsertLeave',
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function (res) {
            if (res.success) {
                // Clear stale filters before navigating back to the list
                // page, so the badges/filters start fresh there too.
                clearAppliedFilters();
                Swal.fire({
                    icon: 'success',
                    title: 'Saved!',
                    text: res.message,
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-success' },
                    buttonsStyling: false
                }).then(() => {
                    window.location.href = '/Attendance/ApproveLeave';
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: res.message || 'Failed to save leave.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-danger' },
                    buttonsStyling: false
                });
            }
        },
        error: function () {
            Swal.fire('Error', 'Something went wrong while saving the leave request.', 'error');
        }
    });
}

function updateStatus(id, status) {
    const statusText = status === 1 ? 'Approve' : 'Reject';
    Swal.fire({
        title: 'Are you sure?',
        text: `You want to ${statusText} this leave application?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: status === 1 ? '#28a745' : '#dc3545',
        confirmButtonText: `Yes, ${statusText} it!`
    }).then((result) => {
        if (result.isConfirmed) {
            $.ajax({
                url: '/Attendance/UpdateLeaveStatus',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ LeaveAppID: id, Status: status }),
                success: function (res) {
                    if (res.success) {
                        showToast(res.message, 'success');
                        // Refresh the table + badges in place, on this same
                        // page, instead of leaving the row's stale status
                        // showing until a manual refresh.
                        refreshCurrentPage();
                    } else {
                        showToast(res.message, 'error');
                    }
                },
                error: function () {
                    showToast('Something went wrong while updating status', 'error');
                }
            });
        }
    });
}

function removeExistingFile() {
    document.getElementById('existingFileInfo')?.remove();
    document.getElementById('hdnRemoveFile').value = 'true';
    document.getElementById('hdnExistingFile').value = '';
}

const maxFileSizeMB = 1;
const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;

document.getElementById('attachFile')?.addEventListener('change', function () {
    const fileInfo = document.getElementById('fileInfo');
    const file = this.files[0];

    if (!file) {
        fileInfo.textContent = '';
        return;
    }

    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);

    if (file.size > maxFileSizeBytes) {
        fileInfo.textContent = `File is ${sizeMB} MB. Max allowed size is ${maxFileSizeMB} MB.`;
        fileInfo.classList.remove('text-muted');
        fileInfo.classList.add('text-danger');
        this.value = '';
    } else {
        fileInfo.textContent = `Selected file size: ${sizeMB} MB`;
        fileInfo.classList.remove('text-danger');
        fileInfo.classList.add('text-muted');

        document.getElementById('hdnRemoveFile').value = 'false';
        document.getElementById('existingFileInfo')?.remove();
    }
});

// ========================================
// Partial reload — used by submitForm() for filter/search/pagination,
// and by refreshCurrentPage() after delete/approve/reject actions
// ========================================
function loadApproveLeavePartial(queryString) {
    const container = document.getElementById('approveLeaveTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/Attendance/GetApproveLeavePartial?${queryString}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to load leave applications');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            container.style.opacity = '1';

            if ($.fn.DataTable.isDataTable('#tblLeave')) {
                $('#tblLeave').DataTable().destroy();
            }
            if (document.getElementById('tblLeave')) {
                window.exportTable = $('#tblLeave').DataTable({
                    dom: 'Bfrtip',
                    buttons: [
                        { extend: 'copy', exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], rows: ':visible' } },
                        { extend: 'csv', exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], rows: ':visible' } },
                        { extend: 'excel', exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], rows: ':visible' } },
                        { extend: 'pdf', exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], rows: ':visible' } },
                        { extend: 'print', exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], rows: ':visible' } }
                    ],
                    searching: false,
                    paging: false,
                    info: false,
                    ordering: false
                });
            }

            // Keep badges in sync every time the table is refreshed,
            // whether from filters, pagination, delete, or approve/reject.
            renderFilterBadges();
            updateButtonStates();

            // Selection state (Edit/Delete buttons) is tied to rows that no
            // longer exist after a refresh — reset it.
            selectedId = 0;
            document.getElementById('btnEdit') && (document.getElementById('btnEdit').disabled = true);
            document.getElementById('btnDelete') && (document.getElementById('btnDelete').disabled = true);
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.toast) window.toast.error('Could not refresh the list.');
        });
}

// ✅ Pagination click interception, scoped to the approve-leave container
document.addEventListener('click', function (e) {
    const link = e.target.closest('#approveLeaveTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('PageIndex') || 1;
    loadApproveLeavePartial(query);
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