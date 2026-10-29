function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#tblVideoTutorial')) {
        const table = $('#tblVideoTutorial').DataTable();
        table.button(index).trigger();
    }
}
// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_budget';
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
    const sessionEl = document.getElementById('ddlFilterClass');
    const companyEl = document.getElementById('ddlFilterSection');
    if (sessionEl) document.getElementById('hdnSessionID').value = sessionEl.value;
    if (companyEl) document.getElementById('hdnCompanyId').value = companyEl.value;
    //document.getElementById('frmSearch').submit();
    const form = document.getElementById('frmSearch');
    const params = new URLSearchParams(new FormData(form)).toString();

    loadVideoTutorialPartial(params);
}

function applyFilters() {
    const sessionEl = document.getElementById('ddlFilterClass');
    const companyEl = document.getElementById('ddlFilterSection');
    const searchEl = document.getElementById('txtSearchInput');

    const searchVal = searchEl?.value.trim();
    if (searchVal) appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    else delete appliedFilters['txtSearchInput'];

    if (sessionEl?.value && sessionEl.value !== '') {
        appliedFilters['ddlFilterClass'] = {
            label: 'Class',
            text: sessionEl.options[sessionEl.selectedIndex]?.text || sessionEl.value
        };
    } else delete appliedFilters['ddlFilterClass'];

    if (companyEl?.value && companyEl.value !== '') {
        appliedFilters['ddlFilterSection'] = {
            label: 'Company',
            text: companyEl.options[companyEl.selectedIndex]?.text || companyEl.value
        };
    } else delete appliedFilters['ddlFilterSection'];

    saveAppliedFilters();
    renderFilterBadges();   // ← was missing
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
    if (filterId === 'ddlFilterClass') {
        const el = document.getElementById('ddlFilterClass');
        if (el) {
            el.value = '';
            if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
        }
    } else if (filterId === 'ddlFilterSection') {
        const el = document.getElementById('ddlFilterSection');
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
    renderFilterBadges();   // ← was missing
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

function resetAllFilters() {
    document.getElementById('txtSearchInput').value = '';
    document.getElementById('hdnSearch').value = '';

    ['ddlFilterClass', 'ddlFilterSection'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = '';
        if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
    });

    clearAppliedFilters();
    renderFilterBadges();   // ← was missing — "Clear All" now actually clears the badge row
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

// ========================================
// DOMContentLoaded — init DataTable + UI
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    var companyname = localStorage.getItem("comName");
    // ── DataTable (export only) ───────────────────────────────────────
    if ($.fn.DataTable.isDataTable('#tblVideoTutorial')) {
        $('#tblVideoTutorial').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#tblVideoTutorial').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Video Tutorial - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'csv', title: `Video Tutorial - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'excel', title: `Video Tutorial - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'pdf', title: `Video Tutorial - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'print', title: `Video Tutorial - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false
    });

    // ── Select2 ───────────────────────────────────────────────────────
    try {
        if (window.jQuery && typeof jQuery.fn.select2 === 'function') {
            jQuery('#ddlFilterClass, #ddlFilterSection').select2({
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

    // ── Reset Filters ─────────────────────────────────────────────────
    document.getElementById('btnResetFilters')?.addEventListener('click', () => {
        document.getElementById('txtSearchInput').value = '';
        document.getElementById('hdnSearch').value = '';
        ['ddlFilterClass', 'ddlFilterSection'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.value = '';
            if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
        });
        clearAppliedFilters();
        renderFilterBadges();   // ← was missing
        document.getElementById('hdnPageIndex').value = 1;
        submitForm();
    });

    // ── Render badges on load ─────────────────────────────────────────
    clearAppliedFilters();
    renderFilterBadges();
});

// ========================================
// Search input — debounced server submit
// ========================================
let searchTimer = null;
const permCanAdd = window.canAdd;
const permCanEdit = window.canEdit;
const permCanDelete = window.canDelete;
window.selectedId = 0;
document.getElementById('txtSearchInput')?.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        document.getElementById('hdnSearch').value = this.value;
        document.getElementById('hdnPageIndex').value = 1;
        const val = this.value.trim();
        if (val) appliedFilters['txtSearchInput'] = { label: 'Search', text: val };
        else delete appliedFilters['txtSearchInput'];
        saveAppliedFilters();
        renderFilterBadges();   // ← was missing — badge now updates live as you type/pause
        submitForm();
    }, 500);
});




function onClassChange(classId, sectionId, isFilter = false, selectedSectionId = null) {
    const cId = $('#' + classId).val();
    const $sec = $('#' + sectionId);
    $sec.empty().append(`<option value="">${isFilter ? 'All Sections' : 'Select Section'}</option>`);

    if (cId) {
        $.get('/DownloadCenter/GetSections', { classId: cId }, function (res) {
            res.forEach(s => {
                const isSelected = selectedSectionId && String(s.sectionID) === String(selectedSectionId);
                $sec.append(`<option value="${s.sectionID}" ${isSelected ? 'selected' : ''}>${s.sectionName}</option>`);
            });
            // if select2 is initialized on this element, refresh it so it reflects the new selection
            if (window.jQuery && $sec.data('select2')) $sec.trigger('change');
        });
    }
}

function triggerBtn(index) {
    if ($.fn.DataTable.isDataTable('#tblVideoTutorial')) {
        const table = $('#tblVideoTutorial').DataTable();
        table.button(index).trigger();
    } else {
        showToast('No data available to export', 'warning');
    }
}

function loadData() {
    const search = $('#txtSearch').val();
    const classId = $('#ddlFilterClass').val();
    const sectionId = $('#ddlFilterSection').val();

    selectedId = 0;
    $('#btnEdit, #btnDelete').prop('disabled', true);

    if ($.fn.DataTable.isDataTable('#tblVideoTutorial')) {
        $('#tblVideoTutorial').DataTable().destroy();
    }

    $.get('/DownloadCenter/GetVideoTutorialList', { classId, sectionId, search }, function (res) {
        let html = '';
        if (res.success && res.data.length > 0) {
            res.data.forEach(item => {
                html += `
                            <tr onclick="selectRow(${item.videoID}, this)" style="cursor:pointer">
                                <td class="ps-3"><input type="radio" name="rowSelect" class="form-check-input" value="${item.videoID}"></td>
                                <td>${item.title}</td>
                                <td><a href="${item.videoLink}" target="_blank" class="text-primary"><i class="ti ti-brand-youtube me-1"></i>Watch</a></td>
                                <td>${item.sharedBy || 'System'}</td>
                                <td>${new Date(item.createdOn).toLocaleDateString('en-GB')}</td>
                                <td>
                                    <div class="form-check form-switch">
                                        <input class="form-check-input status-toggle" type="checkbox" ${item.isActive ? 'checked' : ''} data-id="${item.videoID}">
                                    </div>
                                </td>
                            </tr>
                        `;
            });
        } else {
            html = '<tr><td colspan="7" class="text-center py-4 text-muted">No records found.</td></tr>';
        }
        $('#listBody').html(html);

        if (res.success && res.data.length > 0) {
            $('#tblVideoTutorial').DataTable({
                destroy: true,
                responsive: true,
                pageLength: 10,
                lengthMenu: [
                    [10, 25, 50, 100],
                    [10, 25, 50, 100]
                ],
                dom: 'Brtip',
                buttons: [
                    {
                        extend: 'copy',
                        className: 'btn btn-secondary btn-sm',
                        exportOptions: {
                            columns: [1, 3, 4]
                        }
                    },
                    {
                        extend: 'csv',
                        className: 'btn btn-info btn-sm',
                        exportOptions: {
                            columns: [1, 3, 4]
                        }
                    },
                    {
                        extend: 'excel',
                        className: 'btn btn-success btn-sm',
                        exportOptions: {
                            columns: [1, 3, 4]
                        }
                    },
                    {
                        extend: 'pdf',
                        className: 'btn btn-danger btn-sm',
                        exportOptions: {
                            columns: [1, 3, 4]
                        }
                    },
                    {
                        extend: 'print',
                        className: 'btn btn-primary btn-sm',
                        exportOptions: {
                            columns: [1, 3, 4]
                        }
                    }
                ]
            });
        }

        renderFilterBadges();
    });
}


function selectRow(id, element) {
    window.selectedId = id;
    $(element).addClass('bg-light').siblings().removeClass('bg-light');
    $(element).find('input[type="radio"]').prop('checked', true);
    $('#btnEdit, #btnDelete', 'btnView').prop('disabled', false);
}


function editView() {
    if (window.selectedId <= 0) return;

    try {

        if (window.selectedId) {
            location.href = `/DownloadCenter/ViewVideoTutorial/${window.selectedId}`;
        }

    } catch (err) {
        console.error(err);
    }
}
function editSelected() {
    if (window.selectedId <= 0) return;

    try {

        if (window.selectedId) {
            location.href = `/DownloadCenter/AddVideoTutorial/${window.selectedId}`;
        }

    } catch (err) {
        console.error(err);
    }
}

function saveData() {
    const title = $('#txtTitle').val().trim();
    const link = $('#txtLink').val().trim();
    const classId = $('#ddlClass').val();
    const sectionId = $('#ddlSection').val();
    const companyID = parseInt($('#hdnCompanyID').val()) || 0;
    if (!title || !link || !classId || !sectionId) {
        showToast('Please fill all required fields', 'warning');
        return;
    }

    const data = {
        videoID: parseInt($('#hdnId').val()) || 0,
        title: title,
        videoLink: link,
        description: $('#txtDescription').val().trim(),
        classID: parseInt(classId),
        sectionID: parseInt(sectionId),
        companyID: companyID,
        isActive: document.getElementById('isActive').checked
    };
    var id = parseInt(document.getElementById('hdnId').value) || 0;
    const isEdit = id > 0;
    $.ajax({
        url: '/DownloadCenter/UpsertVideoTutorial',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function (res) {
            if (res.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Saved!',
                    text: isEdit
                        ? 'Video tutorial has been Updated Successfully.'
                        : 'Video tutorial has been Added Successfully.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-success' },
                    buttonsStyling: false
                }).then(() => {
                    window.location.href = '/DownloadCenter/VideoTutorial';
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: res.message || 'Failed to save video tutorial.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-danger' },
                    buttonsStyling: false
                });
            }
        }
    });
}
async function deleteSelected() {
    if (!permCanDelete) {
        IV.setNotice('classPageNotice', 'You do not have permission to delete.');
        return;
    }

    let selectedIds = [];
    $('.student-checkbox:checked').each(function () {
        selectedIds.push(parseInt($(this).val()));
    });
    if (selectedIds.length === 0) {
        alert("Please select at least one Country.");
        return;
    }
    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to delete this video tutorial record. This action cannot be undone!",
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
                url: '/DownloadCenter/DeleteVideoTutorial',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Video tutorial record has been deleted.', 'success')
                            .then(() => submitForm());
                    } else {
                        Swal.fire('Error!', res.message || 'Failed to delete video tutorial.', 'error');
                    }
                },
                error: function () {
                    Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                }
            });
        }
    });
}

function selectItem(id, row) {
    //IV.clearNotice('classPageNotice');
    window.selectedId = id;
    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));
    row.classList.add('bg-light');
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
    $('#btnView').prop('disabled', checkedCount === 0);
}


async function toggleStatus(id, isActive, checkboxEl) {
    if (!permCanEdit) {
        IV.setNotice('classPageNotice', 'You do not have permission to change status.');
        if (checkboxEl) {
            checkboxEl.checked = !isActive;
            $(checkboxEl).trigger('change'); // ensure UI/plugin state syncs
        }
        location.reload();
        return;
    }

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

    const request = { ids: sectionIds.join(','), isActive: isActive };

    // helper to revert every affected checkbox/switch
    // helper to revert every affected checkbox
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
                    url: '/DownloadCenter/ToggleVideoStatus',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(request),
                    success: function (res) {
                        if (res.success) {
                            Swal.fire('Updated!', res.message || 'Status updated successfully.', 'success').then(() => submitForm());
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
                // ---- FIX: User cancelled (or dismissed) the confirmation ----
                revertAll();

                // Clear selection state completely
                window.selectedId = 0;
                selectedId = 0;

                // Uncheck ALL checkboxes explicitly (don't rely only on the earlier-captured list)
                $('.student-checkbox').prop('checked', false);

                // Remove row highlight
                document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));

                // Force-disable action buttons directly, don't only depend on recount
                $('#btnEdit, #btnDelete, #btnActive, #btnInactive, #btnView').prop('disabled', true);

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
// ========================================
// Partial reload — used by submitForm() for filter/search/pagination
// ========================================
function loadVideoTutorialPartial(queryString) {
    const container = document.getElementById('videoTutorialContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/DownloadCenter/GetVideoTutorialPartial?${queryString}`, {
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
    const link = e.target.closest('#videoTutorialContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('PageIndex') || 1;
    loadVideoTutorialPartial(query);
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