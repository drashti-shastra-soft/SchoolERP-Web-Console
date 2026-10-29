let selectedId = 0;
window.selectedId = 0;
const canEdit = window.canEdit;
const canDelete = window.canDelete;

// Letters-only fields
$('#txtName, #txtNote').on('input', function () {
    this.value = this.value.replace(/[^a-zA-Z\s]/g, '');
});

// ID Card field — allow letters + digits only (e.g. "ID123456"),
// no spaces/symbols, and cap length so it can't grow unbounded.
const ID_CARD_MAX_LENGTH = 20; // adjust to match your DB column size

$('#txtIDCard').on('input', function () {
    let val = this.value.replace(/[^a-zA-Z0-9]/g, ''); // strip anything not a letter or digit
    if (val.length > ID_CARD_MAX_LENGTH) {
        val = val.substring(0, ID_CARD_MAX_LENGTH);
    }
    this.value = val;
});


$('#txtPhone').on('input', function () {
    this.value = this.value.replace(/[^0-9]/g, '').substring(0, 10);
});


const phoneMaskOptions = {
    translation: { '0': { pattern: /[0-9]/ } },
    onKeyPress: function (val, e, field) {
        if (!val.startsWith('+91')) {
            field.val('+91 ' + val.replace(/[^\d]/g, '').substring(0, 10).replace(/(\d{5})(\d{0,5})/, '$1 $2'));
        }
    }
}

$('#txtPhone').mask('+91 00000 00000', phoneMaskOptions);
// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_visitorBook';
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
    const sectionEl = document.getElementById('ddlStaff');
    const purposeEl = document.getElementById('filterPurpose');
    if (sessionEl) document.getElementById('hdnSessionID').value = sessionEl.value;
    if (companyEl) document.getElementById('hdnCompanyId').value = companyEl.value;
    if (sectionEl) document.getElementById('hdnStaffId').value = sectionEl.value;
    if (purposeEl) document.getElementById('hdnpurpose').value = purposeEl.value;

    const form = document.getElementById('frmSearch');
    const params = new URLSearchParams(new FormData(form)).toString();

    loadVisitorBookPartial(params);
}

function applyFilters() {
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
    const sectionEl = document.getElementById('ddlStaff');
    const purposeEl = document.getElementById('filterPurpose');
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

    // Staff
    if (sectionEl?.value && sectionEl.value !== '') {
        appliedFilters['ddlStaff'] = {
            label: 'Staff',
            text: sectionEl.options[sectionEl.selectedIndex]?.text || sectionEl.value
        };
    } else delete appliedFilters['ddlStaff'];

    // Purposes
    if (purposeEl?.value && purposeEl.value !== '') {
        appliedFilters['filterPurpose'] = {
            label: 'Purposes',
            text: purposeEl.options[purposeEl.selectedIndex]?.text || purposeEl.value
        };
    } else delete appliedFilters['filterPurpose'];

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
    } else if (filterId === 'ddlStaff') {
        const el = document.getElementById('ddlStaff');
        if (el) {
            el.value = '';
            if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
        }
    }
    else if (filterId === 'filterPurpose') {
        const el = document.getElementById('filterPurpose');
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

    ['ddlFilterSessions', 'ddlFilterCompany', 'ddlStaff', 'filterPurpose'].forEach(id => {
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
    var companyname = localStorage.getItem("comName");
    // ── DataTable (export only) ───────────────────────────────────────
    if ($.fn.DataTable.isDataTable('#tblVisitors')) {
        $('#tblVisitors').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#tblVisitors').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Visitor Book  - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'csv', title: `Visitor Book  - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'excel', title: `Visitor Book  - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'pdf', title: `Visitor Book  - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'print', title: `Visitor Book  - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false
    });

    // ── Select2 ───────────────────────────────────────────────────────
    try {
        if (window.jQuery && typeof jQuery.fn.select2 === 'function') {
            jQuery('#ddlFilterSessions, #ddlFilterCompany', '#ddlStaff', '#filterPurpose').select2({
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
        renderFilterBadges();
        submitForm();
    });

    // ── Reset Filters ─────────────────────────────────────────────────
    document.getElementById('btnResetFilters')?.addEventListener('click', () => {
        document.getElementById('txtSearchInput').value = '';
        document.getElementById('hdnSearch').value = '';
        ['ddlFilterSessions', 'ddlFilterCompany', 'ddlStaff', 'filterPurpose'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.value = '';
            if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
        });
        clearAppliedFilters();
        renderFilterBadges();
        document.getElementById('hdnPageIndex').value = 1;
        submitForm();
    });

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

        // ── Sync search into appliedFilters before submit ─────────────
        const val = this.value.trim();
        if (val) appliedFilters['txtSearchInput'] = { label: 'Search', text: val };
        else delete appliedFilters['txtSearchInput'];
        saveAppliedFilters(); // ← persist before submit
        renderFilterBadges();
        submitForm();
    }, 500);
});



function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#tblVisitors')) {
        const table = $('#tblVisitors').DataTable();
        table.button(index).trigger();
    }
}

$(document).ready(function () {
    // Initialize Select2 for page filters
    $('.select2:not(#visitorModal .select2)').select2({
        width: '100%'
    });

    // Initialize Select2 for modal with dropdownParent
    $('#visitorModal').on('shown.bs.modal', function () {
        $('#visitorModal .select2').select2({
            dropdownParent: $('#visitorModal'),
            width: '100%'
        });
    });

    // Clear validation errors on change/input
    const clearError = (id, errId) => {
        const el = document.getElementById(id);
        if (el && el.value.trim()) {
            el.classList.remove('is-invalid');
            document.getElementById(errId).style.display = 'none';
        }
    };

    $('#ddlPurpose, #ddlMeetingWith, #ddlStudent, #ddlStaff').on('change', function () {
        clearError(this.id, 'err' + this.id.replace('ddl', ''));
    });

    $('#txtDate').on('change', function () {
        clearError('txtDate', 'errDate');
    });

    $('#txtName').on('keyup', function () {
        clearError('txtName', 'errName');
    });

    // ── Phone — live validation as the user types ─────────────────
    $('#txtPhone').on('input', function () {
        const val = this.value.trim();
        const errEl = document.getElementById('errPhone');
        if (!val || /^[6-9]\d{9}$/.test(val)) {
            this.classList.remove('is-invalid');
            if (errEl) errEl.style.display = 'none';
        }
    });

    initEditForm();
});

function handleMeetingWith(val) {
    document.getElementById('studentSelection').classList.toggle('d-none', val !== 'Student');
    document.getElementById('staffSelection').classList.toggle('d-none', val !== 'Staff');

    if (val === 'Student') {
        document.getElementById('ddlStudent').setAttribute('required', 'required');
        document.getElementById('ddlStaff').removeAttribute('required');
    } else if (val === 'Staff') {
        document.getElementById('ddlStaff').setAttribute('required', 'required');
        document.getElementById('ddlStudent').removeAttribute('required');
    } else {
        document.getElementById('ddlStudent').removeAttribute('required');
        document.getElementById('ddlStaff').removeAttribute('required');
    }
}

// FIX: now returns the fetch promise so callers (initEditForm) can await
// the sections actually being populated before trying to select one.
function loadSections(classId) {
    const ddl = $('#ddlSection');
    ddl.empty().append('<option value="">Select Section</option>');
    $('#ddlStudent').empty().append('<option value="">Select Student</option>');

    if (!classId) return Promise.resolve();

    return fetch(`/FrontOffice/GetSections?classId=${classId}`)
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                res.data.forEach(s => ddl.append(`<option value="${s.sectionID}">${s.sectionName}</option>`));
            }
        })
        .catch(err => console.error('loadSections failed:', err));
}

// FIX: now returns the fetch promise so callers (initEditForm) can await
// the students actually being populated before trying to select one.
function loadStudents() {
    const classId = document.getElementById('ddlClass').value;
    const sectionId = document.getElementById('ddlSection').value;
    const ddl = $('#ddlStudent');
    ddl.empty().append('<option value="">Select Student</option>');

    if (!classId || !sectionId) return Promise.resolve();

    return fetch(`/FrontOffice/GetStudents?classId=${classId}&sectionId=${sectionId}`)
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                res.data.forEach(s => ddl.append(`<option value="${s.studentID}">${s.fullName} (${s.rollNo})</option>`));
            }
        })
        .catch(err => console.error('loadStudents failed:', err));
}

function selectItem(id, row) {
    window.selectedId = id;
    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));
    row.classList.add('bg-light');

    if (canEdit) document.getElementById('btnEdit').disabled = false;
    if (canDelete) document.getElementById('btnDelete').disabled = false;
    let checkedCount = $('.student-checkbox:checked').length;
    $('#btnDelete').prop('disabled', checkedCount === 0);
    $('#btnEdit').prop('disabled', checkedCount !== 1);
    $('#btnActive').prop('disabled', checkedCount === 0);
    $('#btnInactive').prop('disabled', checkedCount === 0);
}

function openAddModal() {
    document.getElementById('modalTitle').textContent = 'Add Visitor';
    document.getElementById('hdnVisitorBookID').value = 0;
    document.getElementById('visitorForm').reset();
    document.getElementById('txtDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('chkActive').checked = true;
    document.getElementById('fileInfo').textContent = '';

    $('#ddlMeetingWith').val('').trigger('change');
    handleMeetingWith('');

    $('#ddlPurpose, #ddlClass, #ddlSection, #ddlStudent, #ddlStaff').val('').trigger('change');

    new bootstrap.Modal(document.getElementById('visitorModal')).show();
}

async function editSelected() {
    if (!window.selectedId) return;
    try {
        if (window.selectedId) {
            location.href = `/FrontOffice/AddVisitorBook/${window.selectedId}`;
        }
    } catch (err) {
        console.error(err);
    }
}

// ========================================
// Visitor form — field-level validation helper
// ========================================
function validateVisitorForm() {
    let isValid = true;

    const validateField = (id, errId) => {
        const el = document.getElementById(id);
        const errEl = document.getElementById(errId);
        if (!el || !el.value.trim()) {
            if (el) el.classList.add('is-invalid');
            if (errEl) errEl.style.display = 'block';
            isValid = false;
        } else {
            el.classList.remove('is-invalid');
            if (errEl) errEl.style.display = 'none';
        }
    };

    validateField('ddlPurpose', 'errPurpose');
    validateField('ddlMeetingWith', 'errMeetingWith');
    validateField('txtName', 'errName');
    validateField('txtDate', 'errDate');

    const mw = document.getElementById('ddlMeetingWith').value;
    if (mw === 'Student') validateField('ddlStudent', 'errStudent');
    if (mw === 'Staff') validateField('ddlStaff', 'errStaff');

    const phoneEl = document.getElementById('txtPhone');
    const phoneVal = phoneEl?.value.trim() || '';
    const errPhoneEl = document.getElementById('errPhone');
    if (phoneVal && !/^[6-9]\d{9}$/.test(phoneVal)) {
        phoneEl.classList.add('is-invalid');
        if (errPhoneEl) {
            errPhoneEl.textContent = 'Enter a valid 10-digit phone number.';
            errPhoneEl.style.display = 'block';
        }
        isValid = false;
    } else {
        phoneEl?.classList.remove('is-invalid');
        if (errPhoneEl) errPhoneEl.style.display = 'none';
    }

    const dateEl = document.getElementById('txtDate');
    const dateVal = dateEl?.value;
    if (dateVal) {
        const selectedDate = new Date(dateVal);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (selectedDate > today) {
            dateEl.classList.add('is-invalid');
            const errDateEl = document.getElementById('errDate');
            if (errDateEl) {
                errDateEl.textContent = 'Date cannot be in the future.';
                errDateEl.style.display = 'block';
            }
            isValid = false;
        }
    }

    return isValid;
}

async function saveVisitor(e) {
    if (e) e.preventDefault();
    const form = document.getElementById('visitorForm');

    if (!validateVisitorForm()) {
        const firstInvalid = form.querySelector('.is-invalid');
        if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }
    var id = parseInt(document.getElementById('hdnVisitorBookID').value) || 0;
    const isEdit = id > 0;
    const formData = new FormData(form);

    fetch('/FrontOffice/SaveVisitor', {
        method: 'POST',
        body: formData
    })
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Saved!',
                    text: isEdit
                        ? 'Visitor has been Updated Successfully.'
                        : 'Visitor has been Added Successfully.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-success' },
                    buttonsStyling: false
                }).then(() => {
                    window.location.href = '/FrontOffice/VisitorBook';
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: res.message || 'Failed to save visitor.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-danger' },
                    buttonsStyling: false
                });
            }
        })
        .catch(() => {
            Swal.fire('Error!', 'An unexpected error occurred while saving.', 'error');
        });
}

function deleteSelected() {
    if (!selectedId) return;

    let selectedIds = [];
    $('.student-checkbox:checked').each(function () {
        selectedIds.push(parseInt($(this).val()));
    });
    if (selectedIds.length === 0) {
        alert("Please select at least one Visitor.");
        return;
    }
    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to delete this visitor record. This action cannot be undone!",
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
                url: '/FrontOffice/DeleteVisitor',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Visitor record has been deleted.', 'success')
                            .then(() => location.reload());
                    } else {
                        Swal.fire('Error!', res.message || 'Failed to delete visitor.', 'error');
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
    if (!canEdit) {
        IV.setNotice('classPageNotice', 'You do not have permission to change status.');
        if (checkboxEl) checkboxEl.checked = !isActive;
        location.reload();
        return;
    }

    // ✅ collect both ids AND the actual checkbox elements
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

    const request = {
        ids: sectionIds.join(','),
        isActive: isActive
    };

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
                    url: '/FrontOffice/ToggleVisitorStatus',
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


function showToast(msg, type = 'success') {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<div class="toast align-items-center text-bg-${type} border-0 show position-fixed bottom-0 end-0 m-3" role="alert" style="z-index:9999">
            <div class="d-flex"><div class="toast-body">${msg}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div></div>`;
    document.body.appendChild(wrapper);
    setTimeout(() => wrapper.remove(), 3000);
}

// FIX: initEditForm is now async and:
//   1) reads PascalCase properties (StudentID, ClassID, SectionID, StaffID)
//      to match the server's JsonSerializer.Serialize(Model.EditVisitors)
//      output, which does not lower-case the first letter.
//   2) awaits loadSections()/loadStudents() before selecting a value,
//      since those dropdowns are populated asynchronously via fetch and
//      previously had no options yet when .val(...) ran.
async function initEditForm() {
    const d = window.editVisitor;
    if (!d) return;

    document.getElementById('hdnVisitorBookID').value = d.VisitorBookID;

    const mw = (d.MeetingWith === 'Student' || d.MeetingWith === 'Staff') ? d.MeetingWith : '';

    // Show/hide the correct section immediately.
    $('#ddlMeetingWith').val(mw).trigger('change');
    handleMeetingWith(mw);

    if (mw === 'Student' && d.StudentID) {
        // Class options are rendered server-side already, so this select works immediately.
        $('#ddlClass').val(d.ClassID).trigger('change');

        // Wait for the section list to be populated before selecting the saved section.
        await loadSections(d.ClassID);
        $('#ddlSection').val(d.SectionID).trigger('change');

        // Wait for the student list to be populated before selecting the saved student.
        await loadStudents();
        $('#ddlStudent').val(d.StudentID).trigger('change');

    } else if (mw === 'Staff' && d.StaffID) {
        $('#ddlStaff').val(d.StaffID).trigger('change');
    }
}

function removeExistingFile() {
    document.getElementById('existingFileInfo')?.remove();
    document.getElementById('hdnRemoveFile').value = 'true';
    document.getElementById('hdnExistingFile').value = '';
}

const maxFileSizeMB = 1;
const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;

document.getElementById('attachmentFile')?.addEventListener('change', function () {
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
// Partial reload — used by submitForm() for filter/search/pagination
// ========================================
function loadVisitorBookPartial(queryString) {
    const container = document.getElementById('visitorBookTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/FrontOffice/GetVisitorBookPartial?${queryString}`, {
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

            // ✅ Re-bind attachment modal — innerHTML replacement above
            // destroyed the previous #modalDispatchAttachment node.
            bindDispatchAttachmentModal();

            if ($.fn.DataTable.isDataTable('#tblVisitors')) {
                $('#tblVisitors').DataTable().destroy();
            }
            exportTable = $('#tblVisitors').DataTable({
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

            updateButtonStates();
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.toast) window.toast.error('Could not refresh the list.');
        });
}

// ✅ Pagination click interception, scoped to the visitor book container
document.addEventListener('click', function (e) {
    const link = e.target.closest('#visitorBookTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('PageIndex') || 1;
    loadVisitorBookPartial(query);
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

// ========================================
// Attachment Preview Modal — reusable binder
// (Must be re-run after every innerHTML replacement of the table
// container, since that destroys and recreates #modalDispatchAttachment
// along with its dataset.bound flag.)
// ========================================
function bindDispatchAttachmentModal() {
    var modalEl = document.getElementById('modalDispatchAttachment');
    if (!modalEl) {
        console.warn('bindDispatchAttachmentModal: #modalDispatchAttachment not found in DOM yet.');
        return;
    }
    if (modalEl.dataset.bound === '1') return; // already wired for this DOM node
    modalEl.dataset.bound = '1';

    var modalAttachment = new bootstrap.Modal(modalEl);
    var img = document.getElementById('imgDispatchAttachment');
    var frame = document.getElementById('frmDispatchAttachment');
    var unsupported = document.getElementById('dispatchAttachmentUnsupported');
    var btnDownload = document.getElementById('btnDownloadDispatchAttachment');
    var btnDownloadLabel = document.getElementById('btnDownloadDispatchAttachmentLabel');

    var currentUrl = '';
    var currentFileName = '';

    var IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'];
    var PDF_EXTS = ['pdf'];

    function getExtension(name) {
        var parts = (name || '').split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    }

    function resetPreview() {
        img.style.display = 'none';
        img.src = '';
        frame.style.display = 'none';
        frame.src = '';
        unsupported.classList.add('d-none');
        unsupported.classList.remove('d-flex');
    }

    // Reset the preview each time the popup closes so the previous
    // file doesn't briefly flash before the next one loads.
    modalEl.addEventListener('hidden.bs.modal', resetPreview);

    window.viewDispatchAttachment = function (id, title, fileName, attachmentPath) {
        currentUrl = attachmentPath;
        currentFileName = fileName || 'attachment';

        // Re-query the title element fresh each call in case the modal
        // DOM node was swapped out since bindDispatchAttachmentModal ran.
        var titleEl = document.getElementById('modalDispatchAttachmentTitle');
        if (titleEl) titleEl.textContent = title || 'Attachment';
        resetPreview();

        var ext = getExtension(fileName);

        if (IMAGE_EXTS.indexOf(ext) !== -1) {
            img.onload = function () { img.style.display = 'block'; };
            img.onerror = function () {
                unsupported.classList.remove('d-none');
                unsupported.classList.add('d-flex');
            };
            img.src = attachmentPath;
        } else if (PDF_EXTS.indexOf(ext) !== -1) {
            frame.onload = function () { frame.style.display = 'block'; };
            frame.src = attachmentPath;
        } else {
            unsupported.classList.remove('d-none');
            unsupported.classList.add('d-flex');
        }

        modalAttachment.show();
    };

    // ── Download button: fetches the file as a blob and saves it
    // locally instead of navigating the browser away from the popup.
    btnDownload.addEventListener('click', function () {
        if (!currentUrl) return;

        btnDownload.disabled = true;
        btnDownloadLabel.textContent = 'Downloading...';

        fetch(currentUrl)
            .then(function (res) {
                if (!res.ok) throw new Error('Download failed');
                return res.blob();
            })
            .then(function (blob) {
                var blobUrl = window.URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = blobUrl;
                a.download = currentFileName;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(blobUrl);
            })
            .catch(function (err) {
                console.error(err);
                if (window.Swal) {
                    Swal.fire('Error!', 'Could not download the attachment.', 'error');
                } else {
                    alert('Could not download the attachment.');
                }
            })
            .finally(function () {
                btnDownload.disabled = false;
                btnDownloadLabel.textContent = 'Download';
            });
    });
}

// Bind on first page load (DOM already contains the server-rendered partial)
document.addEventListener('DOMContentLoaded', bindDispatchAttachmentModal);