// ========================================
// Staff Directory — AJAX search / filter / pagination
// Mirrors the loadLeavePartial() pattern used elsewhere in the app.
// ========================================
const DisableStaffs = (function () {

    let state = {
        viewType: 'list',
        search: '',
        roleId: null,
        deptId: null,
        desigId: null,
        page: 1
    };
    let selectedStaffIds = [];
    let searchDebounce;

    // ── Public init — called once from the view with server-rendered initial state ──
    function init(opts) {
        state.viewType = opts.initialViewType || 'list';
        state.search = opts.initialSearch || '';
        state.roleId = opts.initialRoleId || null;
        state.deptId = opts.initialDeptId || null;
        state.desigId = opts.initialDesigId || null;
        state.page = opts.initialPage || 1;

        $('.select2').select2({ width: '100%' });

        bindStaticHandlers();
        bindContainerHandlers(); // for the server-rendered initial partial
        renderActiveFilterBadges();
    }

    // ── Handlers that live outside #staffContainer and never get replaced ──
    function bindStaticHandlers() {
        $('#txtSearch').on('keyup', function (e) {
            clearTimeout(searchDebounce);
            const val = $(this).val();
            if (e.which === 13) {
                state.search = val;
                state.page = 1;
                loadPartial();
                return;
            }
            searchDebounce = setTimeout(() => {
                state.search = val;
                state.page = 1;
                loadPartial();
            }, 350);
        });

        $('#btnApplyFilters').on('click', function () {
            state.roleId = $('#fltRole').val() || null;
            state.deptId = $('#fltDept').val() || null;
            state.desigId = $('#fltDesig').val() || null;
            state.page = 1;
            loadPartial();
        });
    }

    // ── Handlers that live INSIDE #staffContainer — must be rebound after every AJAX swap ──
    function bindContainerHandlers() {
        // Row click (list view) — ignore clicks on the checkbox itself
        $(document).off('click', '.staff-item-row').on('click', '.staff-item-row', function (e) {
            if ($(e.target).is('.staff-checkbox') || $(e.target).closest('.staff-checkbox').length) return;
            const checkbox = $(this).find('.staff-checkbox');
            checkbox.prop('checked', !checkbox.prop('checked'));
            refreshSelection();
        });

        $(document).off('change', '.staff-checkbox').on('change', '.staff-checkbox', function () {
            $(this).closest('tr').toggleClass('table-active', this.checked);
            refreshSelection();
        });

        // Card view
        $(document).off('click', '.staff-card').on('click', '.staff-card', function (e) {
            if ($(e.target).is('.student-checkbox') || $(e.target).closest('.student-checkbox').length) return;
            const checkbox = $(this).find('.student-checkbox');
            checkbox.prop('checked', !checkbox.prop('checked'));
            refreshSelection();
        });

        $(document).off('change', '.student-checkbox').on('change', '.student-checkbox', function () {
            $(this).closest('.staff-card').toggleClass('border-primary', this.checked);
            refreshSelection();
        });

        initDataTable();
    }

    function initDataTable() {
        if ($.fn.DataTable.isDataTable('#staffTable')) {
            $('#staffTable').DataTable().destroy();
        }
        if (!document.getElementById('staffTable')) return;

        window.staffDataTable = $('#staffTable').DataTable({
            dom: 'Bfrtip',
            buttons: [
                { extend: 'copy', exportOptions: { columns: ':not(:first-child)' } },
                { extend: 'csv', exportOptions: { columns: ':not(:first-child)' } },
                { extend: 'excel', exportOptions: { columns: ':not(:first-child)' } },
                { extend: 'pdf', exportOptions: { columns: ':not(:first-child)' } },
                { extend: 'print', exportOptions: { columns: ':not(:first-child)' } }
            ],
            searching: false,   // search is server-side via loadPartial(), not client-side
            paging: false,      // paging is server-side via the pagination nav in the partial
            info: false,
            language: {
                emptyTable: "No staff records found.",
                zeroRecords: "No staff records found."
            }
        });
    }

    // ── Core AJAX call — mirrors loadLeavePartial() ──
    function loadPartial() {
        const $container = $('#staffContainer');
        $container.css('opacity', '0.5');

        const params = new URLSearchParams();
        if (state.search) params.set('SearchKeyword', state.search);
        if (state.roleId) params.set('RoleID', state.roleId);
        if (state.deptId) params.set('DepartmentID', state.deptId);
        if (state.desigId) params.set('DesignationID', state.desigId);
        params.set('viewType', state.viewType);
        params.set('PageNumber', state.page);
        params.set('PageSize', 10);

        fetch(`/HumanResource/GetDisableStaffPartial?${params.toString()}`, {
            method: 'GET',
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
            .then(res => {
                if (!res.ok) throw new Error('Failed to load staff list');
                return res.text();
            })
            .then(html => {
                $container.html(html);
                $container.css('opacity', '1');
                selectedStaffIds = [];
                refreshSelection();
                bindContainerHandlers();
                renderActiveFilterBadges();
            })
            .catch(err => {
                console.error(err);
                $container.css('opacity', '1');
                if (window.Swal) {
                    // Swal.fire('Error!', 'Could not refresh the staff list.', 'error');
                } else {
                    // alert('Could not refresh the staff list.');
                }
            });
    }

    // ── Pagination — called from onclick in the partial's <a> tags ──
    function goToStaffPage(page) {
        if (page < 1) return;
        state.page = page;
        loadPartial();
    }

    // ── View switch ──
    function switchView(view) {
        state.viewType = view;
        $('#hdnViewType').val(view);

        if (view === 'list') {
            $('#btn-list-view').addClass('btn-primary').removeClass('btn-white border');
            $('#btn-card-view').removeClass('btn-primary').addClass('btn-white border');
        } else {
            $('#btn-card-view').addClass('btn-primary').removeClass('btn-white border');
            $('#btn-list-view').removeClass('btn-primary').addClass('btn-white border');
        }

        loadPartial();
    }

    // ── Selection ──
    function refreshSelection() {
        selectedStaffIds = $('.staff-checkbox:checked, .student-checkbox:checked')
            .map(function () { return parseInt($(this).val()); })
            .get();

        const count = selectedStaffIds.length;
        $('#btnTopEdit').prop('disabled', count !== 1);
        $('#btnTopDelete').prop('disabled', count === 0);
    }

    // ── Export (client-side DataTable buttons on the currently loaded page only) ──
    function triggerExport(index) {
        if ($.fn.DataTable.isDataTable('#staffTable')) {
            $('#staffTable').DataTable().button(index).trigger();
        }
    }

    // ── Filter badges ──
    function renderActiveFilterBadges() {
        const filters = [
            { key: 'roleId', selectId: 'fltRole', label: 'Role' },
            { key: 'deptId', selectId: 'fltDept', label: 'Department' },
            { key: 'desigId', selectId: 'fltDesig', label: 'Designation' }
        ];

        const container = $('#badgeContainer');
        container.empty();
        let hasActive = false;

        filters.forEach(f => {
            const val = state[f.key];
            if (val) {
                hasActive = true;
                const text = $('#' + f.selectId + ' option:selected').text() || val;
                container.append(`
                    <span class="badge bg-light text-dark border d-inline-flex align-items-center gap-1">
                        ${f.label}: ${text}
                        <i class="ti ti-x fs-11" style="cursor:pointer;" onclick="DisableStaffs.clearFilter('${f.key}')"></i>
                    </span>
                `);
            }
        });

        if (state.search) {
            hasActive = true;
            container.append(`
                <span class="badge bg-light text-dark border d-inline-flex align-items-center gap-1">
                    Search: ${state.search}
                    <i class="ti ti-x fs-11" style="cursor:pointer;" onclick="DisableStaffs.clearFilter('search')"></i>
                </span>
            `);
        }

        $('#activeFilterBadges').toggle(hasActive);
    }

    function clearFilter(key) {
        state[key] = null;
        state.page = 1;

        if (key === 'search') {
            $('#txtSearch').val('');
        } else {
            const selectMap = { roleId: '#fltRole', deptId: '#fltDept', desigId: '#fltDesig' };
            $(selectMap[key]).val('').trigger('change');
        }
        loadPartial();
    }

    function resetAllFilters() {
        state.search = '';
        state.roleId = null;
        state.deptId = null;
        state.desigId = null;
        state.page = 1;

        $('#txtSearch').val('');
        $('#fltRole, #fltDept, #fltDesig').val('').trigger('change');
        loadPartial();
    }

    // ── Public API ──
    return {
        init,
        goToStaffPage,
        switchView,        
        triggerExport,
        clearFilter,
        resetAllFilters
    };
})();

// Expose the functions the Razor views call inline (onclick="...") at global scope
function goToStaffPage(page) { DisableStaffs.goToStaffPage(page); }
function switchView(view) { DisableStaffs.switchView(view); }
function triggerExport(index) { DisableStaffs.triggerExport(index); }
function resetAllFilters() { DisableStaffs.resetAllFilters(); }