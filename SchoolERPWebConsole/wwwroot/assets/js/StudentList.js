// ── State ────────────────────────────────────────────────────────────
let selectedStudentId = 0;
let searchTimer;
let appliedFilters = {}; // { key: { label, text } } drives the filter badges


document.addEventListener('click', function (e) {
    const link = e.target.closest('#studentTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;
    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;
    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('page') || 1;
    loadStudentListPartial(buildFilterQuery());   // <-- uses buildFilterQuery(), NOT `query`
});

function buildFilterQuery() {
    const form = document.getElementById('filterForm');
    return new URLSearchParams(new FormData(form)).toString();
}

// ── Select a student row ─────────────────────────────────────────────
function selectStudent(id, element) {
    selectedStudentId = id;
    $('.student-item-row .card').removeClass('border-primary shadow-sm bg-light');
    $('.student-item-row').removeClass('bg-light');
    const $row = $(element);
    if ($row.hasClass('col-xl-6')) {
        $row.find('.card').addClass('border-primary shadow-sm bg-light');
    } else {
        $row.addClass('bg-light');
    }
    const cb = $row.find('.student-checkbox')[0];
    if (cb) cb.checked = !cb.checked;
    updateButtonState();
}

function toggleSelectAll(master) {
    $('.student-checkbox').prop('checked', master.checked);
    updateButtonState();
}

function updateButtonState() {
    const checkedCount = $('.student-checkbox:checked').length;
    $('#btnDelete').prop('disabled', checkedCount === 0);
    $('#btnEdit').prop('disabled', checkedCount !== 1);
    if (checkedCount === 1) {
        selectedStudentId = parseInt($('.student-checkbox:checked').val()) || 0;
    } else if (checkedCount === 0) {
        selectedStudentId = 0;
    }
}

function editSelected() {
    if (selectedStudentId > 0) {
        window.location.href = '/StudentInformation/StudentAdmission?id=' + selectedStudentId;
    }
}

function deleteSelected() {
    const selectedIds = [];
    $('.student-checkbox:checked').each(function () { selectedIds.push(parseInt($(this).val())); });
    if (selectedIds.length === 0) {
        Swal.fire('Info', 'Please select at least one student.', 'info');
        return;
    }
    Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete ${selectedIds.length} student record(s). This cannot be undone!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete!',
        customClass: { confirmButton: 'btn btn-danger me-2', cancelButton: 'btn btn-secondary' },
        buttonsStyling: false
    }).then(result => {
        if (!result.isConfirmed) return;
        $.ajax({
            url: '/StudentInformation/DeleteStudent',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(selectedIds),
            success(res) {
                if (res.success) {
                    Swal.fire('Deleted!', 'Student record(s) deleted successfully.', 'success')
                        .then(() => loadStudentListPartial(buildFilterQuery())); // stay on same filtered view
                } else {
                    Swal.fire('Error!', res.message || 'Failed to delete.', 'error');
                }
            },
            error() { Swal.fire('Error!', 'An unexpected error occurred.', 'error'); }
        });
    });
}

function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#tblStudents')) {
        $('#tblStudents').DataTable().button(index).trigger();
    } else {
        Swal.fire('Info', 'No data available to export.', 'info');
    }
}

function changePageSize(size) {
    document.getElementById('hdnPageIndex').value = 1;
    $('[name="pageSize"]').val(size);
    submitForm();
}

function clearSearch() {
    $('#txtSearchInput').val('');
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

// ── Filter apply / reset (AJAX — no full page reload) ─────────────────
function buildFilterQuery() {
    const form = document.getElementById('filterForm');
    return new URLSearchParams(new FormData(form)).toString();
}

function applyFilters() {
    document.getElementById('hdnPageIndex').value = 1;
    $('#btnFilterToggle').dropdown('hide');
    submitForm();
}

function submitForm() {
    syncAppliedFiltersFromForm();
    renderFilterBadges();
    const query = buildFilterQuery();
    history.replaceState(null, '', '/StudentInformation/Students?' + query);
    loadStudentListPartial(query);
}

function syncAppliedFiltersFromForm() {
    appliedFilters = {};

    const search = $('#txtSearchInput').val()?.trim();
    if (search) appliedFilters['search'] = { label: 'Search', text: search };

    const $class = $('#classSelect');
    if ($class.val()) appliedFilters['classId'] = { label: 'Class', text: $class.find('option:selected').text() };

    const $section = $('#sectionSelect');
    if ($section.val()) appliedFilters['sectionId'] = { label: 'Section', text: $section.find('option:selected').text() };
}

function renderFilterBadges() {
    $('#staticFilterBadges').hide(); // server-rendered badges only apply to the initial load

    const $wrap = $('#activeFilterBadges');
    const $container = $('#badgeContainer').empty();
    const keys = Object.keys(appliedFilters);

    if (keys.length === 0) { $wrap.hide(); return; }

    keys.forEach(key => {
        const f = appliedFilters[key];
        const $badge = $(`<span class="badge bg-primary-subtle text-primary border border-primary-subtle d-flex align-items-center gap-1 fw-medium px-2 py-1">
            ${f.label}: ${f.text}
            <a href="javascript:void(0)" class="text-primary ms-1"><i class="ti ti-x" style="font-size:10px"></i></a>
        </span>`);
        $badge.find('a').on('click', () => removeFilter(key));
        $container.append($badge);
    });
    $wrap.show();
}

function removeFilter(key) {
    if (key === 'search') $('#txtSearchInput').val('');
    if (key === 'classId') { $('#classSelect').val(''); $('#sectionSelect').empty().append('<option value="">All Sections</option>'); }
    if (key === 'sectionId') $('#sectionSelect').val('');
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

function resetAllFilters() {
    $('#txtSearchInput').val('');
    $('#classSelect').val('');
    $('#sectionSelect').empty().append('<option value="">All Sections</option>');
    document.getElementById('hdnPageIndex').value = 1;
    appliedFilters = {};
    submitForm();
}

// ── Partial reload ──────────────────────────────────────────────────
function loadStudentListPartial(queryString) {
    const container = document.getElementById('studentTableContainer');
    if (!container) return;
    container.style.opacity = '0.5';

    fetch(`/StudentInformation/GetStudentListTypePartial?${queryString}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => { if (!res.ok) throw new Error('Failed to load students'); return res.text(); })
        .then(html => {
            container.innerHTML = html;
            container.style.opacity = '1';
            initStudentTable();
            updateButtonState();
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            Swal.fire('Error!', 'Could not refresh the student list.', 'error');
        });
}

function initStudentTable() {
    if ($.fn.DataTable.isDataTable('#tblStudents')) {
        $('#tblStudents').DataTable().destroy();
    }
    var totalCols = (window.studentTableColCount || 9);
    var exportCols = [];
    var companyname = localStorage.getItem("comName");
    for (var i = 1; i < totalCols; i++) exportCols.push(i);

    $('#tblStudents').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Student  - ${companyname}`, exportOptions: { columns: exportCols } },
            { extend: 'csv', title: `Student  - ${companyname}`, exportOptions: { columns: exportCols } },
            { extend: 'excel', title: `Student  - ${companyname}`, exportOptions: { columns: exportCols } },
            { extend: 'pdf', title: `Student  - ${companyname}`, exportOptions: { columns: exportCols } },
            { extend: 'print', title: `Student  - ${companyname}`, exportOptions: { columns: exportCols } }
        ],
        searching: false, paging: false, info: false, ordering: false
    });
}

// ── Pagination clicks inside the partial ───────────────────────────────
document.addEventListener('click', function (e) {
    const link = e.target.closest('#studentTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;
    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;
    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('page') || 1;
    loadStudentListPartial(buildFilterQuery());
});

$(document).ready(function () {
    $('#btnFilterToggle').on('shown.bs.dropdown', function () {
        if (window.innerWidth <= 575) $('body').append('<div class="dropdown-backdrop"></div>');
    });
    $('#btnFilterToggle').on('hidden.bs.dropdown', function () { $('.dropdown-backdrop').remove(); });
    $(document).on('click', '.dropdown-backdrop', function () { $('#btnFilterToggle').dropdown('hide'); });

    initStudentTable();

    $('#list-view-btn').on('click', function (e) {
        e.preventDefault();
        $('#card-v').addClass('d-none'); $('#list-v').removeClass('d-none');
        $(this).addClass('active'); $('#card-view-btn').removeClass('active');
        $('#hdnViewType').val('list'); submitForm();
    });
    $('#card-view-btn').on('click', function (e) {
        e.preventDefault();
        $('#list-v').addClass('d-none'); $('#card-v').removeClass('d-none');
        $(this).addClass('active'); $('#list-view-btn').removeClass('active');
        $('#hdnViewType').val('card'); submitForm();
    });

    $('#txtSearchInput').on('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); clearTimeout(searchTimer); applyFilters(); }
    });
    $('#txtSearchInput').on('input', function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => applyFilters(), 500);
    });

    $('#classSelect').on('change', function () {
        const classId = $(this).val();
        const $sec = $('#sectionSelect');
        $sec.empty().append('<option value="">All Sections</option>');
        if (!classId) return;
        $.get('/StudentInformation/GetSections', { classId }, function (data) {
            $.each(data, function (_, item) { $sec.append(`<option value="${item.id}">${item.name}</option>`); });
        });
    });
});