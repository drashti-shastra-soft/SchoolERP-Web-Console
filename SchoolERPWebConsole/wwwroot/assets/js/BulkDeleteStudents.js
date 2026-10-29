// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_bulkDeleteStudents';
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

// ========================================
// submitForm — syncs hidden fields, reloads partial.
// Safe to call from anywhere (apply/reset/pagination/after-delete).
// ========================================
function submitForm() {
    const classEl = document.getElementById('ddlClass');
    const sectionEl = document.getElementById('ddlSection');
    const searchEl = document.getElementById('txtSearchInput');

    if (classEl) document.getElementById('hdnClassId').value = classEl.value;
    if (sectionEl) document.getElementById('hdnSectionId').value = sectionEl.value;
    if (searchEl) document.getElementById('hdnSearch').value = searchEl.value.trim();

    const form = document.getElementById('frmSearch');
    if (!form) {
        console.warn('submitForm: #frmSearch not found, skipping reload.');
        return;
    }
    const params = new URLSearchParams(new FormData(form)).toString();

    loadBulkDeletePartial(params);
}

function applyFilters() {
    const classEl = document.getElementById('ddlClass');
    const sectionEl = document.getElementById('ddlSection');
    const searchEl = document.getElementById('txtSearchInput');

    const searchVal = searchEl?.value.trim();
    if (searchVal) appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    else delete appliedFilters['txtSearchInput'];

    if (classEl?.value && classEl.value !== '') {
        appliedFilters['ddlClass'] = {
            label: 'Class',
            text: classEl.options[classEl.selectedIndex]?.text || classEl.value
        };
    } else delete appliedFilters['ddlClass'];

    if (sectionEl?.value && sectionEl.value !== '') {
        appliedFilters['ddlSection'] = {
            label: 'Section',
            text: sectionEl.options[sectionEl.selectedIndex]?.text || sectionEl.value
        };
    } else delete appliedFilters['ddlSection'];

    document.getElementById('hdnPageIndex').value = 1;

    saveAppliedFilters();
    renderFilterBadges();
    submitForm();
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
    if (filterId === 'ddlClass') {
        const el = document.getElementById('ddlClass');
        if (el) {
            el.value = '';
            if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
        }
    } else if (filterId === 'ddlSection') {
        const el = document.getElementById('ddlSection');
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
    renderFilterBadges();
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

function resetAllFilters() {
    document.getElementById('txtSearchInput').value = '';
    document.getElementById('hdnSearch').value = '';

    ['ddlClass', 'ddlSection'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = '';
        if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
    });

    clearAppliedFilters();
    document.getElementById('hdnPageIndex').value = 1;
    renderFilterBadges();

    const toggleEl = document.getElementById('btnFilterToggle');
    if (toggleEl && window.bootstrap) {
        const dd = bootstrap.Dropdown.getInstance(toggleEl) || new bootstrap.Dropdown(toggleEl);
        dd.hide();
    }

    submitForm();
}

// ========================================
// triggerExport
// ========================================
function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#tblStudents')) {
        const table = $('#tblStudents').DataTable();
        table.button(index).trigger();
    } else {
        Swal.fire('Info', 'No data available to export', 'info');
    }
}

// ========================================
// DOMContentLoaded — single init point
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    clearAppliedFilters();
    renderFilterBadges();

    // ── Class → Section cascading dropdown ──────────────────────────
    $('#ddlClass').on('change', function () {
        var classId = $(this).val();
        $('#ddlSection').empty().append('<option value="">Select Section</option>');
        if (classId) {
            $.get('/StudentInformation/GetSections', { classId: classId }, function (data) {
                $.each(data, function (i, item) {
                    $('#ddlSection').append('<option value="' + item.id + '">' + item.name + '</option>');
                });
            });
        }
    });

    // ── Select2 ───────────────────────────────────────────────────────
    if (window.jQuery && typeof jQuery.fn.select2 === 'function') {
        jQuery('#ddlClass, #ddlSection').select2({
            width: '100%',
            dropdownParent: jQuery('#filter-dropdown'),
            allowClear: true,
            placeholder: function () { return jQuery(this).data('placeholder') || 'Select'; }
        });
    }

    initTableFeatures();

    // ── Apply Filters ─────────────────────────────────────────────────
    document.getElementById('btnApplyFilters')?.addEventListener('click', (e) => {
        e.preventDefault();
        applyFilters();
    });

    // ── Reset Filters ─────────────────────────────────────────────────
    document.getElementById('btnResetFilters')?.addEventListener('click', (e) => {
        e.preventDefault();
        resetAllFilters();
    });

    // ── Filter dropdown popper tweak ─────────────────────────────────
    $('#btnFilterToggle').on('shown.bs.dropdown', function () {
        var dropdownInstance = bootstrap.Dropdown.getInstance(this);
        if (dropdownInstance && dropdownInstance._popper) {
            dropdownInstance._popper.setOptions({
                modifiers: [
                    { name: 'flip', enabled: false },
                    { name: 'preventOverflow', enabled: false }
                ]
            });
        }
    });
});

// ========================================
// Text search — debounce-triggers reload via submitForm()
// ========================================
const searchInput = document.getElementById('txtSearchInput');
if (searchInput) {
    let debounceTimer = null;
    searchInput.addEventListener('input', function () {
        const val = this.value.trim();
        document.getElementById('hdnSearch').value = val;
        if (val) {
            appliedFilters['txtSearchInput'] = { label: 'Search', text: val };
        } else {
            delete appliedFilters['txtSearchInput'];
        }
        saveAppliedFilters();
        renderFilterBadges();

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
            document.getElementById('hdnPageIndex').value = 1;
            submitForm();
        }, 300);
    });

    searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(debounceTimer);
            applyFilters();
        }
    });
}

// ========================================
// DataTable (export-only) — re-init after every partial reload
// ========================================
function initTableFeatures() {
    var companyname = localStorage.getItem("comName");
    if ($.fn.DataTable.isDataTable('#tblStudents')) {
        $('#tblStudents').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    try {
        window.exportTable = $('#tblStudents').DataTable({
            dom: 'Bfrtip',
            buttons: [
                { extend: 'copy', title: `Bulk Delete - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] } },
                { extend: 'csv', title: `Bulk Delete - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] } },
                { extend: 'excel', title: `Bulk Delete - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] } },
                { extend: 'pdf', title: `Bulk Delete - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] } },
                { extend: 'print', title: `Bulk Delete - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] } }
            ],
            searching: false,
            paging: false,
            info: false,
            ordering: false,
            language: {
                emptyTable: 'No records found.',
                zeroRecords: 'No matching records found.'
            }
        });
    } catch (e) {
        console.warn('DataTable init warning (tblStudents):', e);
    }
}

// ========================================
// Selection helpers
// ========================================
function toggleSelectAll(source) {
    $('.student-checkbox').prop('checked', source.checked);
    updateDeleteButton();
}

function updateDeleteButton() {
    const selectedCount = $('.student-checkbox:checked').length;
    $('#btnBulkDelete').prop('disabled', selectedCount === 0);
}

// ========================================
// Bulk delete
// ========================================
function processBulkDelete() {
    const selectedIds = [];
    $('.student-checkbox:checked').each(function () {
        selectedIds.push(parseInt($(this).val()));
    });

    if (selectedIds.length === 0) return;

    Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete ${selectedIds.length} student(s). This action will remove them from all active lists!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete them!',
        buttonsStyling: false,
        customClass: {
            confirmButton: 'btn btn-danger me-2',
            cancelButton: 'btn btn-secondary'
        }
    }).then((result) => {
        if (result.isConfirmed) {
            $.ajax({
                url: '/StudentInformation/BulkDeleteStudents',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Bulk delete students record has been deleted.', 'success')
                            .then(() => {                               
                                submitForm(); // -> loadRoomOccupancyTypePartial, keeps current filters/page
                            });
                    } else {
                        Swal.fire('Error!', res.message || 'Failed to delete Bulk delete students.', 'error');
                    }
                },
                error: function () {
                    Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                }
            });
        }
    });
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

// ========================================
// Partial reload — single reload path used by:
//  - submitForm() for filter/search/apply/reset
//  - processBulkDelete() after a successful delete
//  - pagination clicks
// ========================================
function loadBulkDeletePartial(queryString) {
    const container = document.getElementById('bulkDeleteTableContainer');
    if (!container) {
        console.warn('loadBulkDeletePartial: #bulkDeleteTableContainer not found, skipping reload.');
        return;
    }

    container.style.opacity = '0.5';

    fetch(`/StudentInformation/GetBulkDeletePartial?${queryString}`, {
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

            initTableFeatures();

            // Selection state is stale after a DOM replace
            updateDeleteButton();

            // Badges are driven by appliedFilters / sessionStorage, not the
            // freshly-injected HTML, so re-render here too.
            renderFilterBadges();
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.toast) window.toast.error('Could not refresh the list.');
        });
}

// Pagination click interception, scoped to the bulk delete container
document.addEventListener('click', function (e) {
    const link = e.target.closest('#bulkDeleteTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('page') || 1;
    loadBulkDeletePartial(query);
    history.replaceState(null, '', href);
});