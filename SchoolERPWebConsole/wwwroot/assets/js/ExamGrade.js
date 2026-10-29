let currentSubjectTypeId = null;
let currentClassId = null;
let rowCounter = 0;

$(document).ready(function () {
    $('.select2').select2();

    $('#ddlSubjectType, #ddlClass').on('change', function () {
        onFilterChanged();
    });

    // If the page was rendered with values pre-selected (deep link / edit mode)
    const preSubjectTypeId = $('#ddlSubjectType').val();
    const preClassId = $('#ddlClass').val();
    if (preSubjectTypeId && preClassId) {
        onFilterChanged();
    }
});

// -----------------------------------------------------------------
// Fires whenever Subject Type or Class changes. Only proceeds once
// BOTH are selected — the grid is keyed by this combination.
// -----------------------------------------------------------------
function onFilterChanged() {
    const subjectTypeId = $('#ddlSubjectType').val();
    const classId = $('#ddlClass').val();

    if (!subjectTypeId || !classId) {
        $('#gradeGridWrapper').hide();
        $('#gradeGridEmptyMsg').show();
        $('#gradeGridBody').empty();
        currentSubjectTypeId = null;
        currentClassId = null;
        return;
    }

    currentSubjectTypeId = parseInt(subjectTypeId);
    currentClassId = parseInt(classId);

    loadGradeGrid(currentSubjectTypeId, currentClassId);
}

// -----------------------------------------------------------------
// AJAX: fetch existing grade rows for this Subject Type + Class.
// Empty result -> render one blank row so the user has somewhere
// to start typing (matches the original screen's behavior).
// -----------------------------------------------------------------
function loadGradeGrid(subjectTypeId, classId) {
    const companyId = $('#hdnCompanyID').val();
    const sessionId = $('#hdnSessionID').val();

    $.ajax({
        url: window.getByFilterUrl,
        type: 'GET',
        data: {
            companyId: companyId,
            sessionId: sessionId,
            subjectTypeId: subjectTypeId,
            classId: classId
        },
        success: function (response) {
            $('#gradeGridBody').empty();
            rowCounter = 0;

            if (response.success && response.data && response.data.length > 0) {
                response.data.forEach(function (row) {
                    addGridRow(row);
                });
            } else {
                addGridRow(); // one blank starter row
            }

            $('#gradeGridWrapper').show();
            $('#gradeGridEmptyMsg').hide();
        },
        error: function (xhr) {
            toastr.error('Unable to load grade configuration.');
        }
    });
}

// -----------------------------------------------------------------
// Adds one row to the grid. Pass an existing row object to prefill
// (edit), or call with no args to add a blank row.
// -----------------------------------------------------------------
function addGridRow(row) {
    rowCounter++;
    const sNo = $('#gradeGridBody tr').length + 1;

    const minRange = row ? row.minRange : '';
    const maxRange = row ? row.maxRange : '';
    const examGrade = row ? row.examGradeName : '';
    const gradePointer = row ? row.gradePointer : '';
    const remark = row ? row.remark : '';

    const rowHtml = `
        <tr data-row-id="${rowCounter}">
            <td class="row-sno">${sNo}</td>
            <td><input type="number" step="0.01" class="form-control txt-min-range" value="${minRange}"></td>
            <td><input type="number" step="0.01" class="form-control txt-max-range" value="${maxRange}"></td>
            <td><input type="text" class="form-control txt-exam-grade" value="${examGrade}"></td>
            <td><input type="number" step="0.01" class="form-control txt-grade-pointer" value="${gradePointer}"></td>
            <td><input type="text" class="form-control txt-remark" value="${remark ?? ''}"></td>
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeGridRow(this)">
                    <i class="ti ti-trash"></i>
                </button>
            </td>
        </tr>`;

    $('#gradeGridBody').append(rowHtml);
}

function removeGridRow(btn) {
    $(btn).closest('tr').remove();
    renumberRows();
}

function renumberRows() {
    $('#gradeGridBody tr').each(function (index) {
        $(this).find('.row-sno').text(index + 1);
    });
}

function resetGrid() {
    if (currentSubjectTypeId && currentClassId) {
        loadGradeGrid(currentSubjectTypeId, currentClassId);
    } else {
        $('#gradeGridBody').empty();
        $('#gradeGridWrapper').hide();
        $('#gradeGridEmptyMsg').show();
    }
}

// -----------------------------------------------------------------
// Reads every grid row into the shape the API expects
// (ExamGradeRowRequest[]).
// -----------------------------------------------------------------
function collectGridRows() {
    const rows = [];
    $('#gradeGridBody tr').each(function () {
        const $tr = $(this);
        const minRange = $tr.find('.txt-min-range').val();
        const maxRange = $tr.find('.txt-max-range').val();
        const examGrade = $tr.find('.txt-exam-grade').val();
        const gradePointer = $tr.find('.txt-grade-pointer').val();
        const remark = $tr.find('.txt-remark').val();

        // Skip fully blank trailing rows
        if (minRange === '' && maxRange === '' && !examGrade && !gradePointer) {
            return;
        }

        rows.push({
            minRange: parseFloat(minRange) || 0,
            maxRange: parseFloat(maxRange) || 0,
            examGrade: examGrade || '',
            gradePointer: parseFloat(gradePointer) || 0,
            remark: remark || null
        });
    });
    return rows;
}

// -----------------------------------------------------------------
// SAVE — validates dropdowns + at least one grid row, then posts
// the whole grid for this Subject Type + Class combination.
// -----------------------------------------------------------------
function saveItem() {
    const subjectTypeId = $('#ddlSubjectType').val();
    const classId = $('#ddlClass').val();

    $('#ddlSubjectType').removeClass('is-invalid');
    $('#ddlClass').removeClass('is-invalid');

    let hasError = false;
    if (!subjectTypeId) {
        $('#ddlSubjectType').addClass('is-invalid');
        hasError = true;
    }
    if (!classId) {
        $('#ddlClass').addClass('is-invalid');
        hasError = true;
    }
    if (hasError) {
        toastr.error('Please select Subject Type and Class.');
        return;
    }

    const gradeRows = collectGridRows();
    if (gradeRows.length === 0) {
        toastr.error('Please add at least one grade row.');
        return;
    }

    const payload = {
        ExamGradeID: parseInt($('#txtItemId').val()) || 0,
        CompanyID: parseInt($('#hdnCompanyID').val()) || 0,
        SessionID: parseInt($('#hdnSessionID').val()) || 0,
        SubjectTypeID: parseInt(subjectTypeId),
        ClassID: parseInt(classId),
        GradeRows: gradeRows,
        UserId: parseInt($('#hdnUserID').val()) || 0,
        IPAddress: null
    };

    $.ajax({
        url: window.saveUrl,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload),
        success: function (response) {
            if (response.success) {                
                Swal.fire({
                    icon: 'success',
                    title: 'Saved!',
                    text: 'Exam grade has been save successfully.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-success' },
                    buttonsStyling: false
                }).then(() => {
                    loadGradeGrid(payload.SubjectTypeID, payload.ClassID);// refresh with server state
                });
                 
            } else {
                
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: response.message || 'Failed to save exam grade .',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-danger' },
                    buttonsStyling: false
                });
            }
        },
        error: function () {
            toastr.error('Unable to save. Please try again.');
        }
    });
}

function openCopyModal() {
    // Delegates to the modal controller defined in copyExamGradeModal.js.
    // That modal (#copyExamGradeModal) is rendered into #ExamGradeCopyModalContainer
    // via the _CopyExamGradeModal partial — it's already in the DOM, so we
    // just need to trigger bootstrap.Modal.show() on it via this helper.
    if (typeof openCopyExamGradeModal === 'function') {
        openCopyExamGradeModal();
    } else {
        console.error('copyExamGradeModal.js not loaded on this page.');
    }
}
//
// "Copy Exam Grade" modal controller.
// Scoped by SubjectType + Class, NOT Company/Session — Company/Session
// come from the current logged-in context (window.getCompanyId() /
// window.getSessionId(), same helpers copyPurposeModal.js relies on)
// and are sent as-is with every request; they're never chosen here.
//
// No row selection — the table is a preview of what will be copied.
// Copy always copies ALL rows currently loaded for the source
// SubjectType/Class combo.
//
// Element IDs this file owns (must match _CopyExamGradeModal.cshtml):
//   fromSubjectTypeGrade, fromClassGrade,
//   toSubjectTypeGrade, toClassGrade,
//   validationBoxGrade, tableSectionGrade,
//   tblGradeCopy, gradeTbody, btnCopyGrade
//
// Usage from the Exam Grade page's Copy button:
//   openCopyExamGradeModal();
//

let examGradeDropdownsLoaded = false;

// ── Opens the modal and (re)loads the dropdowns fresh each time ────
function openCopyExamGradeModal() {
    document.getElementById('validationBoxGrade').classList.add('d-none');
    document.getElementById('tableSectionGrade').classList.add('d-none');
    document.getElementById('btnCopyGrade').disabled = true;
    document.getElementById('gradeTbody').innerHTML = '';

    resetSelect('fromSubjectTypeGrade', 'From Subject Type');
    resetSelect('fromClassGrade', 'From Class');
    resetSelect('toSubjectTypeGrade', 'To Subject Type');
    resetSelect('toClassGrade', 'To Class');

    new bootstrap.Modal(document.getElementById('copyExamGradeModal')).show();
    initCopyExamGrade();
}

function resetSelect(id, placeholder) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<option value="">${placeholder}</option>`;
}

// ── Loads Subject Type + Class dropdowns (both From and To use the
//    SAME lists — they're scoped to the current Company/Session only,
//    not to each other). ─────────────────────────────────────────────
async function initCopyExamGrade() {
    try {
        const companyId = window.getCompanyId ? window.getCompanyId() : null;
        const sessionId = window.getSessionId ? window.getSessionId() : null;

        const [subjectTypes, classes] = await Promise.all([
            fetchSubjectTypesGrade(companyId, sessionId),
            fetchClassesGrade(companyId, sessionId)
        ]);

        populateSelect('fromSubjectTypeGrade', subjectTypes, 'id', 'name', 'From Subject Type');
        populateSelect('toSubjectTypeGrade', subjectTypes, 'id', 'name', 'To Subject Type');
        populateSelect('fromClassGrade', classes, 'classID', 'className', 'From Class');
        populateSelect('toClassGrade', classes, 'classID', 'className', 'To Class');

        examGradeDropdownsLoaded = true;
    } catch (e) {
        console.error('initCopyExamGrade error:', e);
    }
}

async function fetchSubjectTypesGrade(companyId, sessionId) {
    const resp = await fetch(`/ExamGrade/GetSubjectTypeList?companyId=${companyId}&sessionId=${sessionId}`);
    const payload = await resp.json();
    return (payload && payload.success && Array.isArray(payload.data)) ? payload.data : [];
}

async function fetchClassesGrade(companyId, sessionId) {
    const resp = await fetch(`/ExamGrade/GetClassList?companyId=${companyId}&sessionId=${sessionId}`);
    const payload = await resp.json();
    return (payload && payload.success && Array.isArray(payload.data)) ? payload.data : [];
}

function populateSelect(selectId, items, valueKey, textKey, placeholder) {
    const el = document.getElementById(selectId);
    if (!el) return;
    el.innerHTML = `<option value="">${placeholder}</option>`;
    items.forEach(item => {
        el.add(new Option(item[textKey], item[valueKey]));
    });
}

// ── Fired when From Subject Type or From Class changes. Reloads the
//    preview table for the (possibly new) source combo, then
//    re-validates against the destination. ─────────────────────────
function onFromComboChangeGrade() {
    validateCopyExamGrade();
}

// ── Runs on every dropdown change (From or To). Checks From != To,
//    loads the source preview if both From fields are filled, and
//    only enables Copy once everything lines up. ────────────────────
function validateCopyExamGrade() {
    const fromSubjectTypeId = document.getElementById('fromSubjectTypeGrade').value;
    const fromClassId = document.getElementById('fromClassGrade').value;
    const toSubjectTypeId = document.getElementById('toSubjectTypeGrade').value;
    const toClassId = document.getElementById('toClassGrade').value;

    const fromFilled = fromSubjectTypeId && fromClassId;
    const toFilled = toSubjectTypeId && toClassId;
    const isSame = fromFilled && toFilled &&
        fromSubjectTypeId === toSubjectTypeId && fromClassId === toClassId;

    document.getElementById('validationBoxGrade').classList.toggle('d-none', !isSame);

    if (!fromFilled) {
        document.getElementById('tableSectionGrade').classList.add('d-none');
        document.getElementById('btnCopyGrade').disabled = true;
        return;
    }

    loadGradePreview(fromSubjectTypeId, fromClassId, toFilled && !isSame);
}

// ── Loads (preview-only) grade rows for the source combo. Enables
//    Copy only if there's data AND destination is valid/distinct. ──
async function loadGradePreview(subjectTypeId, classId, allowEnableCopy) {
    const tbody = document.getElementById('gradeTbody');

    try {
        tbody.innerHTML = `<tr>
            <td colspan="5" class="text-center py-3 text-muted">
                <div class="spinner-border spinner-border-sm me-2"></div>Loading...
            </td>
        </tr>`;
        document.getElementById('tableSectionGrade').classList.remove('d-none');

        const resp = await fetch(`/ExamGrade/GetGradePreview?subjectTypeId=${subjectTypeId}&classId=${classId}`);
        const res = await resp.json();

        if (!res.success || !res.data || res.data.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="5" class="text-center py-3 text-muted">No grade rows found for the source.</td></tr>`;
            document.getElementById('btnCopyGrade').disabled = true;
            return;
        }

        tbody.innerHTML = res.data.map((r, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${r.minRange ?? '-'}</td>
                <td>${r.maxRange ?? '-'}</td>
                <td>${r.examGrade ?? '-'}</td>
                <td>${r.gradePointer ?? '-'}</td>
                <td>${r.remark ?? '-'}</td>
            </tr>`).join('');

        document.getElementById('btnCopyGrade').disabled = !allowEnableCopy;
    } catch (err) {
        console.error('loadGradePreview error:', err);
        tbody.innerHTML = `
            <tr><td colspan="5" class="text-center py-3 text-danger">
                <i class="ti ti-alert-circle me-1"></i>Failed to load data.</td></tr>`;
        document.getElementById('btnCopyGrade').disabled = true;
    }
}

// ── The Copy button click. ──────────────────────────────────────────
async function handleCopyExamGrade() {
    const fromSubjectTypeId = document.getElementById('fromSubjectTypeGrade').value;
    const fromClassId = document.getElementById('fromClassGrade').value;
    const toSubjectTypeId = document.getElementById('toSubjectTypeGrade').value;
    const toClassId = document.getElementById('toClassGrade').value;

    if (!fromSubjectTypeId || !fromClassId || !toSubjectTypeId || !toClassId) {
        showToastGrade('Please select both source and destination Subject Type and Class.', 'danger');
        return;
    }
    if (fromSubjectTypeId === toSubjectTypeId && fromClassId === toClassId) {
        showToastGrade('Source and destination cannot be the same.', 'danger');
        return;
    }

    const payload = {
        companyId: window.getCompanyId ? window.getCompanyId() : 0,
        sessionId: window.getSessionId ? window.getSessionId() : 0,
        fromSubjectTypeID: parseInt(fromSubjectTypeId),
        fromClassID: parseInt(fromClassId),
        toSubjectTypeID: parseInt(toSubjectTypeId),
        toClassID: parseInt(toClassId)
    };

    document.getElementById('btnCopyGrade').disabled = true;

    try {
        const res = await fetch('/ExamGrade/CopyExamGrade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById('copyExamGradeModal')).hide();
            showToastGrade(data.message, 'success');
        } else {
            showToastGrade(data.message || 'Copy failed.', 'danger');
            document.getElementById('btnCopyGrade').disabled = false;
        }
    } catch {
        showToastGrade('Network error. Please try again.', 'danger');
        document.getElementById('btnCopyGrade').disabled = false;
    }
}

function showToastGrade(msg, type) {
    if (typeof showToast === 'function') {
        showToast(msg, type);
    } else {
        alert(msg);
    }
}

window.openCopyExamGradeModal = openCopyExamGradeModal;
window.onFromComboChangeGrade = onFromComboChangeGrade;
window.validateCopyExamGrade = validateCopyExamGrade;
window.handleCopyExamGrade = handleCopyExamGrade;