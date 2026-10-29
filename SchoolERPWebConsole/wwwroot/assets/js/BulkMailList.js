// =====================================================================
// BulkMailList.js - Send Email (select across pages, filters, send)
// =====================================================================

// ── State ────────────────────────────────────────────────────────────
let searchTimer;
let appliedFilters = {};   // { key: { label, text } } drives the filter badges

// Selection works across pages:
//   all=false -> ids      = students ticked one by one
//   all=true  -> excluded = students un-ticked after Select All
const sel = { all: false, ids: new Set(), excluded: new Set() };

// ── Helpers ──────────────────────────────────────────────────────────
function buildFilterQuery() {
    const form = document.getElementById('filterForm');
    return new URLSearchParams(new FormData(form)).toString();
}

function setPageIndex(v) {
    const el = document.getElementById('hdnPageIndex');
    if (el) el.value = v;
}

// Total records of the CURRENT filter (all pages).
function totalRecords() {
    // 1) preferred: <div id="tblMeta" data-total="@Model.TotalRecords"> inside the partial
    const meta = document.getElementById('tblMeta');
    if (meta) {
        const n = parseInt(meta.getAttribute('data-total'), 10);
        if (!isNaN(n) && n > 0) return n;
    }
    // 2) fallback: "Records: 1 to 10 of 50" text rendered by the partial
    const txt = (document.getElementById('studentTableContainer')?.innerText) || '';
    const m = txt.match(/Records:\s*\d+\s*to\s*\d+\s*of\s*(\d+)/i);
    if (m) return parseInt(m[1], 10);
    // 3) last resort: rows visible on this page
    return document.querySelectorAll('.student-checkbox').length;
}

function selectedCount() {
    return sel.all
        ? Math.max(0, totalRecords() - sel.excluded.size)
        : sel.ids.size;
}

// ── Selection UI ─────────────────────────────────────────────────────
function refreshSelectionUI() {
    const total = totalRecords();
    const count = selectedCount();
    if (count > 0) $('#selectionError').addClass('d-none');
    $('#selectedCount').text(`${count} selected`);
    $('#btnSend').prop('disabled', count === 0);

    const master = document.getElementById('chkSelectAll');
    if (master) {
        const allChecked = sel.all ? sel.excluded.size === 0 : (total > 0 && sel.ids.size >= total);
        const someChecked = !allChecked && count > 0;
        master.checked = allChecked;
        master.indeterminate = someChecked;
    }
}

function resetSelection() {
    sel.all = false;
    sel.ids.clear();
    sel.excluded.clear();
    $('.student-checkbox').prop('checked', false);
    refreshSelectionUI();
}

// Re-tick the visible rows after every partial reload / page change
function restoreSelection() {
    $('.student-checkbox').each(function () {
        const id = parseInt(this.value, 10);
        this.checked = sel.all ? !sel.excluded.has(id) : sel.ids.has(id);
    });
    refreshSelectionUI();
}

// One row ticked / unticked
$(document).on('change', '.student-checkbox', function () {
    const id = parseInt(this.value, 10);
    if (isNaN(id)) return;

    if (sel.all) {
        this.checked ? sel.excluded.delete(id) : sel.excluded.add(id);
    } else {
        this.checked ? sel.ids.add(id) : sel.ids.delete(id);
    }
    refreshSelectionUI();
});

// Select All = every record of the current filter, on all pages
$(document).on('change', '#chkSelectAll', function () {
    sel.ids.clear();
    sel.excluded.clear();
    sel.all = this.checked;
    $('.student-checkbox').prop('checked', this.checked);
    refreshSelectionUI();
});

// Row click toggles the checkbox (ignored when the click was on the checkbox/link itself)
function selectStudent(id, element) {
    const cb = $(element).find('.student-checkbox')[0];
    if (!cb) return;
    const t = window.event && window.event.target;
    if (t && t.closest && t.closest('input, a, button, label')) return;
    cb.checked = !cb.checked;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
}

// Old calls still work
function toggleSelectAll(master) {
    $('#chkSelectAll').prop('checked', master.checked).trigger('change');
}
function updateButtonState() { refreshSelectionUI(); }

// ── Export / paging / search helpers ─────────────────────────────────
function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#tblStudents')) {
        $('#tblStudents').DataTable().button(index).trigger();
    } else {
        Swal.fire('Info', 'No data available to export.', 'info');
    }
}

function changePageSize(size) {
    setPageIndex(1);
    $('[name="pageSize"]').val(size);
    submitForm();
}

function clearSearch() {
    $('#txtSearchInput').val('');
    setPageIndex(1);
    submitForm();
}

// ── Filter apply / reset (AJAX - no full page reload) ────────────────
function applyFilters() {
    setPageIndex(1);
    $('#btnFilterToggle').dropdown('hide');
    submitForm();
}

function submitForm() {
    resetSelection();                 // new filter = new result set
    syncAppliedFiltersFromForm();
    renderFilterBadges();
    const query = buildFilterQuery();
    history.replaceState(null, '', '/StudentInformation/BulkMail?' + query);
    loadStudentListPartial(query);
}

function syncAppliedFiltersFromForm() {
    appliedFilters = {};

    const search = ($('#txtSearchInput').val() || '').trim();
    if (search) appliedFilters['search'] = { label: 'Search', text: search };

    const $class = $('#classSelect');
    if ($class.val()) appliedFilters['classId'] = { label: 'Class', text: $class.find('option:selected').text() };

    const $section = $('#sectionSelect');
    if ($section.val()) appliedFilters['sectionId'] = { label: 'Section', text: $section.find('option:selected').text() };
}

function renderFilterBadges() {
    $('#staticFilterBadges').hide();   // server-rendered badges only apply to the first load

    const $wrap = $('#activeFilterBadges');
    const $container = $('#badgeContainer').empty();
    const keys = Object.keys(appliedFilters);

    if (keys.length === 0) { $wrap.hide(); return; }

    keys.forEach(key => {
        const f = appliedFilters[key];
        const $badge = $('<span class="badge bg-primary-subtle text-primary border border-primary-subtle d-flex align-items-center gap-1 fw-medium px-2 py-1"></span>');
        $badge.append(document.createTextNode(`${f.label}: ${f.text} `));   // text node => no HTML injection
        const $x = $('<a href="javascript:void(0)" class="text-primary ms-1"><i class="ti ti-x" style="font-size:10px"></i></a>');
        $x.on('click', () => removeFilter(key));
        $badge.append($x);
        $container.append($badge);
    });
    $wrap.show();
}

function removeFilter(key) {
    if (key === 'search') $('#txtSearchInput').val('');
    if (key === 'classId') {
        $('#classSelect').val('').trigger('change.select2');
        $('#sectionSelect').empty().append('<option value="">All Sections</option>');
    }
    if (key === 'sectionId') $('#sectionSelect').val('');
    setPageIndex(1);
    submitForm();
}

function resetAllFilters() {
    $('#txtSearchInput').val('');
    $('#classSelect').val('').trigger('change.select2');
    $('#sectionSelect').empty().append('<option value="">All Sections</option>');
    setPageIndex(1);
    appliedFilters = {};
    submitForm();
}

// ── Partial reload ───────────────────────────────────────────────────
function loadStudentListPartial(queryString) {
    const container = document.getElementById('studentTableContainer');
    if (!container) return;
    container.style.opacity = '0.5';

    fetch(`/StudentInformation/GetBulkMailPartial?${queryString}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => { if (!res.ok) throw new Error('Failed to load students'); return res.text(); })
        .then(html => {
            container.innerHTML = html;
            container.style.opacity = '1';
            initStudentTable();
            restoreSelection();       // re-ticks rows + refreshes count / Send button
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            Swal.fire('Error!', 'Could not refresh the student list.', 'error');
        });
}

function initStudentTable() {
    if (!$.fn.DataTable) return;
    if ($.fn.DataTable.isDataTable('#tblStudents')) {
        $('#tblStudents').DataTable().destroy();
    }
    if (!document.getElementById('tblStudents')) return;

    const totalCols = (window.studentTableColCount || 9);
    const exportCols = [];
    const companyname = localStorage.getItem('comName') || '';
    for (let i = 1; i < totalCols; i++) exportCols.push(i);

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

// ── Pagination clicks inside the partial (single handler) ────────────
document.addEventListener('click', function (e) {
    const link = e.target.closest('#studentTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;
    e.preventDefault();

    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    setPageIndex(new URLSearchParams(query).get('page') || 1);
    loadStudentListPartial(buildFilterQuery());   // keeps selection (no resetSelection here)
});

// ── Send ─────────────────────────────────────────────────────────────
async function sendBulkMail() {
    if (!validateBulkMailForm()) return;

    const messageTo = $('#ddlMessageTo').val();
    const templateId = parseInt($('#ddlTemplate').val(), 10) || 0;
    const count = selectedCount();

    const confirm = await Swal.fire({
        icon: 'question',
        title: 'Send email?',
        text: `This will send an email to ${count} recipient(s).`,
        showCancelButton: true,
        confirmButtonText: 'Yes, Send'
    });
    if (!confirm.isConfirmed) return;

    const payload = {
        selectAll: sel.all,
        studentIds: sel.all ? [] : Array.from(sel.ids),
        excludedIds: sel.all ? Array.from(sel.excluded) : [],
        search: ($('#txtSearchInput').val() || '').trim(),
        classId: parseInt($('#classSelect').val(), 10) || null,
        sectionId: parseInt($('#sectionSelect').val(), 10) || null,
        messageTo: messageTo,
        emailTemplateId: templateId
    };

    $('#btnSend').prop('disabled', true);
    try {
        const r = await fetch('/StudentInformation/SendBulkMail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!r.ok) throw new Error(r.status);
        const res = await r.json();

        if (res.success) {
            await Swal.fire('Sent!', res.message || 'Email sent successfully.', 'success');
            resetSelection();
            if (res.batchId) watchBatch(res.batchId, res.queued);   // optional live progress
        } else {
            Swal.fire('Error', res.message || 'Failed to send email.', 'error');
            refreshSelectionUI();
        }
    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'An unexpected error occurred.', 'error');
        refreshSelectionUI();
    }
}

let batchTimer = null;

function watchBatch(batchId, queued) {
    clearInterval(batchTimer);

    const tick = async () => {
        try {
            const r = await fetch(`/StudentInformation/BatchStatus?batchId=${encodeURIComponent(batchId)}`);
            if (!r.ok) return;
            const s = await r.json();

            const done = (s.sent ?? s.Sent ?? 0) + (s.failed ?? s.Failed ?? 0);
            const total = s.total ?? s.Total ?? queued;
            const failed = s.failed ?? s.Failed ?? 0;

            $('#selectedCount').text(`Sending: ${done} / ${total}` + (failed ? ` (${failed} failed)` : ''));

            if (done >= total) {
                clearInterval(batchTimer);
                $('#selectedCount').text(
                    failed ? `Done: ${total - failed} sent, ${failed} failed`
                        : `Done: all ${total} sent`);
                setTimeout(refreshSelectionUI, 6000);   // back to "0 selected"
            }
        } catch (e) { console.error(e); }
    };

    tick();
    batchTimer = setInterval(tick, 3000);
}

// ── Init ─────────────────────────────────────────────────────────────
$(document).ready(function () {
    // mobile filter dropdown backdrop
    $('#btnFilterToggle').on('shown.bs.dropdown', function () {
        if (window.innerWidth <= 575) $('body').append('<div class="dropdown-backdrop"></div>');
    });
    $('#btnFilterToggle').on('hidden.bs.dropdown', function () { $('.dropdown-backdrop').remove(); });
    $(document).on('click', '.dropdown-backdrop', function () { $('#btnFilterToggle').dropdown('hide'); });

    initStudentTable();

    // list / card view toggle
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

    // search
    $('#txtSearchInput').on('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); clearTimeout(searchTimer); applyFilters(); }
    });
    $('#txtSearchInput').on('input', function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => applyFilters(), 500);
    });

    // class -> sections
    $('#classSelect').on('change', function () {
        const classId = $(this).val();
        const $sec = $('#sectionSelect');
        $sec.empty().append('<option value="">All Sections</option>');
        if (!classId) return;
        $.get('/StudentInformation/GetSections', { classId }, function (data) {
            $.each(data, function (_, item) {
                $sec.append($('<option></option>').val(item.id).text(item.name));
            });
        });
    });

    // initial state (also syncs Select All / count / Send button)
    restoreSelection();
});

// ── Inline validation helpers ────────────────────────────────────────
function setFieldError(inputId, errorId, message) {
    $('#' + inputId).addClass('is-invalid');
    const $err = $('#' + errorId);
    if (message) $err.text(message);
    $err.removeClass('d-none');
}

function clearFieldError(inputId, errorId) {
    $('#' + inputId).removeClass('is-invalid');
    $('#' + errorId).addClass('d-none');
}

function validateBulkMailForm() {
    let valid = true;

    clearFieldError('ddlMessageTo', 'messageToError');
    clearFieldError('ddlTemplate', 'templateError');
    $('#selectionError').addClass('d-none');

    if (!$('#ddlMessageTo').val()) {
        setFieldError('ddlMessageTo', 'messageToError', 'Message To is required.');
        valid = false;
    }
    if (!$('#ddlTemplate').val()) {
        setFieldError('ddlTemplate', 'templateError', 'Notification Type is required.');
        valid = false;
    }
    if (selectedCount() === 0) {
        $('#selectionError').removeClass('d-none');
        valid = false;
    }

    if (!valid) {
        // focus the first invalid dropdown
        const $first = $('#ddlMessageTo.is-invalid, #ddlTemplate.is-invalid').first();
        if ($first.length) $first.trigger('focus');
    }
    return valid;
}

