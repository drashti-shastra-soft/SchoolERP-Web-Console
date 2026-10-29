// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_complaint';
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

    loadAlumniEventPartial(params);

}

function applyFilters() {
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
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

    ['ddlFilterSessions', 'ddlFilterCompany'].forEach(id => {
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
    initCalendar();
    
    // ── Select2 ───────────────────────────────────────────────────────
    try {
        if (window.jQuery && typeof jQuery.fn.select2 === 'function') {
            jQuery('#ddlFilterSessions, #ddlFilterCompany').select2({
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
        ['ddlFilterSessions', 'ddlFilterCompany'].forEach(id => {
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


window.selectedId;
let selectedId = 0;
let calendar;
const canEdit = window.canEdit;
const canDelete = window.canDelete;


function initCalendar() {
    calendar = $('#calendar').fullCalendar({
        header: {
            left: 'prev,next today',
            center: 'title',
            right: 'month,agendaWeek,agendaDay'
        },
        editable: false,
        eventLimit: true,
        displayEventTime: true,
        displayEventEnd: true,
        timeFormat: 'h:mm a',
        eventRender: function (event, element) {

            const tooltipContent = `
                <div>
                    <strong>${event.title}</strong><br/>
                    <b>Time:</b> ${event.fromTime} - ${event.toTime}<br/>
                    <b>Location:</b> ${event.location || '-'}<br/>
                    <b>Description:</b> ${event.description || '-'}
                </div>
            `;

            element.attr('data-bs-toggle', 'tooltip');
            element.attr('data-bs-html', 'true');
            element.attr('title', tooltipContent);

            new bootstrap.Tooltip(element[0]);
        },
        events: function (start, end, timezone, callback) {
            $.get('/Alumni/GetEvents', function (res) {
                if (res.success) {
                    const events = res.data.map(item => {
                        let startVal = item.fromDate;
                        let endVal = item.toDate;

                        // Split to get local dates
                        const startDateStr = startVal.split('T')[0];
                        const endDateStr = endVal.split('T')[0];

                        // For all-day spanning in FullCalendar, end date is exclusive.
                        // We add 1 day to the end date so it spans completely through the last day.

                        const mappedEnd = moment(endDateStr).add(1, 'days').format('YYYY-MM-DD');

                        // Prepend event start time for easy viewing on the solid spanning bar
                        const startTimeStr = moment(startVal).format('h:mm A');
                        const endTimeStr = moment(endVal).format('h:mm A');
                        const displayTitle = `${startTimeStr} to ${endTimeStr} - ${item.eventTitle}`;

                        return {
                            id: item.eventID,
                            title: displayTitle,
                            start: startDateStr,
                            end: mappedEnd,
                            allDay: true,

                            // Tooltip Data
                            description: item.eventDescription,
                            location: item.location,
                            fromTime: startTimeStr,
                            toTime: endTimeStr
                        };
                    });
                    callback(events);
                }
            });
        },
        dayClick: function (date, jsEvent, view) {
            const clickedDate = date.format('YYYY-MM-DD');
            const events = $('#calendar').fullCalendar('clientEvents');
            const match = events.find(e => {
                const start = e.start.format('YYYY-MM-DD');
                const end = e.end ? e.end.format('YYYY-MM-DD') : start;
                return clickedDate >= start && clickedDate <= end;
            });
            if (match) {
                selectItem(match.id, `#row-${match.id}`);
            }
        },
        eventClick: function (event, jsEvent, view) {

            selectItem(event.id, `#row-${event.id}`);
            handleViewAction();

        },
        dayRender: function (date, cell) {
            if (!selectedId) return;
            const data = $(`#row-${selectedId}`).data('item-info');
            if (!data) return;

            const cellDate = date.format('YYYY-MM-DD');
            const start = data.fromDate.split('T')[0];
            const end = data.toDate.split('T')[0];

            if (cellDate >= start && cellDate <= end) {
                cell.addClass('bg-warning-subtle border-warning');
            }
        }
    });
}

function loadSections(classId) {
    if (classId) {
        return $.get('/Attendance/GetSectionsByClass', { classId: classId }, function (res) {
            let html = '';
            if (res.success) {
                res.data.forEach(s => {
                    html += `<option value="${s.sectionID}">${s.sectionName}</option>`;
                });
            }
            $('#modalSectionSelect').html(html).trigger('change');
        });
    } else {
        $('#modalSectionSelect').html('').trigger('change');
        return $.Deferred().resolve().promise();
    }
}


let exportTable;
function initBackgroundDataTable() {
    if ($.fn.DataTable.isDataTable('#tblEvents')) {
        $('#tblEvents').DataTable().destroy();
    }
    exportTable = $('#tblEvents').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', exportOptions: { columns: [1, 2, 3] } },
            { extend: 'csv', exportOptions: { columns: [1, 2, 3] } },
            { extend: 'excel', exportOptions: { columns: [1, 2, 3] } },
            { extend: 'pdf', exportOptions: { columns: [1, 2, 3] } },
            { extend: 'print', exportOptions: { columns: [1, 2, 3] } }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false
    });
}

function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#tblEvents')) {
        const table = $('#tblEvents').DataTable();
        table.button(index).trigger();
    }
}
function selectItem(id, row) {
    window.selectedId = id;
    $('.item-row').removeClass('bg-light');
    $(row).addClass('bg-light');

    $('#btnView').prop('disabled', false);
    if (canEdit) $('#btnEdit').prop('disabled', false);
    if (canDelete) $('#btnDelete').prop('disabled', false);

    if (calendar) $('#calendar').fullCalendar('rerenderEvents');
}

function handleViewAction() {
    if (!window.selectedId) return;
    try {

        if (window.selectedId) {
            location.href = `/Alumni/ViewDetails/${window.selectedId}`;
        }

    } catch (err) {
        console.error(err);
    }
}

function handleEditAction() {
    if (!window.selectedId) return;
    try {

        if (window.selectedId) {
            location.href = `/Alumni/Add/${window.selectedId}`;
        }

    } catch (err) {
        console.error(err);
    }
}

// ========================================
// Inline validation (required fields + date range)
// Hides message the moment the field becomes valid again.
// ========================================
function clearFieldError(id) {
    const $input = $('#' + id);
    $input.removeClass('is-invalid');
    $('#err_' + id).removeClass('show');
}

function setFieldError(id, show) {
    const $input = $('#' + id);
    const $err = $('#err_' + id);
    if (show) {
        $input.addClass('is-invalid');
        $err.addClass('show');
    } else {
        clearFieldError(id);
    }
}

function validateEventForm() {
    let valid = true;

    const title = $('#eventTitle').val()?.trim();
    if (!title) { setFieldError('eventTitle', true); valid = false; }
    else clearFieldError('eventTitle');

    const fromVal = $('#fromDate').val();
    if (!fromVal) { setFieldError('fromDate', true); valid = false; }
    else clearFieldError('fromDate');

    const toVal = $('#toDate').val();
    if (!toVal) {
        setFieldError('toDate', true);
        valid = false;
    } else if (fromVal && new Date(toVal) < new Date(fromVal)) {
        $('#err_toDate').text('To Date cannot be before From Date.').addClass('show');
        $('#toDate').addClass('is-invalid');
        valid = false;
    } else {
        clearFieldError('toDate');
    }

    return valid;
}

// Live: clear errors as the user fixes them, and re-check date range as either date changes
$(document).on('input change', '#eventTitle, #fromDate, #toDate', function () {
    validateEventForm();
});

// Show/hide the class-targeting block based on Event For selection
$(document).on('change', 'input[name="eventFor"]', function () {
    if ($(this).val() === '2') {
        $('#classTargeting').removeClass('d-none');
    } else {
        $('#classTargeting').addClass('d-none');
    }
});

// ── On page load: if editing with EventFor == Class, load sections then restore selection ──
$(function () {
    const $targeting = $('#classTargeting');
    if ($targeting.length && !$targeting.hasClass('d-none')) {
        const classId = $targeting.data('selected-class');
        const sectionIds = ($targeting.data('selected-sections') || '').toString();
        if (classId) {
            loadSections(classId).then(() => {
                const ids = sectionIds ? sectionIds.split(',').map(s => s.trim()) : [];
                $('#modalSectionSelect').val(ids).trigger('change');
            });
        }
    }

    // Remove-existing-photo handling (mirrors Attachment remove-file UX)
    $('#btnRemoveExistingPhoto').on('click', function () {
        $('#rowExistingPhoto').addClass('d-none');
        $('#removeEventPhoto').val('true');
    });
    $('#eventPhoto').on('change', function () {
        if (this.files && this.files.length > 0) {
            $('#removeEventPhoto').val('false');
            $('#rowExistingPhoto').addClass('d-none');
        }
    });
});

// ── Save (create/update) — now blocked by validateEventForm() ──
function saveEvent() {
    if (!validateEventForm()) {
        // Scroll to first invalid field instead of silently doing nothing
        const $firstInvalid = $('.is-invalid').first();
        if ($firstInvalid.length) $firstInvalid.trigger('focus');
        return;
    }

    const formData = new FormData();
    formData.append('EventID', $('#eventId').val());
    formData.append('EventTitle', $('#eventTitle').val());
    formData.append('FromDate', $('#fromDate').val());
    formData.append('ToDate', $('#toDate').val());
    formData.append('Location', $('#location').val());
    formData.append('EventDescription', $('#eventDescription').val());
    formData.append('RemovePhoto', $('#removeEventPhoto').val());

    const eventFor = $('input[name="eventFor"]:checked').val();
    formData.append('EventFor', eventFor);

    if (eventFor == '2') {
        formData.append('SessionID', $('#modalSessionSelect').val());
        formData.append('ClassID', $('#modalClassSelect').val());
        formData.append('SectionIDs', $('#modalSectionSelect').val() ? $('#modalSectionSelect').val().join(',') : '');
    }

   
    const fileInput = document.getElementById('attachmentFile');
    if (fileInput.files[0]) {
        formData.append('EventPhoto', fileInput.files[0]);
    }
    var id = $('#eventId').val();
    const isEdit = id > 0;
    $.ajax({
        url: '/Alumni/UpsertEvent',
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function (res) {
            if (res.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Saved!',
                    text: isEdit
                        ? 'Event has been updated successfully.'
                        : 'Event has been added successfully.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-success' },
                    buttonsStyling: false
                }).then(() => {
                    window.location.href = '/Alumni/Events';
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: res.message || 'Failed to save complaint.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-danger' },
                    buttonsStyling: false
                });
            }
        },
        error: function () {
            Swal.fire('Error', 'An unexpected error occurred while saving.', 'error');
        }
    });
}

$('#btnSaveEvent').on('click', saveEvent);


// ========================================
// Multi-select: checkbox-driven Delete + Active/Inactive
// ========================================
function selectAllAlumniEvents(master) {
    $('.alumni-checkbox').prop('checked', master.checked);
    updateButtonStates();
}

function getCheckedEventIds() {
    return $('.alumni-checkbox:checked').map(function () { return $(this).val(); }).get();
}

function updateButtonStates() {
    const ids = getCheckedEventIds();
    $('#btnEdit').prop('disabled', ids.length !== 1);
    $('#btnDelete').prop('disabled', ids.length === 0);
    $('#btnActive').prop('disabled', ids.length === 0);
    $('#btnInactive').prop('disabled', ids.length === 0);
    $('#btnView').prop('disabled', ids.length !== 1);

    if (ids.length === 1) {
        selectedId = parseInt(ids[0]);
    } else if (ids.length === 0) {
        selectedId = 0;
    }
}

function deleteSelected() {
    if (!selectedId) return;

    let selectedIds = [];
    $('.alumni-checkbox:checked').each(function () {
        selectedIds.push(parseInt($(this).val()));
    });
    if (selectedIds.length === 0) {
        alert("Please select at least one student.");
        return;
    }
    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to delete this event record. This action cannot be undone!",
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
                url: '/Alumni/DeleteEvent',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Event record has been deleted.', 'success')
                            .then(() => submitForm());
                    } else {
                        Swal.fire('Error!', res.message || 'Failed to delete event.', 'error');
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
    $('.alumni-checkbox:checked').each(function () {
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
                    url: '/Alumni/ToggleStatus',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(request),
                    success: function (res) {
                        if (res.success) {
                            Swal.fire('Updated!', 'Status updated successfully.', 'success')
                                .then(() => submitForm());
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



// Wire checkbox changes (delegated, so it also covers rows loaded via AJAX)
$(document).on('change', '.alumni-checkbox', function () {
    updateButtonStates();
});

function handleDeleteAction() {
    if (!selectedId) return;

    Swal.fire({
        title: 'Are you sure?',
        text: "This event will be deleted permanently!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            $.post('/Alumni/DeleteEvent', { id: selectedId }, function (res) {
                if (res.success) {
                    Swal.fire('Deleted!', res.message, 'success');
                    loadEvents();
                } else {
                    Swal.fire('Error!', res.message, 'error');
                }
            });
        }
    });
}



function resetForm() {
    $('#modalTitle').text('Add Event');
    $('#eventId').val(0);
    $('#eventForm')[0].reset();
    $('input[name="eventFor"][value="1"]').prop('checked', true).trigger('change');
    $('#modalSessionSelect, #modalClassSelect, #modalSectionSelect').val('').trigger('change');

    selectedId = 0;
    $('.item-row').removeClass('bg-light');
    $('#btnView, #btnEdit, #btnDelete').prop('disabled', true);
}


// ========================================
// Partial reload — used by submitForm() for filter/search/pagination
// ========================================
function loadAlumniEventPartial(queryString) {
    const container = document.getElementById('alumniEventTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/Alumni/GetAlumniEventPartial?${queryString}`, {
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

            if ($.fn.DataTable.isDataTable('#tblComplaints')) {
                $('#tblComplaints').DataTable().destroy();
            }
            exportTable = $('#tblComplaints').DataTable({
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

// ✅ Pagination click interception, scoped to the hostel type container
document.addEventListener('click', function (e) {
    const link = e.target.closest('#alumniEventTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('PageIndex') || 1;
    loadAlumniEventPartial(query);
    history.replaceState(null, '', href);
});

// ========================================
// Helpers
// ========================================
function updateButtonStates() {
    const count = $('.alumni-checkbox:checked').length;
    $('#btnEdit').prop('disabled', count !== 1);
    $('#btnDelete').prop('disabled', count === 0);
    $('#btnActive').prop('disabled', count === 0);
    $('#btnInactive').prop('disabled', count === 0);
}

$(document).on('change', '#modalSessionSelect', function () {

    const sessionId = $(this).val();
    const $classSelect = $('#modalClassSelect');

    // Reset class dropdown
    $classSelect.html('<option value="">Select Class</option>');

    if (!sessionId) {
        $classSelect.trigger('change');
        return;
    }

    $.ajax({
        url: '/Alumni/GetSessionWiseClassList',
        type: 'GET',
        data: {
            sessionId: sessionId
        },
        success: function (res) {

            if (res.success && res.data) {
                
                    $.each(res.data, function (index, item) {

                        $classSelect.append(
                            $('<option>', {
                                value: item.classID,
                                text: item.className
                            })
                        );

                    });

                    // Refresh Select2
                    $classSelect.trigger('change');
                
                

            } else {
                console.error(res.message || 'Unable to load classes.');
            }
        },
        error: function (xhr) {

            console.error(
                'GetSessionWiseClassList error:',
                xhr.status,
                xhr.responseText
            );
        }
    });
});

async function loadSectionsByClass(classId, targetId) {
    const ddl = $(`#${targetId}`);
    ddl.empty();
    if (!classId) {
        ddl.append(new Option(targetId.includes('filter') ? 'All Sections' : 'Select', ''));
        ddl.trigger('change');
        return null;
    }
    //window.editSectionIds
    try {
        const resp = await fetch(`/Academics/GetSectionsByClass?id=${classId}`);
        const res = await resp.json();
        if (res.success && res.data) {
            if (targetId.includes('filter')) ddl.append(new Option('All Sections', ''));

            res.data.forEach(s => {
                ddl.append(new Option(s.sectionName, s.sectionID));
            });
        }
        ddl.trigger('change');
        return res.data || [];
    } catch (err) {
        console.error(err);
        return [];
    }
}
function initializeAlumniEventSelect2() {

    // Session
    $('#modalSessionSelect').select2({
        width: '100%',
        placeholder: 'Select Session',
        allowClear: true
    });

    // Class
    $('#modalClassSelect').select2({
        width: '100%',
        placeholder: 'Select Class',
        allowClear: true
    });

    // Multiple Section
    $('#modalSectionSelect').select2({
        width: '100%',
        placeholder: 'Select Section(s)',
        allowClear: true,
        closeOnSelect: false
    });
}
$(document).ready(function () {
    initializeAlumniEventSelect2();
    var companyname = localStorage.getItem("comName");
    // ── DataTable (export only) ───────────────────────────────────────
    if ($.fn.DataTable.isDataTable('#tblEvents')) {
        $('#tblEvents').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#tblEvents').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Events - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'csv', title: `Events - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'excel', title: `Events - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'pdf', title: `Events - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'print', title: `Events - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false
    });

});

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

(function () {
    var modalEl = document.getElementById('modalDispatchAttachment');
    if (!modalEl || modalEl.dataset.bound === '1') return;
    modalEl.dataset.bound = '1';

    var modalAttachment = new bootstrap.Modal(modalEl);
    //var loading = document.getElementById('dispatchAttachmentLoading');
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
        // loading.style.display = 'flex';
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

        document.getElementById('modalDispatchAttachmentTitle').textContent = title || 'Attachment';
        resetPreview();

        var ext = getExtension(fileName);

        if (IMAGE_EXTS.indexOf(ext) !== -1) {
            img.onload = function () {
                // loading.style.display = 'none';
                img.style.display = 'block';
            };
            img.onerror = function () {
                //  loading.style.display = 'none';
                unsupported.classList.remove('d-none');
                unsupported.classList.add('d-flex');
            };
            img.src = attachmentPath;
        } else if (PDF_EXTS.indexOf(ext) !== -1) {
            frame.onload = function () {
                //  loading.style.display = 'none';
                frame.style.display = 'block';
            };
            frame.src = attachmentPath;
        } else {
            // loading.style.display = 'none';
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
})();