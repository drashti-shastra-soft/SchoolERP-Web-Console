// ========================================
// Add Class Timetable — page script
// ========================================
$('#FilterClassID, #FilterSectionID, #FilterSubjectGroupID').on('change', function () {
    if ($(this).val()) {
        $(this).next('.select2-container').removeClass('is-invalid');
        $('#err_' + $(this).attr('id')).hide();
    }
});
let isInitializing = true; // guards against spurious change events firing during setup

$(document).ready(function () {


    $('#btnApplyFilters').on('click', function (e) {
        e.preventDefault();
        onApplyFiltersClick();
    });

    $('#FilterClassID, #FilterSectionID, #FilterSubjectGroupID').select2({
        dropdownParent: $('#filter-dropdown'),
        width: '100%'
    });
    $('#FilterClassID, #FilterSectionID, #FilterSubjectGroupID').on('change', function () {
        if ($(this).val()) {
            $(this).next('.select2-container').removeClass('is-invalid');
            $('#err_' + $(this).attr('id')).hide();
        }
    });
    initDynamicSelect2();

    $('#FilterClassID').on('change', function () {
        if (isInitializing) return;
        loadSections($(this).val(), '#FilterSectionID');
    });

    const filters = window.TimeTableFilters || { selectedClassId: 0, selectedSectionId: 0, selectedSubjectGroupId: 0 };
    let initialSubjectGroupId = filters.selectedSubjectGroupId;

    $('#FilterSectionID').on('change', function () {
        if (isInitializing) return;
        loadSubjectGroups($('#FilterClassID').val(), $(this).val(), initialSubjectGroupId);
    });

    $('#FilterSubjectGroupID').on('change', function () {
        if (isInitializing) return;
        refreshAddButtonsVisibility();
        renderFilterBadges(); // ✅ NEW
    });

    $('.filter-dropdown').on('click', function (e) { e.stopPropagation(); });

    $('#tableSearch').on('keyup', function () {
        const val = $(this).val().toLowerCase();
        $('.slot-row').filter(function () {
            $(this).toggle($(this).text().toLowerCase().indexOf(val) > -1)
        });
    });

    const classId = filters.selectedClassId;
    const sectionId = filters.selectedSectionId;
    const subjectGroupId = filters.selectedSubjectGroupId;

    if (classId > 0) {
        loadSections(classId, '#FilterSectionID', sectionId);
        if (sectionId > 0) {
            loadSubjectGroups(classId, sectionId, subjectGroupId);
        } else {
            renderFilterBadges(); // ✅ NEW — class only, nothing async pending after this
        }
    } else {
        renderFilterBadges(); // ✅ NEW — nothing selected at all
    }

    setTimeout(function () { isInitializing = false; }, 0);

    refreshAddButtonsVisibility();
});

function initDynamicSelect2() {
    $('.select2-dynamic').select2();
}

function loadSections(classId, targetSelector, selectedId = null) {
    if (!classId) {
        $(targetSelector).html('<option value="">Select</option>').trigger('change');
        refreshAddButtonsVisibility();
        renderFilterBadges(); // ✅ NEW
        return;
    }
    $.get('/Academics/GetSectionsByClass/' + classId, function (r) {
        if (r.success) {
            let html = '<option value="">Select</option>';
            r.data.forEach(s => {
                html += `<option value="${s.sectionID}">${s.sectionName}</option>`;
            });
            $(targetSelector).html(html);

            if (selectedId !== null && selectedId !== '' && selectedId != 0) {
                $(targetSelector).val(String(selectedId)).trigger('change');
            } else {
                $(targetSelector).val('').trigger('change');
            }
        }
        refreshAddButtonsVisibility();
        renderFilterBadges(); // ✅ NEW
    });
}

function loadSubjectGroups(classId, sectionId, selectedId = null) {
    if (!classId || !sectionId) {
        $('#FilterSubjectGroupID').html('<option value="">Select</option>').trigger('change');
        refreshAddButtonsVisibility();
        renderFilterBadges(); // ✅ NEW
        return;
    }
    $.get('/Academics/GetSubjectGroups', { classId: classId, sectionId: sectionId }, function (r) {
        if (r.success) {
            let html = '<option value="">Select</option>';
            r.data.forEach(g => {
                html += `<option value="${g.subjectGroupID}">${g.name}</option>`;
            });
            $('#FilterSubjectGroupID').html(html);

            if (selectedId !== null && selectedId !== '' && selectedId != 0) {
                $('#FilterSubjectGroupID').val(String(selectedId)).trigger('change');
            } else {
                $('#FilterSubjectGroupID').val('').trigger('change');
            }
        }
        refreshAddButtonsVisibility();
        renderFilterBadges(); // ✅ NEW
    });
}
function addNewRow() {
    if (!requireFiltersOrWarn()) return;

    const activePane = $('.tab-pane.active .slots-container');
    const template = document.getElementById('slotTemplate').innerHTML;
    const $newRow = $(template);
    activePane.append($newRow);
    $newRow.find('select').select2();

    updateAddButtons(activePane);
}

function addRow(btn) {
    if (!requireFiltersOrWarn()) return;

    const $row = $(btn).closest('.slot-row');
    const $container = $row.closest('.slots-container');
    const template = document.getElementById('slotTemplate').innerHTML;
    const $newRow = $(template);

    $row.after($newRow);
    $newRow.find('select').select2();

    updateAddButtons($container);
}
function deleteRow(btn) {
    const $container = $(btn).closest('.slots-container');
    $(btn).closest('.slot-row').remove();

    // keep at least one row so there's always somewhere to click "+"
    if ($container.find('.slot-row').length === 0) {
        const template = document.getElementById('slotTemplate').innerHTML;
        const $newRow = $(template);
        $container.append($newRow);
        $newRow.find('select').select2();
    }

    updateAddButtons($container);
}

function updateAddButtons(container) {
    const $rows = container.find('.slot-row');
    $rows.find('.btn-add-row').hide();

    if (filtersSelected()) {
        $rows.last().find('.btn-add-row').show();
    }
}

function refreshAddButtonsVisibility() {
    $('.slots-container').each(function () {
        updateAddButtons($(this));
    });
}
function applyGenParameters() {
    const startTime = $('#GenStartTime').val();
    const duration = parseInt($('#GenDuration').val());
    const interval = parseInt($('#GenInterval').val());
    const roomNo = $('#GenRoomNo').val();

    if (!startTime || isNaN(duration)) {
        showToast('Please provide Start Time and Duration', 'warning');
        return;
    }

    $('.tab-pane.active .slot-row').each(function (index) {
        const currentStartTime = index === 0 ? startTime : calculateNextTime(lastEndTime, interval);
        const currentEndTime = calculateEndTime(currentStartTime, duration);

        $(this).find('input[name="StartTime"]').val(currentStartTime);
        $(this).find('input[name="EndTime"]').val(currentEndTime);
        $(this).find('input[name="RoomNo"]').val(roomNo);

        lastEndTime = currentEndTime;
    });
}

function calculateEndTime(startTime, minutes) {
    const [h, m] = startTime.split(':').map(Number);
    const date = new Date(0, 0, 0, h, m + minutes);
    return date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
}

function calculateNextTime(endTime, interval) {
    const [h, m] = endTime.split(':').map(Number);
    const date = new Date(0, 0, 0, h, m + (interval || 0));
    return date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
}

let lastEndTime = "";

async function saveAllTimeTable() {
    const classId = $('#FilterClassID').val();
    const sectionId = $('#FilterSectionID').val();
    const subjectGroupId = $('#FilterSubjectGroupID').val();
    if (!classId || !sectionId || !subjectGroupId) {
        Swal.fire({
            icon: 'warning',
            title: 'Missing Filters',
            text: 'Please select Class, Section and Subject Group.',
            confirmButtonText: 'OK',
            customClass: { confirmButton: 'btn btn-warning' },
            buttonsStyling: false
        });
        return;
    }

    const data = [];
    $('.tab-pane').each(function () {
        const day = $(this).data('day');
        $(this).find('.slot-row').each(function () {
            const staffVal = $(this).find('select[name="StaffID"]').val();
            const timeTableIdVal = $(this).find('input[name="TimeTableID"]').val();
            const slot = {
                TimeTableID: timeTableIdVal ? parseInt(timeTableIdVal) : 0,
                ClassID: parseInt(classId),
                SectionID: parseInt(sectionId),
                Day: day,
                SubjectGroupID: parseInt(subjectGroupId),
                SubjectID: parseInt($(this).find('select[name="SubjectID"]').val()),
                StaffID: staffVal ? parseInt(staffVal) : null,
                StartTime: $(this).find('input[name="StartTime"]').val(),
                EndTime: $(this).find('input[name="EndTime"]').val(),
                RoomNo: $(this).find('input[name="RoomNo"]').val()
            };
            if (slot.SubjectID && slot.StartTime && slot.EndTime) {
                data.push(slot);
            }
        });
    });

    if (data.length === 0) {
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'warning',
            title: 'No valid slots to save',
            showConfirmButton: false,
            timer: 1500,
            timerProgressBar: true
        });
        return;
    }

    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: 'Saving...',
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true
    });

    try {
        // Controller expects { Data: "<json string>" }, not a raw array —
        // wrap it here or [FromBody] model binding will silently return request = null.
        const payload = {
            Data: JSON.stringify(data)
        };

        const res = await fetch('/Academics/SaveTimeTable', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(r => r.json());

        if (res.success) {
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: 'Class Timetable has been Save Successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            }).then(() => {
                window.location.href = '/Academics/ClassTimeTable';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.message || 'Failed to save TimeTable.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-danger' },
                buttonsStyling: false
            });
        }
    } catch (err) {
        console.error(err);
        Swal.fire({
            position: 'top-end',
            icon: 'error',
            title: 'Something went wrong while saving',
            showConfirmButton: false,
            timer: 1500,
            timerProgressBar: true
        });
    }
}

function resetAllFilters() {
    $('#FilterClassID').val('').trigger('change');
    $('#FilterSectionID').html('<option value="">Select</option>').val('').trigger('change');
    $('#FilterSubjectGroupID').html('<option value="">Select</option>').val('').trigger('change');

    clearAllSlotData(); // ✅ NEW — wipe stale rows before badges/submit
    renderFilterBadges();
    $('#filterForm').submit();
}

function filtersSelected() {
    const classId = $('#FilterClassID').val();
    const sectionId = $('#FilterSectionID').val();
    const subjectGroupId = $('#FilterSubjectGroupID').val();
    return !!classId && !!sectionId && !!subjectGroupId;
}

//function requireFiltersOrWarn() {
//    if (!filtersSelected()) {
//        showToast('Please select Class, Section and Subject Group first', 'warning');
//        return false;
//    }
//    return true;
//}
function requireFiltersOrWarn() {
    if (!filtersSelected()) {
        Swal.fire({
            icon: 'warning',
            title: 'Missing Filters',
            text: 'Please select Class, Section and Subject Group first.',
            confirmButtonText: 'OK',
            customClass: { confirmButton: 'btn btn-warning' },
            buttonsStyling: false
        });
        return false;
    }
    return true;
}
// ========================================
// Filter badges
// ========================================
function renderFilterBadges() {
    const container = document.getElementById('badgeContainer');
    const mainContainer = document.getElementById('activeFilterBadges');
    if (!container || !mainContainer) return;

    container.innerHTML = '';

    const badges = [];

    const classEl = document.getElementById('FilterClassID');
    if (classEl && classEl.value) {
        badges.push({
            id: 'FilterClassID',
            label: 'Class',
            text: classEl.options[classEl.selectedIndex]?.text || classEl.value
        });
    }

    const sectionEl = document.getElementById('FilterSectionID');
    if (sectionEl && sectionEl.value) {
        badges.push({
            id: 'FilterSectionID',
            label: 'Section',
            text: sectionEl.options[sectionEl.selectedIndex]?.text || sectionEl.value
        });
    }

    const groupEl = document.getElementById('FilterSubjectGroupID');
    if (groupEl && groupEl.value) {
        badges.push({
            id: 'FilterSubjectGroupID',
            label: 'Subject Group',
            text: groupEl.options[groupEl.selectedIndex]?.text || groupEl.value
        });
    }

    badges.forEach(({ id, label, text }) => {
        const badge = document.createElement('span');
        badge.className = 'badge bg-primary-subtle text-primary border border-primary-subtle d-flex align-items-center gap-1 fw-medium px-2 py-1';
        badge.innerHTML = `${label}: ${text} <i class="ti ti-x ms-1 cursor-pointer" onclick="removeFilterBadge('${id}')" style="font-size:10px;"></i>`;
        container.appendChild(badge);
    });

    mainContainer.style.display = badges.length > 0 ? 'block' : 'none';
}

// Clicking the "x" on a badge clears just that filter and re-submits the form.
// Class/Section are cascading — clearing Class must also clear Section & Subject Group.
function removeFilterBadge(filterId) {
    if (filterId === 'FilterClassID') {
        $('#FilterClassID').val('').trigger('change');
        $('#FilterSectionID').html('<option value="">Select</option>').val('').trigger('change');
        $('#FilterSubjectGroupID').html('<option value="">Select</option>').val('').trigger('change');
        clearAllSlotData(); // ✅ NEW — class cleared, nothing downstream is valid anymore
    } else if (filterId === 'FilterSectionID') {
        $('#FilterSectionID').val('').trigger('change');
        $('#FilterSubjectGroupID').html('<option value="">Select</option>').val('').trigger('change');
        clearAllSlotData(); // ✅ NEW
    } else if (filterId === 'FilterSubjectGroupID') {
        $('#FilterSubjectGroupID').val('').trigger('change');
        clearAllSlotData(); // ✅ NEW — subject group governs which slots were loaded, so clear on this too
    }

    $('#filterForm').submit();
}
// ========================================
// Clear loaded timetable rows (used when filters are cleared)
// ========================================
function clearAllSlotData() {
    const template = document.getElementById('slotTemplate').innerHTML;

    $('.slots-container').each(function () {
        const $container = $(this);
        $container.empty();

        // leave exactly one blank row so there's still somewhere to click "+"
        const $newRow = $(template);
        $container.append($newRow);
        $newRow.find('select').select2();

        updateAddButtons($container);
    });
}

function onApplyFiltersClick() {
    if (validateFilterFields()) {
        $('#filterForm').submit();
    }
}

function validateFilterFields() {
    let isValid = true;

    const fields = [
        { id: 'FilterClassID' },
        { id: 'FilterSectionID' },
        { id: 'FilterSubjectGroupID' }
    ];

    fields.forEach(f => {
        const $select = $('#' + f.id);
        const $select2Container = $select.next('.select2-container');
        const $error = $('#err_' + f.id);

        if (!$select.val()) {
            isValid = false;
            $select2Container.addClass('is-invalid');
            $error.show();
        } else {
            $select2Container.removeClass('is-invalid');
            $error.hide();
        }
    });

    if (!isValid) {
        //showToast('Please fill in all required filter fields', 'warning');
        Swal.fire({
            icon: 'warning',
            title: 'Missing Filters',
            text: 'Please fill in all required filter fields',
            confirmButtonText: 'OK',
            customClass: { confirmButton: 'btn btn-warning' },
            buttonsStyling: false
        });
    }

    return isValid;
}
$('#FilterClassID, #FilterSectionID, #FilterSubjectGroupID').on('change', function () {
    if ($(this).val()) {
        $(this).next('.select2-container').removeClass('is-invalid');
        $('#err_' + $(this).attr('id')).hide();
    }
});

function validateGenParameters() {
    let isValid = true;

    const $start = $('#GenStartTime');
    const $duration = $('#GenDuration');
    const $interval = $('#GenInterval');
    const $roomNo = $('#GenRoomNo');

    // reset state
    $('#GenStartTime, #GenDuration, #GenInterval, #GenRoomNo').removeClass('is-invalid');
    $('.gen-error').addClass('d-none');

    const startTime = $start.val();
    const durationRaw = $duration.val().trim();
    const intervalRaw = $interval.val().trim();
    const roomNo = $roomNo.val().trim();

    if (!startTime) {
        $start.addClass('is-invalid');
        $('#err_GenStartTime').removeClass('d-none');
        isValid = false;
    }

    const duration = Number(durationRaw);
    if (durationRaw === '' || !Number.isInteger(duration) || duration < 1 || duration > 240) {
        $duration.addClass('is-invalid');
        $('#err_GenDuration').removeClass('d-none');
        isValid = false;
    }

    const interval = Number(intervalRaw);
    if (intervalRaw === '' || !Number.isInteger(interval) || interval < 0 || interval > 60) {
        $interval.addClass('is-invalid');
        $('#err_GenInterval').removeClass('d-none');
        isValid = false;
    }

    if (!roomNo) {
        $roomNo.addClass('is-invalid');
        $('#err_GenRoomNo').removeClass('d-none');
        isValid = false;
    }

    return isValid ? { startTime, duration, interval, roomNo } : null;
}

function applyGenParameters() {
    const params = validateGenParameters();
    if (!params) {
        //showToast('Please fix the highlighted fields', 'warning');
        Swal.fire({
            icon: 'warning',
            title: 'Validation',
            text: 'Please fix the highlighted fields.',
            confirmButtonText: 'OK',
            customClass: { confirmButton: 'btn btn-warning' },
            buttonsStyling: false
        });
        return;
    }

    const { startTime, duration, interval, roomNo } = params;
    let currentStart = startTime;

    const $rows = $('.tab-pane.active .slot-row');
    if ($rows.length === 0) {
        //showToast('No rows to fill in this day', 'warning');
        Swal.fire({
            icon: 'warning',
            title: 'Missing Rows',
            text: 'No rows to fill in this day',
            confirmButtonText: 'OK',
            customClass: { confirmButton: 'btn btn-warning' },
            buttonsStyling: false
        });
        return;
    }

    $rows.each(function (index) {
        // Time To = Start + Duration + Interval
        const currentEndTime = calculateEndTime(currentStart, duration + interval);

        $(this).find('input[name="StartTime"]').val(currentStart);
        $(this).find('input[name="EndTime"]').val(currentEndTime);
        $(this).find('input[name="RoomNo"]').val(roomNo);

        // next row (if any) starts right where this one ends
        currentStart = currentEndTime;
    });

    //showToast('Time slots generated', 'success');

}