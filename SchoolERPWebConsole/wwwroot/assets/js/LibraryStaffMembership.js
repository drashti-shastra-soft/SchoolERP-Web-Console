// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_staffMameber';
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
    const companyEl = document.getElementById('ddlFilterCompany');
    const deptEl = document.getElementById('fDept');
    if (companyEl) document.getElementById('hdnCompanyId').value = companyEl.value;
    if (deptEl) document.getElementById('hdnDepartmentID').value = deptEl.value;
    //document.getElementById('frmSearch').submit();
    const form = document.getElementById('frmSearch');
    const params = new URLSearchParams(new FormData(form)).toString();

    loadStaffPartial(params);
}

function applyFilters() {
    const companyEl = document.getElementById('ddlFilterCompany');
    const deptEl = document.getElementById('fDept');
    const searchEl = document.getElementById('txtSearchInput');

    // Search
    const searchVal = searchEl?.value.trim();
    if (searchVal) appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    else delete appliedFilters['txtSearchInput'];

    // Company
    if (companyEl?.value && companyEl.value !== '') {
        appliedFilters['ddlFilterCompany'] = {
            label: 'Company',
            text: companyEl.options[companyEl.selectedIndex]?.text || companyEl.value
        };
    } else delete appliedFilters['ddlFilterCompany'];

    // Department
    if (deptEl?.value && deptEl.value !== '') {
        appliedFilters['fDept'] = {
            label: 'Department',
            text: deptEl.options[deptEl.selectedIndex]?.text || deptEl.value
        };
    } else delete appliedFilters['fDept'];

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
    if (filterId === 'ddlFilterCompany') {
        const el = document.getElementById('ddlFilterCompany');
        if (el) {
            el.value = '';
            if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
        }
    } else if (filterId === 'txtSearchInput') {
        const el = document.getElementById('txtSearchInput');
        if (el) el.value = '';
        document.getElementById('hdnSearch').value = '';
    } else if (filterId === 'fDept') {
        const el = document.getElementById('fDept');
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

    ['ddlFilterCompany', 'fDept'].forEach(id => {
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
// DOMContentLoaded — init select2 + top-bar handlers
// ========================================
document.addEventListener('DOMContentLoaded', () => {

    try {
        if (window.jQuery && typeof jQuery.fn.select2 === 'function') {
            ['#ddlFilterCompany', '#fDept'].forEach(sel => {
                jQuery(sel).select2({
                    width: '100%',
                    allowClear: true,
                    placeholder: function () { return jQuery(this).data('placeholder') || 'Select'; }
                });
            });
        }
    } catch (e) {
        console.warn('Select2 init skipped:', e);
    }

    document.getElementById('btnApplyFilters')?.addEventListener('click', () => {
        document.getElementById('hdnPageIndex').value = 1;
        document.getElementById('hdnSearch').value = document.getElementById('txtSearchInput').value;
        applyFilters();
        renderFilterBadges();
        submitForm();
    });

    
    updateSelectedCount();
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

        submitForm();
    }, 500);
});

function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#tblMembers')) {
        const table = $('#tblMembers').DataTable();
        table.button(index).trigger();
    }
}

let memberTable;
$(document).ready(function () {
    var companyname = localStorage.getItem("comName");
    memberTable = $('#tblMembers').DataTable({
        destroy: true,
        dom: 'Bfrtip',
        buttons: [
            {
                extend: 'copy',
                title: `Library Staff Membership - ${companyname}`,
                exportOptions: {
                    columns: [1, 2, 3, 4, 5, 6, 9],
                    format: {
                        body: function (data, row, column, node) {
                            var input = $('input', node);
                            return input.length ? input.val() : data;
                        }
                    }
                }
            },
            {
                extend: 'csv',
                title: `Library Staff Membership - ${companyname}`,
                exportOptions: {
                    columns: [1, 2, 3, 4, 5, 6, 9],
                    format: {
                        body: function (data, row, column, node) {
                            var input = $('input', node);
                            return input.length ? input.val() : data;
                        }
                    }
                }
            },
            {
                extend: 'excel',
                title: `Library Staff Membership - ${companyname}`,
                exportOptions: {
                    columns: [1, 2, 3, 4, 5, 6, 9],
                    format: {
                        body: function (data, row, column, node) {
                            var input = $('input', node);
                            return input.length ? input.val() : data;
                        }
                    }
                }
            },
            {
                extend: 'pdf',
                title: `Library Staff Membership - ${companyname}`,
                exportOptions: {
                    columns: [1, 2, 3, 4, 5, 6, 9],
                    format: {
                        body: function (data, row, column, node) {
                            var input = $('input', node);
                            return input.length ? input.val() : data;
                        }
                    }
                }
            },
            {
                extend: 'print',
                title: `Library Staff Membership - ${companyname}`,
                exportOptions: {
                    columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
                    format: {
                        body: function (data, row, column, node) {
                            var input = $('input', node);
                            return input.length ? input.val() : data;
                        }
                    }
                }
            }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false,
        language: {
            emptyTable: "Please select filters to load staff."
        }
    });

    renderFilterBadges();
    updateSelectedCount();
});

// ========================================
// Delete (cancel) an individual membership
// ========================================
function deleteMembership(id, staffId) {
    Swal.fire({
        title: 'Cancel Membership?',
        text: "Are you sure you want to remove this staff member from library membership?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, cancel it!',
        customClass: { confirmButton: 'btn btn-danger me-2', cancelButton: 'btn btn-secondary' },
        buttonsStyling: false
    }).then((result) => {
        if (result.isConfirmed) {
            $.post('/Library/DeleteMember', { id: id, staffId: staffId, modeType: 'Staff' }, function (res) {
                if (res.success) {
                    Swal.fire('Deleted!', 'LIBRARY MEMBERSHIP CANCELLED', 'success')
                        .then(() => location.reload());
                } else {
                    Swal.fire('Error!', res.message || 'Failed to delete LIBRARY MEMBERSHIP CANCELLED.', 'error');
                }
            });
        }
    });
}

// ========================================
// Top bulk-fill bar → copies same values into every editable row
// (each row's own boxes stay editable afterwards for single overrides)
// ========================================
function fillAllRows() {
    const nod = document.getElementById('topNOD')?.value;
    const days = document.getElementById('topDays')?.value;
    const expiry = document.getElementById('topExpiry')?.value;   // native date input — real ISO, e.g. "2026-08-24"
    const renew = document.getElementById('topRenew')?.value;
    const cardNo = document.getElementById('topCardNo')?.value;

    if (!nod && !days && !expiry && !renew && !cardNo) {
        Swal.fire('Nothing to fill', 'Set at least one value above first.', 'warning');
        return;
    }

    document.querySelectorAll('#tblMembers tbody tr').forEach(row => {
        const nodEl = row.querySelector('.nod-input');
        const daysEl = row.querySelector('.days-input');
        const expiryEl = row.querySelector('.expiry-input');
        const renewEl = row.querySelector('.renew-input');
        const cardEl = row.querySelector('.cardno-input');

        if (nodEl && nod) nodEl.value = nod;
        if (cardEl && cardNo) cardEl.value = cardNo;

        if (expiryEl && expiry) {
            expiryEl.value = expiry;                 // set the real (ISO) value
            syncOneDateDisplay(expiryEl);             // refresh the dd-mm-yyyy overlay
            calcDays(expiryEl, 0);                    // programmatic .value= doesn't fire 'change', so call directly
        }
        if (renewEl && renew) {
            renewEl.value = renew;
            syncOneDateDisplay(renewEl);
            calcDays(renewEl, 0);
        }

        if (daysEl && days) daysEl.value = days;
    });
}

// ========================================
// Expiry / Renew date → auto-calculate Days
// ========================================

// Called on change of either date input in a row. Fills the row's
// Days field with the whole-day difference between the two dates.
function calcDays(changedEl, isSearch) {
    let expiryEl, renewEl, daysEl;

    if (isSearch === 0) {
        const row = changedEl.closest('tr');
        if (!row) return;
        expiryEl = row.querySelector('.expiry-input');
        renewEl = row.querySelector('.renew-input');
        daysEl = row.querySelector('.days-input');
    } else {
        expiryEl = document.getElementById('topExpiry');
        renewEl = document.getElementById('topRenew');
        daysEl = document.getElementById('topDays');
    }

    if (!expiryEl || !renewEl || !daysEl) return;
    if (!expiryEl.value || !renewEl.value) return;

    const expiry = new Date(expiryEl.value);
    const renew = new Date(renewEl.value);
    const diffDays = Math.round((renew - expiry) / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
        daysEl.value = diffDays;
        daysEl.classList.remove('is-invalid');
    } else {
        daysEl.value = '';
        daysEl.classList.add('is-invalid');
        Swal.fire('Invalid dates', 'Renew Date must be after Expiry Date.', 'warning');
    }
}

// ========================================
// Bulk registration — per-row Expiry/Renew/NOD/Days/Card No
// only rows without an existing card number render inputs
// ========================================

function toggleSelectAll(checkbox) {
    document.querySelectorAll('#tblMembers tbody .row-check')
        .forEach(cb => cb.checked = checkbox.checked);
    updateSelectedCount();
}

function updateSelectedCount() {
    const count = document.querySelectorAll('#tblMembers tbody .row-check:checked').length;
    const btn = document.getElementById('btnRegisterSelected');
    if (btn) {
        btn.querySelector('.selected-count')?.remove();
        if (count > 0) {
            const span = document.createElement('span');
            span.className = 'selected-count badge bg-white text-primary ms-1';
            span.textContent = count;
            btn.appendChild(span);
        }
    }
}

// Reads Expiry Date / Renew Date / NOD / Days / Card No from each checked row.
function collectSelectedForBulk() {
    const rows = [];
    let hasError = false;

    document.querySelectorAll('#tblMembers tbody tr').forEach(row => {
        const check = row.querySelector('.row-check');
        if (!check || !check.checked) return;

        const isExisting = row.dataset.isExisting === '1';
        const expiryEl = row.querySelector('.expiry-input');
        const renewEl = row.querySelector('.renew-input');
        const nodInput = row.querySelector('.nod-input');
        const daysInput = row.querySelector('.days-input');
        const cardInput = row.querySelector('.cardno-input');
        const cardSpan = row.querySelector('[data-card-no]');

        const expiryDate = expiryEl?.value || null;
        const renewDate = renewEl?.value || null;
        const nod = parseInt(nodInput?.value, 10);
        const days = parseInt(daysInput?.value, 10);

        const invalid = !expiryDate || !renewDate || !nod || nod < 1 || !days || days < 1;
        [expiryEl, renewEl, nodInput, daysInput].forEach(el => el && el.classList.toggle('is-invalid', invalid));
        if (invalid) { hasError = true; return; }

        rows.push({
            MemberType: 'Staff',
            StaffID: parseInt(row.dataset.staffId, 10),
           
            IsExistingMember: isExisting,
            LibraryMemberID: isExisting ? (parseInt(row.dataset.libraryMemberId, 10) || null) : null,
            LibraryCardNo: isExisting
                ? (cardSpan?.dataset.cardNo || null)   // integrity check only on update
                : (cardInput?.value.trim() || null),   // blank = server auto-generates on insert
            ExpiryDate: expiryDate,
            RenewDate: renewDate,
            NoOfDocuments: nod,
            MaxDays: days
        });
    });

    if (hasError) {
        Swal.fire('Missing values', 'Please fill Expiry Date, Renew Date, NOD and Days for every selected staff member.', 'warning');
        return null;
    }
    return rows;
}

function saveBulkMembership() {
    const staff = collectSelectedForBulk();

    if (staff === null) return; // validation failed, message already shown

    if (!staff.length) {
        Swal.fire('No staff selected', 'Check at least one staff member to register.', 'warning');
        return;
    }

    const sessionYear = document.getElementById('hdnSessionYear')?.value;
    if (!sessionYear) {
        Swal.fire('Session missing', 'Current session could not be determined for card number generation.', 'error');
        return;
    }

    const payload = {
        sessionYear: sessionYear,
        students: staff // same bulk endpoint/shape as the student grid; each row carries MemberType: 'Staff'
    };

    const btn = document.getElementById('btnRegisterSelected');
    if (btn) btn.disabled = true;

    $.ajax({
        url: '/Library/AddStudentsMembershipBulk',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload),
        success: function (res) {
            if (btn) btn.disabled = false;
            if (res.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Registered!',
                    text: 'Selected staff registered successfully.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-success' },
                    buttonsStyling: false
                }).then(() => location.reload());
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: res.message || 'Failed to register selected staff.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-danger' },
                    buttonsStyling: false
                });
            }
        },
        error: function () {
            if (btn) btn.disabled = false;
            Swal.fire('Error', 'Something went wrong while saving.', 'error');
        }
    });
}


// ========================================
// Partial reload — used by submitForm() for filter/search/pagination
// ========================================
function loadStaffPartial(queryString) {
    const container = document.getElementById('tblMembersWrapper');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/Library/GetAddStaffPartial?${queryString}`, {
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
    const link = e.target.closest('#tblMembersWrapper .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('PageIndex') || 1;
    loadStaffPartial(query);
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