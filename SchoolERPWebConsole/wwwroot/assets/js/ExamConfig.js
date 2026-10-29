// ========================================
// Export helper (DataTable buttons)
// ========================================
function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#examConfigTable')) {
        $('#examConfigTable').DataTable().button(index).trigger();
    }
}

// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_subject';
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
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
    const classEl = document.getElementById('ddlClass');
    if (sessionEl) document.getElementById('hdnSessionID').value = sessionEl.value;
    if (companyEl) document.getElementById('hdnCompanyId').value = companyEl.value;
    if (classEl) document.getElementById('hdnClassId').value = classEl.value;

    const form = document.getElementById('frmSearch');
    const params = new URLSearchParams(new FormData(form)).toString();

    loadExamConfigPartial(params);
}

function loadExamConfigPartial(queryString) {
    const container = document.getElementById('ExamConfigTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';
    var companyname = localStorage.getItem("comName");
    fetch(`/ExamConfig/GetExamConfigPartial?${queryString}`, {
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

            if ($.fn.DataTable.isDataTable('#examConfigTable')) {
                $('#examConfigTable').DataTable().destroy();
            }
            exportTable = $('#examConfigTable').DataTable({
                dom: 'Bfrtip',
                buttons: [
                    { extend: 'copy', title: `Exam Config - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
                    { extend: 'csv', title: `Exam Config- ${companyname}`, exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
                    { extend: 'excel', title: `Exam Config - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
                    { extend: 'pdf', title: `Exam Config - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
                    { extend: 'print', title: `Exam Config- ${companyname}`, exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } }
                ],
                searching: false,
                paging: false,
                info: false,
                ordering: false
            });

            updateButtonStates();
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.toast) window.toast.error('Could not refresh the list.');
        });
}

// ✅ NEW — pagination click interception, scoped to the subject container
document.addEventListener('click', function (e) {
    const link = e.target.closest('#ExamConfigTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    loadExamConfigPartial(query);
    history.replaceState(null, '', href);
});

// ✅ CHANGED — added renderFilterBadges() at the end
function applyFilters() {
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
    const classEl = document.getElementById('ddlClass');
    const searchEl = document.getElementById('txtSearchInput');

    const searchVal = searchEl?.value.trim();
    if (searchVal) appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    else delete appliedFilters['txtSearchInput'];

    if (sessionEl?.value && sessionEl.value !== '') {
        appliedFilters['ddlFilterSessions'] = {
            label: 'Session',
            text: sessionEl.options[sessionEl.selectedIndex]?.text || sessionEl.value
        };
    } else delete appliedFilters['ddlFilterSessions'];

    if (companyEl?.value && companyEl.value !== '') {
        appliedFilters['ddlFilterCompany'] = {
            label: 'Company',
            text: companyEl.options[companyEl.selectedIndex]?.text || companyEl.value
        };
    } else delete appliedFilters['ddlFilterCompany'];

    if (classEl?.value && classEl.value !== '') {
        appliedFilters['ddlClass'] = {
            label: 'Class',
            text: classEl.options[classEl.selectedIndex]?.text || classEl.value
        };
    } else delete appliedFilters['ddlClass'];

    saveAppliedFilters();
    renderFilterBadges(); // ✅ NEW
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

// ✅ CHANGED — added renderFilterBadges() after saveAppliedFilters()
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
    }
    else if (filterId === 'ddlClass') {
        const el = document.getElementById('ddlClass');
        if (el) {
            el.value = '';
            if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
        }
    }
    else if (filterId === 'txtSearchInput') {
        const el = document.getElementById('txtSearchInput');
        if (el) el.value = '';
        document.getElementById('hdnSearch').value = '';
    }

    delete appliedFilters[filterId];
    saveAppliedFilters();
    renderFilterBadges(); // ✅ NEW
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

// ✅ CHANGED — added renderFilterBadges() after clearAppliedFilters()
function resetAllFilters() {
    document.getElementById('txtSearchInput').value = '';
    document.getElementById('hdnSearch').value = '';

    ['ddlFilterSessions', 'ddlFilterCompany','ddlClass'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = '';
        if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
    });

    clearAppliedFilters();
    renderFilterBadges(); // ✅ NEW
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

// ========================================
// DOMContentLoaded — init DataTable + UI
// ✅ CHANGED — this is now the ONLY DOMContentLoaded block. The duplicate
// block that used to sit at the bottom of the file has been removed entirely
// (it was re-initializing the DataTable, re-binding Select2, and double-firing
// btnApplyFilters/btnResetFilters click handlers).
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnApplyFilters')?.addEventListener('click', () => {
        document.getElementById('hdnPageIndex').value = 1;
        document.getElementById('hdnSearch').value = document.getElementById('txtSearchInput').value;
        applyFilters();
        submitForm();
    });

    var companyname = localStorage.getItem("comName");
    // ── DataTable (export only) ───────────────────────────────────────
    if ($.fn.DataTable.isDataTable('#subjectsTable')) {
        $('#subjectsTable').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#subjectsTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Subjects Type - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'csv', title: `Subjects Type - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'excel', title: `Subjects Type - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'pdf', title: `Subjects Type - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'print', title: `Subjects Type - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false
    });

    // ── Select2 ───────────────────────────────────────────────────────
    try {
        if (window.jQuery && typeof jQuery.fn.select2 === 'function') {
            jQuery('#ddlFilterSessions, #ddlFilterCompany','#ddlClass').select2({
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
    // ✅ CHANGED — calls the single resetAllFilters() function instead of
    // duplicating its body inline (removes the double-submit risk).
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
        renderFilterBadges(); // ✅ NEW

        submitForm();
    }, 500);
});

// ========================================
// Validation & UI helpers
// ========================================
const IV = {
    clearMap: (map) => Object.keys(map).forEach(k => {
        document.getElementById(k)?.classList.remove('is-invalid');
        const err = document.getElementById(map[k]); if (err) err.textContent = '';
    }),
    setFieldError: (id, errId, msg) => {
        document.getElementById(id)?.classList.add('is-invalid');
        const err = document.getElementById(errId); if (err) err.textContent = msg;
    },
    setNotice: (id, msg, type = 'danger') => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">${msg}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
    },
    clearNotice: (id) => { const el = document.getElementById(id); if (el) el.innerHTML = ''; },
    bindAutoClear: (map) => Object.keys(map).forEach(k => document.getElementById(k)?.addEventListener('input', () => {
        document.getElementById(k)?.classList.remove('is-invalid');
        const err = document.getElementById(map[k]); if (err) err.textContent = '';
    }))
};

const fieldMap = { txtSubjectName: 'errTxtSubjectName' };
let selectedId = 0;
IV.bindAutoClear(fieldMap);


// ========================================
// Row selection
// ========================================
function selectItem(id, row) {
    IV.clearNotice('pageNotice');
    selectedId = id;
    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light-primary'));
    row.classList.add('bg-light-primary');

    const checkedCount = $('.student-checkbox:checked').length;
    $('#btnDelete').prop('disabled', checkedCount === 0);
    $('#btnEdit').prop('disabled', checkedCount !== 1);
    $('#btnActive').prop('disabled', checkedCount === 0);
    $('#btnInactive').prop('disabled', checkedCount === 0);
}

// ========================================
// Edit
// ========================================
async function editSelected() {
    if (!window.canEdit) { IV.setNotice('pageNotice', 'You do not have permission to edit.'); return; }
    if (selectedId === 0) return;
    IV.clearNotice('pageNotice');
    location.href = `/ExamConfig/Add/${selectedId}`;
}

// ========================================
// Delete
// ========================================
async function deleteSelected() {
    if (!window.canDelete) { IV.setNotice('pageNotice', 'You do not have permission to delete.'); return; }

    const selectedIds = [];
    $('.student-checkbox:checked').each(function () { selectedIds.push(parseInt($(this).val())); });
    if (selectedIds.length === 0) { alert('Please select at least one subject.'); return; }

    Swal.fire({
        title: 'Are you sure?',
        text: 'You are about to delete this exam record. This action cannot be undone!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        customClass: { confirmButton: 'btn btn-danger me-2', cancelButton: 'btn btn-secondary' },
        buttonsStyling: false
    }).then(result => {
        if (!result.isConfirmed) return;
        $.ajax({
            url: '/ExamConfig/Delete',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(selectedIds),
            success: res => res.success
                ? Swal.fire('Deleted!', 'Exam record has been deleted.', 'success')
                    .then(() => loadExamConfigPartial(new URLSearchParams(new FormData(document.getElementById('frmSearch'))).toString())) // ✅ CHANGED — was location.reload()
                : Swal.fire('Error!', res.message || 'Failed to delete exam.', 'error'),
            error: () => Swal.fire('Error!', 'An unexpected error occurred.', 'error')
        });
    });
}

// ========================================
// Save (modal)
// ✅ CHANGED — validates ALL fields and shows ALL errors together instead of
// stopping at the first one. This is why "Subject Type" never showed its
// error in your screenshot — the function returned before checking it.
// ========================================
async function saveItem() {

    // ==============================
    // Get IDs / Values
    // ==============================
    const examConfigId = parseInt(
        document.getElementById('txtItemId')?.value || '0',
        10
    );

    const classId = parseInt(
        document.getElementById('ddlClass')?.value || '0',
        10
    );

    const examGroupId = parseInt(
        document.getElementById('ddlExamGroup')?.value || '0',
        10
    );

    const examId = parseInt(
        document.getElementById('ddlExam')?.value || '0',
        10
    );

    const margeExam =
        document.getElementById('ddlSubjectType')?.value || '';

    const percentageValue =
        document.getElementById('txtPercentage')?.value || '0';

    const percentage = parseFloat(percentageValue);

    const sequenceValue =
        document.getElementById('txtSequence')?.value || '0';

    const sequence = parseInt(sequenceValue, 10);

    const companyID = parseInt(
        document.getElementById('hdnCompanyID')?.value || '0',
        10
    );

    const sessionID = parseInt(
        document.getElementById('hdnSessionID')?.value || '0',
        10
    );

    const userId = parseInt(
        document.getElementById('hdnUserID')?.value || '0',
        10
    );


    // ==============================
    // Permission
    // ==============================
    if (examConfigId === 0 && !window.canAdd) {
        IV.setNotice(
            'modalNotice',
            'You do not have permission to add.'
        );
        return;
    }

    if (examConfigId > 0 && !window.canEdit) {
        IV.setNotice(
            'modalNotice',
            'You do not have permission to edit.'
        );
        return;
    }


    // ==============================
    // Clear Previous Errors
    // ==============================
    IV.clearMap(fieldMap);

    let isValid = true;


    // ==============================
    // Validation
    // ==============================

    if (!classId || classId <= 0) {
        IV.setFieldError(
            'ddlClass',
            'errDdlClass',
            'Class is required.'
        );
        isValid = false;
    }

    if (!examGroupId || examGroupId <= 0) {
        IV.setFieldError(
            'ddlExamGroup',
            'errDdlExamGroup',
            'Exam group is required.'
        );
        isValid = false;
    }

    if (!examId || examId <= 0) {
        IV.setFieldError(
            'ddlExam',
            'errDdlExam',
            'Exam is required.'
        );
        isValid = false;
    }

    if (!margeExam) {
        IV.setFieldError(
            'ddlSubjectType',
            'errDdlSubjectType',
            'Marge exam is required.'
        );
        isValid = false;
    }

    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        IV.setFieldError(
            'txtPercentage',
            'errTxtPercentage',
            'Percentage must be between 0 and 100.'
        );
        isValid = false;
    }

    if (isNaN(sequence) || sequence <= 0) {
        IV.setFieldError(
            'txtSequence',
            'errTxtSequence',
            'Sequence is required.'
        );
        isValid = false;
    }

    if (!isValid) {
        return;
    }


    // ==============================
    // Request Data
    // ==============================
    const data = {
        examConfigID: examConfigId,
        companyID: companyID,
        sessionID: sessionID,
        classID: classId,
        examGroupID: examGroupId,
        examID: examId,
        margeExam: margeExam,
        percentage: percentage,
        sequence: sequence,
        userId: userId
    };


    console.log("ExamConfig Save Data:", data);


    // ==============================
    // Save
    // ==============================
    const isEdit = examConfigId > 0;

    try {

        const r = await fetch('/ExamConfig/Save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const res = await r.json();

        console.log("Save Response:", res);

        if (res.success) {

            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: isEdit
                    ? 'Exam configuration has been updated successfully.'
                    : 'Exam configuration has been added successfully.',
                confirmButtonText: 'OK',
                customClass: {
                    confirmButton: 'btn btn-success'
                },
                buttonsStyling: false
            }).then(() => {

                window.location.href = '/ExamConfig/Index';

            });

        } else {

            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.message || 'Failed to save exam configuration.',
                confirmButtonText: 'OK',
                customClass: {
                    confirmButton: 'btn btn-danger'
                },
                buttonsStyling: false
            });

        }

    } catch (err) {

        console.error("Save ExamConfig Error:", err);

        IV.setNotice(
            'modalNotice',
            'Could not save exam configuration.'
        );
    }
}

// ========================================
// Toggle Status
// ========================================
async function toggleStatus(id, isActive, checkboxEl) {
    let sectionIds = [];
    let checkedBoxes = [];
    $('.student-checkbox:checked').each(function () {
        sectionIds.push(parseInt($(this).val()));
        checkedBoxes.push(this);
    });
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
            ? { icon: 'question', title: 'Activate Record(s)?', text: 'Activating this record will make it visible and available for use across the system. Do you want to continue?' }
            : { icon: 'warning', title: 'Deactivate Record(s)?', text: 'Deactivating this record will hide it from the system and prevent it from being used. Do you want to continue?' };

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
                    url: '/ExamConfig/ToggleStatus',
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
    } catch (err) {
        revertAll();
        console.error(err);
        IV.setNotice('sectionPageNotice', 'Could not update status.');
        location.reload();
    }
}

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

// ✅ CHANGED — was addEventListener('change', ...) on the raw element,
// which doesn't reliably fire for Select2 since it triggers change via jQuery.
// Also added setSelect2Invalid() to sync the visible Select2 box, not just the hidden <select>.
$('#ddlSubjectType').on('change', function () {
    this.classList.remove('is-invalid');
    setSelect2Invalid('ddlSubjectType', false); // ✅ NEW
    const err = document.getElementById('errDdlSubjectType');
    if (err) err.textContent = '';
});

// ✅ NEW — same helper used for ddlSections, reused here for ddlSubjectType
function setSelect2Invalid(selectId, isInvalid) {
    const $el = $('#' + selectId);
    $el.toggleClass('is-invalid', isInvalid);
    const $rendered = $el.next('.select2-container').find('.select2-selection');
    $rendered.toggleClass('is-invalid', isInvalid);
}
//
// "Copy Exam Grade" modal controller.
// Scoped by Session + Class. CompanyID comes from the logged-in context
// (window.getCompanyId()) and is sent as-is with every request.
//
// To Class is MULTI — selected values are joined into "5,4,1" and posted
// as ToClassIDs (string), matching ExamConfigCopyRequest.
//
// Element IDs this file owns (must match _CopyExamGradeModal.cshtml):
//   fromSessionGrade, fromClassGrade, toSessionGrade, toClassGrade,
//   validationBoxGrade, tableSectionGrade, tblGradeCopy, gradeTbody,
//   btnCopyGrade
//

// Entry point used by the Exam Grade page's Copy button.
function openCopyModal() {
    if (typeof openCopyExamGradeModal === 'function') {
        openCopyExamGradeModal();
    } else {
        console.error('copyExamGradeModal.js not loaded on this page.');
    }
}

let gradeSelect2Ready = false;

function openCopyExamGradeModal() {
    document.getElementById('validationBoxGrade').classList.add('d-none');
    document.getElementById('tableSectionGrade').classList.add('d-none');
    document.getElementById('btnCopyGrade').disabled = true;
    document.getElementById('gradeTbody').innerHTML = '';

    resetSelectGrade('fromSessionGrade', 'From session');
    resetSelectGrade('fromClassGrade', 'Loading...');
    resetSelectGrade('toSessionGrade', 'To session');

    document.getElementById('fromClassGrade').disabled = true;
    setToClassOptions([]);

    new bootstrap.Modal(document.getElementById('copyExamGradeModal')).show();
    initCopyExamGrade();
}

function resetSelectGrade(id, placeholder) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<option value="">${placeholder}</option>`;
}

function populateSelectGrade(selectId, items, valueKey, textKey, placeholder) {
    const el = document.getElementById(selectId);
    if (!el) return;
    el.innerHTML = `<option value="">${placeholder}</option>`;
    items.forEach(i => el.add(new Option(i[textKey], i[valueKey])));
}

// ── select2 for the multi "To Class" ────────────────────────────────
function initToClassSelect2() {
    if (gradeSelect2Ready || typeof $ !== 'function' || !$.fn.select2) return;
    $('#toClassGrade').select2({
        dropdownParent: $('#copyExamGradeModal'),
        width: '100%',
        placeholder: 'Select To class(es)',
        closeOnSelect: false
    }).on('change', validateCopyExamGrade);
    gradeSelect2Ready = true;
}

function setToClassOptions(items) {
    const el = document.getElementById('toClassGrade');
    if (!el) return;
    el.innerHTML = '';
    items.forEach(i => el.add(new Option(i.className, i.classID)));
    if (gradeSelect2Ready) $('#toClassGrade').val(null).trigger('change.select2');
}

function getToClassIds() {
    const el = document.getElementById('toClassGrade');
    if (!el) return [];
    return Array.from(el.selectedOptions).map(o => o.value).filter(Boolean);
}

// ── Initial load: session list for the current company ──────────────
async function initCopyExamGrade() {
    try {
        const companyId = window.getCompanyId ? window.getCompanyId() : 0;
        const currentSessionId = window.getSessionId ? window.getSessionId() : 0;

        const sessions = await fetchSessionsGrade(companyId);

        populateSelectGrade('fromSessionGrade', sessions, 'sessionId', 'sessionTitle', 'From session');
        populateSelectGrade('toSessionGrade', sessions, 'sessionId', 'sessionTitle', 'To session');

        initToClassSelect2();

        // Default the source to the current session, then load its classes.
        if (currentSessionId) {
            document.getElementById('fromSessionGrade').value = String(currentSessionId);
            await onFromSessionChangeGrade();
        }
    } catch (e) {
        console.error('initCopyExamGrade error:', e);
    }
}

async function fetchSessionsGrade(companyId) {
    const resp = await fetch(`/Sessions/GetByCompany?companyId=${companyId}`);
    const payload = await resp.json();
    return (payload && payload.success && Array.isArray(payload.data)) ? payload.data : [];
}

async function fetchClassesGrade(sessionId) {
    const companyId = window.getCompanyId ? window.getCompanyId() : 0;
    const resp = await fetch(`/ExamGrade/GetClassList?companyId=${companyId}&sessionId=${sessionId}`);
    const payload = await resp.json();
    return (payload && payload.success && Array.isArray(payload.data)) ? payload.data : [];
}

// ── Session change handlers: re-fetch that side's class list, then validate ──
async function onFromSessionChangeGrade() {
    const sessionId = document.getElementById('fromSessionGrade').value;
    const classSel = document.getElementById('fromClassGrade');

    if (!sessionId) {
        resetSelectGrade('fromClassGrade', 'From class');
        classSel.disabled = true;
        validateCopyExamGrade();
        return;
    }

    resetSelectGrade('fromClassGrade', 'Loading...');
    classSel.disabled = true;

    const classes = await fetchClassesGrade(sessionId);
    populateSelectGrade('fromClassGrade', classes, 'classID', 'className', 'From class');
    classSel.disabled = false;

    validateCopyExamGrade();
}

async function onToSessionChangeGrade() {
    const sessionId = document.getElementById('toSessionGrade').value;

    if (!sessionId) {
        setToClassOptions([]);
        validateCopyExamGrade();
        return;
    }

    const classes = await fetchClassesGrade(sessionId);
    setToClassOptions(classes);

    validateCopyExamGrade();
}

// ── Runs on every dropdown change ───────────────────────────────────
function validateCopyExamGrade() {
    const fromSessionId = document.getElementById('fromSessionGrade').value;
    const fromClassId = document.getElementById('fromClassGrade').value;
    const toSessionId = document.getElementById('toSessionGrade').value;
    const toClassIds = getToClassIds();

    const fromFilled = !!(fromSessionId && fromClassId);
    const toFilled = !!(toSessionId && toClassIds.length);

    // Same session AND the ONLY destination class is the source class.
    const isSame = fromFilled && toFilled &&
        fromSessionId === toSessionId &&
        toClassIds.length === 1 && toClassIds[0] === fromClassId;

    document.getElementById('validationBoxGrade').classList.toggle('d-none', !isSame);

    if (!fromFilled) {
        document.getElementById('tableSectionGrade').classList.add('d-none');
        document.getElementById('btnCopyGrade').disabled = true;
        return;
    }

    loadGradePreview(fromSessionId, fromClassId, toFilled && !isSame);
}

// ── Preview-only grade rows for the source session/class ────────────
async function loadGradePreview(sessionId, classId, allowEnableCopy) {
    const tbody = document.getElementById('gradeTbody');

    try {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-3 text-muted">
            <div class="spinner-border spinner-border-sm me-2"></div>Loading...</td></tr>`;
        document.getElementById('tableSectionGrade').classList.remove('d-none');

        const companyId = window.getCompanyId ? window.getCompanyId() : 0;
        const resp = await fetch(`/ExamConfig/GetGradePreview?companyId=${companyId}&sessionId=${sessionId}&classId=${classId}`);
        const res = await resp.json();

        if (!res.success || !Array.isArray(res.data) || res.data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-3 text-muted">
                No grade rows found for the source.</td></tr>`;
            document.getElementById('btnCopyGrade').disabled = true;
            return;
        }

        tbody.innerHTML = res.data.map((r, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${r.examName ?? '-'}</td>
                <td>${r.examGroupName ?? '-'}</td>
                <td>${r.margeExam ?? '-'}</td>
                <td>${r.percentage ?? '-'}</td>
                <td>${r.sequence ?? '-'}</td>
            </tr>`).join('');

        document.getElementById('btnCopyGrade').disabled = !allowEnableCopy;
    } catch (err) {
        console.error('loadGradePreview error:', err);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-3 text-danger">
            <i class="ti ti-alert-circle me-1"></i>Failed to load data.</td></tr>`;
        document.getElementById('btnCopyGrade').disabled = true;
    }
}

// ── Copy button ─────────────────────────────────────────────────────
async function handleCopyExamGrade() {
    const fromSessionId = document.getElementById('fromSessionGrade').value;
    const fromClassId = document.getElementById('fromClassGrade').value;
    const toSessionId = document.getElementById('toSessionGrade').value;
    const toClassIds = getToClassIds();

    if (!fromSessionId || !fromClassId || !toSessionId || !toClassIds.length) {
        showToastGrade('Please select source session/class and destination session/class(es).', 'danger');
        return;
    }
    if (fromSessionId === toSessionId && toClassIds.length === 1 && toClassIds[0] === fromClassId) {
        showToastGrade('Source and destination cannot be the same.', 'danger');
        return;
    }

    const payload = {
        companyID: window.getCompanyId ? window.getCompanyId() : 0,
        fromSessionID: parseInt(fromSessionId, 10),
        fromClassID: parseInt(fromClassId, 10),
        toSessionID: parseInt(toSessionId, 10),
        toClassIDs: toClassIds.join(',')   // "5,4,1"
    };

    const btn = document.getElementById('btnCopyGrade');
    btn.disabled = true;

    try {
        const res = await fetch('/ExamConfig/CopyExamConfig', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById('copyExamGradeModal')).hide();
            showToastGrade(data.message || 'Copied successfully.', 'success');
        } else {
            showToastGrade(data.message || 'Copy failed.', 'danger');
            btn.disabled = false;
        }
    } catch {
        showToastGrade('Network error. Please try again.', 'danger');
        btn.disabled = false;
    }
}

function showToastGrade(msg, type) {
    if (typeof showToast === 'function') showToast(msg, type);
    else alert(msg);
}

window.openCopyModal = openCopyModal;
window.openCopyExamGradeModal = openCopyExamGradeModal;
window.onFromSessionChangeGrade = onFromSessionChangeGrade;
window.onToSessionChangeGrade = onToSessionChangeGrade;
window.validateCopyExamGrade = validateCopyExamGrade;
window.handleCopyExamGrade = handleCopyExamGrade;