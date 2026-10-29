function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#languagesTable')) {
        const table = $('#languagesTable').DataTable();
        table.button(index).trigger();
    }
}
// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_language';
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
    if (sessionEl) document.getElementById('hdnSessionID').value = sessionEl.value;
    if (companyEl) document.getElementById('hdnCompanyId').value = companyEl.value;
    
    const form = document.getElementById('frmSearch');
    const params = new URLSearchParams(new FormData(form)).toString();

    loadPurposePartial(params);
}

function applyFilters() {
    const searchEl = document.getElementById('txtSearchInput');

    // Search
    const searchVal = searchEl?.value.trim();
    if (searchVal) appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    else delete appliedFilters['txtSearchInput'];

    saveAppliedFilters();
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
    if (filterId === 'txtSearchInput') {
        const el = document.getElementById('txtSearchInput');
        if (el) el.value = '';
        document.getElementById('hdnSearch').value = '';
    }
    delete appliedFilters[filterId];
    saveAppliedFilters();
    renderFilterBadges();          // ← ADD THIS
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

function resetAllFilters() {
    document.getElementById('txtSearchInput').value = '';
    document.getElementById('hdnSearch').value = '';
    clearAppliedFilters();
    renderFilterBadges();          // ← ADD THIS
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}
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

$(document).ready(function () {
    var companyname = localStorage.getItem("comName");
    $('#languagesTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Language  - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6] } },
            { extend: 'csv', title: `Language  - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6] } },
            { extend: 'excel', title: `Language  - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6] } },
            { extend: 'pdf', title: `Language  - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6] } },
            { extend: 'print', title: `Language  - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6] } }
        ],
        searching: false,
        paging: false,
        info: false
    });

});

const permCanAdd = window.canAdd;
const permCanEdit = window.canEdit;
const permCanDelete = window.canDelete;
const IV = window.InlineFormValidation;
const languageFieldMap = {
    txtLanguageTitle: 'errTxtLanguageTitle',
    txtLanguageCode: 'errTxtLanguageCode'
};
const itemModal = new bootstrap.Modal(document.getElementById('itemModal'));
let selectedLanguageId = 0;

function clearLanguageModalValidation() {
    IV.clearMap(languageFieldMap);
    IV.clearNotice('languageModalNotice');
}

IV.bindAutoClear(languageFieldMap);

function selectItem(id, row) {
    IV.clearNotice('classPageNotice');
    window.selectedPurposesId = id;
    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));
    //row.classList.add('bg-light');
    //row.querySelector('input[type="radio"]').checked = true;
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

function openAddModal() {
    if (!permCanAdd) {
        IV.setNotice('languagePageNotice', 'You do not have permission to add.');
        return;
    }
    IV.clearNotice('languagePageNotice');
    clearLanguageModalValidation();
    document.getElementById('modalTitle').textContent = 'Add Language';
    document.getElementById('itemForm').reset();
    document.getElementById('txtItemId').value = "0";
    document.getElementById('chkIsActive').checked = true;
    document.getElementById('chkLanguageBase').checked = false;
    document.getElementById('chkLanguageIsRtl').checked = false;
    itemModal.show();
}

async function editSelected() {
    if (!permCanEdit) {
        IV.setNotice('languagePageNotice', 'You do not have permission to edit.');
        return;
    }
    
    if (window.selectedPurposesId === 0) return;
    IV.clearNotice('classPageNotice');   
    try {

        if (window.selectedPurposesId) {
            location.href = `/Language/Add/${window.selectedPurposesId}`;
        }

    } catch (err) {
        console.error(err);
    }
}

async function deleteSelected() {
    if (!permCanDelete) {
        IV.setNotice('languagePageNotice', 'You do not have permission to delete.');
        return;
    }

    let selectedIds = [];
    $('.student-checkbox:checked').each(function () {
        selectedIds.push(parseInt($(this).val()));
    });
    if (selectedIds.length === 0) {
        alert("Please select at least one student.");
        return;
    }
    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to delete this language record. This action cannot be undone!",
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
                url: '/Language/Delete',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Language record has been deleted.', 'success')
                            .then(() => location.reload());
                    } else {
                        Swal.fire('Error!', res.message || 'Failed to delete language.', 'error');
                    }
                },
                error: function () {
                    Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                }
            });
        }
    });
}

function validateLanguageForm() {
    clearLanguageModalValidation();
    let ok = true;
    const title = document.getElementById('txtLanguageTitle').value.trim();
    const code = document.getElementById('txtLanguageCode').value.trim();
    if (!title) { IV.setFieldError('txtLanguageTitle', 'errTxtLanguageTitle', 'Title is required.'); ok = false; }
    if (!code) { IV.setFieldError('txtLanguageCode', 'errTxtLanguageCode', 'Code is required.'); ok = false; }
    return ok;
}

async function saveItem(event)
{
    event?.preventDefault();
    const lid = parseInt(document.getElementById('txtItemId').value) || 0;
    if (lid === 0 && !permCanAdd) {
        IV.setNotice('languageModalNotice', 'You do not have permission to add.');
        return;
    }
    if (lid > 0 && !permCanEdit) {
        IV.setNotice('languageModalNotice', 'You do not have permission to edit.');
        return;
    }
    if (!validateLanguageForm()) return;

    const title = document.getElementById('txtLanguageTitle').value.trim();
    const code = document.getElementById('txtLanguageCode').value.trim();
    const isEdit = lid > 0;
    const data = {
        languageId: lid,
        languageTitle: title,
        languageCode: code,
        languageIcon: document.getElementById('txtLanguageIcon').value.trim(),
        languageIsRtl: document.getElementById('chkLanguageIsRtl').checked,
        languageBase: document.getElementById('chkLanguageBase').checked,
        isActive: document.getElementById('chkIsActive').checked
    };

    try {
        const resp = await fetch('/Language/Save', {
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
                    ? 'Language has been updated successfully.'
                    : 'Language has been added successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            }).then(() => {
                window.location.href = '/Language/Index';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.message || 'Failed to save language.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-danger' },
                buttonsStyling: false
            });
        }
        
    } catch (err) {
        console.error(err);
        IV.setNotice('languageModalNotice', 'Could not save language.');
    }
}


async function toggleStatus(id, isActive, checkboxEl) {
    if (!permCanEdit) {
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
    function revertAll() {
        checkedBoxes.forEach(cb => { cb.checked = !isActive; });
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
                    url: '/Language/ToggleStatus',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(request),
                    success: function (res) {
                        if (res.success) {
                            Swal.fire('Updated!', res.message || 'Status updated successfully.', 'success')
                                .then(() => location.reload());
                        } else {
                            revertAll();
                            Swal.fire('Error!', res.message || 'Failed to update status.', 'error');
                        }
                    },
                    error: function (xhr) {
                        revertAll();
                        console.error('Status update error:', xhr.status, xhr.responseText);
                        Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                    }
                });
            } else {
                // ✅ Cancel clicked — revert whatever was toggled
                revertAll();
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


//async function toggleStatus(id, isActive) {
//    if (!permCanEdit) {
//        IV.setNotice('languagePageNotice', 'You do not have permission to change status.');
//        location.reload();
//        return;
//    }
//    IV.clearNotice('languagePageNotice');
//    try {
//        const resp = await fetch(`/Language/ToggleStatus?id=${id}&isActive=${isActive}`, { method: 'POST' });
//        const res = await resp.json();
//        if (res.success) {
//        } else {
//            IV.setNotice('languagePageNotice', res.message || 'Could not update status.');
//            location.reload();
//        }
//    } catch (err) {
//        console.error(err);
//        IV.setNotice('languagePageNotice', 'Could not update status.');
//        location.reload();
//    }
//}



let exportTable;
$(document).ready(function () {
    if ($.fn.DataTable.isDataTable('#languagesTable')) {
        $('#languagesTable').DataTable().destroy();
    }
    exportTable = $('#languagesTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', exportOptions: { columns: [1, 2, 3, 4, 5, 7], rows: ':visible' } },
            { extend: 'csv', exportOptions: { columns: [1, 2, 3, 4, 5, 7], rows: ':visible' } },
            { extend: 'excel', exportOptions: { columns: [1, 2, 3, 4, 5, 7], rows: ':visible' } },
            { extend: 'pdf', exportOptions: { columns: [1, 2, 3, 4, 5, 7], rows: ':visible' } },
            { extend: 'print', exportOptions: { columns: [1, 2, 3, 4, 5, 7], rows: ':visible' } }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false
    });
});



// ========================================
// Partial reload — used by submitForm() for filter/search/pagination
// ========================================
function loadPurposePartial(queryString) {
    const container = document.getElementById('languageTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/Language/GetLanguagePartial?${queryString}`, {
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
            updateButtonStates();
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.toast) window.toast.error('Could not refresh the list.');
        });
}

// ✅ Pagination click interception, scoped to the hostel type container
document.addEventListener('click', function (e) {
    const link = e.target.closest('#languageTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('PageIndex') || 1;
    loadPurposePartial(query);
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