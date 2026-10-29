// ========================================================================
// PromoteStudents.js
// ========================================================================

// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_demotionStudents';
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

// Rebuilds a single appliedFilters entry from the current state of a control.
// Called on Apply, and (search only) live while typing.
function syncFilterFromControl(id) {
    const el = document.getElementById(id);
    if (!el) return;

    const val = el.value?.trim();
    const labels = {
        ddlFilterSessions: 'Session',
        ddlFilterCompany: 'Company',
        FilterClassID: 'Class',
        FilterSectionID: 'Section',
        txtSearchInput: 'Search'
    };

    if (val) {
        const text = id === 'txtSearchInput'
            ? val
            : (el.options[el.selectedIndex]?.text || val);
        appliedFilters[id] = { label: labels[id], text };
    } else {
        delete appliedFilters[id];
    }
}

function applyFilters() {
    ['txtSearchInput', 'ddlFilterSessions', 'ddlFilterCompany', 'FilterClassID', 'FilterSectionID']
        .forEach(syncFilterFromControl);
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
    const el = document.getElementById(filterId);
    if (el) {
        el.value = '';
        if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
    }
    if (filterId === 'FilterClassID') {
        $('#FilterSectionID').html('<option value="">Select</option>');
        if (window.jQuery && jQuery('#FilterSectionID').data('select2')) {
            jQuery('#FilterSectionID').val('').trigger('change');
        }
    }

    delete appliedFilters[filterId];
    saveAppliedFilters();
    renderFilterBadges();

    document.getElementById('hdnPageIndex').value = 1;
    loadStudents();
}

function resetAllFilters() {
    document.getElementById('txtSearchInput').value = '';

    ['ddlFilterSessions', 'ddlFilterCompany', 'FilterSectionID', 'FilterClassID'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = '';
        if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
    });

    clearFieldErrors();
    clearAppliedFilters();
    renderFilterBadges();

    document.getElementById('hdnPageIndex').value = 1;
    loadStudents();
}

// ========================================
// AJAX table load — fetch-based (matches GetSubjectPartial pattern)
// ========================================
function buildQueryString() {
    const params = new URLSearchParams({
        pageIndex: document.getElementById('hdnPageIndex')?.value || 1,
        pageSize: document.getElementById('hdnPageSize')?.value || '',
        search: document.getElementById('txtSearchInput')?.value || '',
        sessionID: document.getElementById('ddlFilterSessions')?.value || '',
        companyId: document.getElementById('ddlFilterCompany')?.value || '',
        classId: document.getElementById('FilterClassID')?.value || '',
        sectionId: document.getElementById('FilterSectionID')?.value || ''
    });

    // Strip empty params so int?/string? model binding gets null, not "".
    [...params.keys()].forEach(k => {
        if (!params.get(k)) params.delete(k);
    });

    return params.toString();
}

function loadStudents() {
    const container = document.getElementById('studentsTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/Academics/GetDemotionStudentsPartial?${buildQueryString()}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to load students');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            container.style.opacity = '1';
            rebuildDataTable();
            selectAllStudentsByDefault();
            updatePromoteButton();
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.toast) window.toast.error('Could not refresh the list.');
            else console.warn('Could not refresh the list.');
        });
}

// After any filtered load, default every row (and the header checkbox) to checked
function selectAllStudentsByDefault() {
    const $rows = $('.student-checkbox');
    if ($rows.length === 0) {
        $('#selectAll').prop('checked', false);
        return;
    }
    $rows.prop('checked', true);
    $('#selectAll').prop('checked', true);
}

function rebuildDataTable() {
    if ($.fn.DataTable.isDataTable('#studentsTable')) {
        $('#studentsTable').DataTable().destroy();
    }

    const exportOpts = {
        columns: [1, 2, 3, 4, 5, 6],
        format: {
            body: function (data, row, column, node) {
                const checkedRadio = node.querySelector('input[type="radio"]:checked');
                if (checkedRadio) return checkedRadio.value;
                return data.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
            }
        }
    };

    if ($('#studentsTable tbody tr.student-row').length > 0) {
        window.exportTable = $('#studentsTable').DataTable({
            dom: 'Bfrtip',
            buttons: [
                { extend: 'copy', exportOptions: exportOpts },
                { extend: 'csv', exportOptions: exportOpts },
                { extend: 'excel', exportOptions: exportOpts },
                { extend: 'pdf', exportOptions: exportOpts },
                { extend: 'print', exportOptions: exportOpts }
            ],
            searching: false,
            paging: false,
            info: false,
            ordering: false
        });
    }
}

function triggerExport(index) {
    if ($('#studentsTable tbody tr.student-row').length === 0) {
        if (window.Swal) {
            Swal.fire({
                icon: 'warning',
                title: 'No Data',
                text: 'Please apply filters first to load students.',
                confirmButtonColor: '#3085d6'
            });
        } else {
            alert('Please apply filters first to load students.');
        }
        return;
    }
    if ($.fn.DataTable.isDataTable('#studentsTable')) {
        $('#studentsTable').DataTable().button(index).trigger();
    }
}

// ========================================
// Search input — live badge + debounced AJAX
// ========================================
let searchTimer = null;

function bindSearchInput() {
    document.getElementById('txtSearchInput')?.addEventListener('input', function () {
        // live badge update as the user types
        syncFilterFromControl('txtSearchInput');
        saveAppliedFilters();
        renderFilterBadges();

        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            document.getElementById('hdnPageIndex').value = 1;
            loadStudents();
        }, 500);
    });
}

// ========================================
// Class → Section cascade
// ========================================
function loadSections(classId, targetSelector, selectedId = null) {
    if (!classId) {
        $(targetSelector).html('<option value="">Select</option>');
        return;
    }
    $.get('/Academics/GetSectionsByClass/' + classId, function (res) {
        if (res.success) {
            let html = '<option value="">Select</option>';
            res.data.forEach(s => {
                html += `<option value="${s.sectionID}" ${s.sectionID == selectedId ? 'selected' : ''}>${s.sectionName}</option>`;
            });
            $(targetSelector).html(html);
            if (window.jQuery && jQuery(targetSelector).data('select2')) {
                jQuery(targetSelector).trigger('change');
            }
        }
    });
}

function onFilterClassChange() {
    // changing class invalidates the previously selected section
    delete appliedFilters['FilterSectionID'];
    saveAppliedFilters();
    setFieldError('FilterClassID', 'errFilterClassID', false);
    loadSections($('#FilterClassID').val(), '#FilterSectionID');
}

// ========================================
// Row selection
// ========================================
function selectItem(id, row) {
    updatePromoteButton();
}

function updatePromoteButton() {
    const checkedCount = $('.student-checkbox:checked').length;
    $('#btnSave').prop('disabled', checkedCount === 0);
}

// ========================================
// Promotion save
// ========================================
async function confirmDemotion() {
    const studentIds = [];
    let targetClassId = null;
    let targetSessionId = null;
    let mismatch = false;

    $('.student-checkbox:checked').each(function () {
        const row = $(this).closest('tr');
        const studentId = row.data('id');
        const rowClassId = parseInt(row.find('.DemoteClassID').val());
        const rowSessionId = parseInt(row.find('.DemoteSessionID').val());

        if (targetClassId === null) targetClassId = rowClassId;
        if (targetSessionId === null) targetSessionId = rowSessionId;

        // flag if a selected row doesn't share the same target as the first one
        if (rowClassId !== targetClassId || rowSessionId !== targetSessionId) {
            mismatch = true;
        }

        studentIds.push(parseInt(studentId));
    });

    if (studentIds.length === 0) {
        if (window.Swal) {
            Swal.fire({
                icon: 'warning',
                title: 'No Data',
                text: 'Please select at least one student.',
                confirmButtonColor: '#3085d6'
            });
        } else {
            alert('Please select at least one student.');
        }
        return;
    }

    if (!targetClassId || !targetSessionId) {
        if (window.Swal) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Selected students have no demotion class/session mapped.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-danger' },
                buttonsStyling: false
            });
        } else {
            alert('Selected students have no demotion class/session mapped.');
        }
        return;
    }

    if (mismatch) {
        if (window.Swal) {
            Swal.fire({
                icon: 'warning',
                title: 'Mixed Targets',
                text: 'Selected students demote to different classes/sessions. Please select students with the same target class and session only.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-danger' },
                buttonsStyling: false
            });
        } else {
            alert('Selected students demote to different classes/sessions. Please select students with the same target class and session only.');
        }
        return;
    }

    const targetSectionId = parseInt($('#FilterSectionID').val()) || 0;
    const deactivateCurrent = $('#chkDeactivateCurrent').length
        ? $('#chkDeactivateCurrent').is(':checked')
        : true;

    const data = {
        StudentIDs: studentIds,
        TargetSessionID: targetSessionId,
        TargetClassID: targetClassId,
        TargetSectionID: targetSectionId,
        DeactivateCurrent: deactivateCurrent
    };

    try {
        const r = await fetch('/Academics/SaveDemoteStudents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const res = await r.json();

        if (res.success) {
            if (window.Swal) {
                Swal.fire({
                    icon: 'success',
                    title: 'Saved!',
                    text: res.message || 'Students demoted successfully.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-success' },
                    buttonsStyling: false
                }).then(() => loadStudents());
            } else {
                alert(res.message || 'Students demoted successfully.');
                loadStudents();
            }
        } else {
            if (window.Swal) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: res.message || 'Failed to save demotion.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-danger' },
                    buttonsStyling: false
                });
            } else {
                alert(res.message || 'Failed to save demotion.');
            }
        }
    } catch (err) {
        console.error(err);
        if (window.Swal) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Could not save demotion.' });
        } else {
            alert('Could not save demotion.');
        }
    }
}
// ========================================
// Init
// ========================================
$(document).ready(function () {
    $.fn.dataTable.ext.errMode = 'none';

    updatePromoteButton();
    rebuildDataTable();
    selectAllStudentsByDefault();
    renderFilterBadges();
    bindSearchInput();

    // ── Select2 ───────────────────────────────────────────────────────
    try {
        if (window.jQuery && typeof jQuery.fn.select2 === 'function') {
            jQuery('#ddlFilterSessions, #ddlFilterCompany, #FilterSectionID, #FilterClassID').select2({
                width: '100%',
                dropdownParent: jQuery('#filter-dropdown'),
                allowClear: true,
                placeholder: function () { return jQuery(this).data('placeholder') || 'Select'; }
            });
        }
    } catch (e) {
        console.warn('Select2 init skipped:', e);
    }

    document.getElementById('filter-dropdown')?.addEventListener('click', e => e.stopPropagation());
    $(document).on('change', '#FilterSectionID', function () {
        if ($(this).val()) setFieldError('FilterSectionID', 'errFilterSectionID', false);
    });
    document.getElementById('btnApplyFilters')?.addEventListener('click', function (e) {
        e.preventDefault();

        if (!validateFilters()) {
            return; // stop here — red border + message already shown
        }

        applyFilters();
        document.getElementById('hdnPageIndex').value = 1;
        loadStudents();
    });

    document.getElementById('btnResetFilters')?.addEventListener('click', function (e) {
        e.preventDefault();
        resetAllFilters();
    });

    document.getElementById('btnResetAllFilters')?.addEventListener('click', function (e) {
        e.preventDefault();
        resetAllFilters();
    });

    $(document).on('change', '#selectAll', function () {
        $('.student-checkbox').prop('checked', $(this).is(':checked'));
        updatePromoteButton();
    });

    $(document).on('change', '.student-checkbox', function () {
        updatePromoteButton();

        // keep header checkbox in sync when rows are toggled individually
        const total = $('.student-checkbox').length;
        const checked = $('.student-checkbox:checked').length;
        $('#selectAll').prop('checked', total > 0 && total === checked);
    });
});
// ========================================
// Filter validation (Class & Section required)
// ========================================
function setFieldError(fieldId, errId, hasError) {
    const el = document.getElementById(fieldId);
    const err = document.getElementById(errId);
    if (!el || !err) return;

    el.classList.toggle('is-invalid-field', hasError);
    err.classList.toggle('d-none', !hasError);
    err.classList.toggle('d-block', hasError);
}
function validateFilters() {
    const classVal = $('#FilterClassID').val();
    const sectionVal = $('#FilterSectionID').val();

    const classValid = !!classVal;
    const sectionValid = !!sectionVal;

    setFieldError('FilterClassID', 'errFilterClassID', !classValid);
    setFieldError('FilterSectionID', 'errFilterSectionID', !sectionValid);

    return classValid && sectionValid;
}
function clearFieldErrors() {
    setFieldError('FilterClassID', 'errFilterClassID', false);
    setFieldError('FilterSectionID', 'errFilterSectionID', false);
}