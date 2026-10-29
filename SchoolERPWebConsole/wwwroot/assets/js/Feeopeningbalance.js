// ============================================================
// FeeOpeningBalance.js  --  Fee Opening Balance screen
// Endpoints used (FeeOpeningBalanceController):
//   GET  /FeeOpeningBalance/GetRows?studentId=
//   POST /FeeOpeningBalance/Save     (JSON body: { StudentId, Lines: [...] })
//   POST /FeeOpeningBalance/Delete   (JSON body: { StudentId })
// Reused endpoints:
//   /FeeReceipt/SearchMember                     (student search)
//   /FeeTemplate/GetFeeHeadDropdown              (fee head list, same call the Fee Receipt screen makes)
// ============================================================
(function () {
    'use strict';

    // Fee session order: April first
    const MONTHS = [
        { n: 4, name: 'April' }, { n: 5, name: 'May' }, { n: 6, name: 'June' },
        { n: 7, name: 'July' }, { n: 8, name: 'August' }, { n: 9, name: 'September' },
        { n: 10, name: 'October' }, { n: 11, name: 'November' }, { n: 12, name: 'December' },
        { n: 1, name: 'January' }, { n: 2, name: 'February' }, { n: 3, name: 'March' }
    ];

    const state = {
        studentId: null,
        rows: [],          // {openingBalanceId, monthNumber, feeHeadId, feeHeadName, drCr, amount}
        editIndex: -1,     // -1 = the entry row adds a new row
        mode: 'none',      // none | view | edit
        hasSaved: false    // the student already has rows stored in the database
    };

    const $id = (id) => document.getElementById(id);
    const money = (n) => (Number(n) || 0).toFixed(2);
    const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
    const g = (o, name) => (o == null ? undefined : (o[name] ?? o[name.charAt(0).toUpperCase() + name.slice(1)]));
    const monthName = (n) => (MONTHS.find(m => m.n === Number(n)) || {}).name || '';

    function toArray(v) {
        if (Array.isArray(v)) return v;
        if (v && Array.isArray(v.$values)) return v.$values;
        return [];
    }

    function escapeHtml(v) {
        return String(v ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    async function getJson(url) {
        const res = await fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        if (!res.ok) throw new Error('Server returned ' + res.status);
        return res.json();
    }

    async function postJson(url, body) {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error('Server returned ' + res.status);
        return res.json();
    }

    document.addEventListener('DOMContentLoaded', function () {
        $id('ddlObMonth').innerHTML = `<option value="">Select</option>` +
            MONTHS.map(m => `<option value="${m.n}">${m.name}</option>`).join('');

        loadFeeHeads();
        initStudentAutocomplete();

        $id('btnObAddRow').addEventListener('click', addOrUpdateRow);
        $id('btnObEdit').addEventListener('click', () => setMode('edit'));
        $id('btnObSave').addEventListener('click', saveAll);
        $id('btnObReset').addEventListener('click', resetChanges);
        $id('btnObDelete').addEventListener('click', deleteAll);
        $id('obBody').addEventListener('click', onGridClick);

        setMode('none');
        renderGrid();
    });

    // --------------------------------------------------------
    // Fee head dropdown (same endpoint the Fee Receipt screen uses)
    // --------------------------------------------------------
    async function loadFeeHeads() {
        const ddl = $id('ddlObHead');
        try {
            const result = await getJson('/FeeTemplate/GetFeeHeadDropdown?companyId=0&sessionId=0');
            const items = result.success ? toArray(result.data) : [];
            ddl.innerHTML = `<option value="">Select</option>` +
                items.map(o => `<option value="${escapeHtml(g(o, 'id'))}">${escapeHtml(g(o, 'name'))}</option>`).join('');
        } catch (err) {
            console.error('Fee head list error:', err);
        }
    }

    // --------------------------------------------------------
    // Student autocomplete (same endpoint as the other fee screens)
    // --------------------------------------------------------
    function initStudentAutocomplete() {
        const input = $id('txtStudentID');
        const list = $id('pinStudentSuggestions');
        if (!input || !list) return;

        let timer;
        let items = [];

        input.addEventListener('input', function () {
            const term = this.value.trim();
            clearTimeout(timer);
            if (term.length < 2) { hide(); return; }
            timer = setTimeout(() => search(term), 300);
        });

        document.addEventListener('click', function (e) {
            if (!input.contains(e.target) && !list.contains(e.target)) hide();
        });

        async function search(term) {
            try {
                const result = await getJson('/FeeReceipt/SearchMember?searchText=' + encodeURIComponent(term));
                items = result.success ? toArray(result.data) : [];
                if (items.length) render(); else hide();
            } catch (err) {
                console.error('SearchMember error:', err);
                hide();
            }
        }

        function render() {
            list.innerHTML = '';
            items.forEach((item, idx) => {
                const name = [item.firstName, item.middleName, item.lastName].filter(p => p && p.trim()).join(' ');
                const li = document.createElement('li');
                li.className = 'list-group-item list-group-item-action';
                li.style.cursor = 'pointer';
                li.innerHTML = `<strong>${escapeHtml(item.admissionNo ?? '-')}</strong> &nbsp;-&nbsp; ${escapeHtml(name || '-')}` +
                    (item.className ? ` <span class="text-muted small">(${escapeHtml(item.className)}${item.sectionName ? ' - ' + escapeHtml(item.sectionName) : ''})</span>` : '');
                li.addEventListener('click', () => { hide(); selectStudent(items[idx]); });
                list.appendChild(li);
            });
            list.style.display = 'block';
        }

        function hide() { list.style.display = 'none'; list.innerHTML = ''; }
    }

    async function selectStudent(item) {
        state.studentId = item.studentID;
        const name = [item.firstName, item.middleName, item.lastName].filter(p => p && p.trim()).join(' ');

        $id('txtStudentID').value = item.studentID ?? '';
        $id('lblAdmSession').textContent = item.admissionSession || '-';
        $id('lblName').textContent = name || '-';
        $id('lblGender').textContent = item.gender || '-';
        $id('lblFather').textContent = item.fatherName || '-';
        $id('lblMother').textContent = item.motherName || '-';
        $id('lblCourse').textContent = item.className || '-';
        $id('lblBranch').textContent = item.sectionName || '-';
        $id('lblAdmType').textContent = item.admissionType || '-';
        if (item.studentPhoto) $id('imgStudent').src = item.studentPhoto;

        await loadRows();
    }

    // --------------------------------------------------------
    // Load the student's saved rows
    // --------------------------------------------------------
    async function loadRows() {
        clearEntry();
        try {
            const result = await getJson('/FeeOpeningBalance/GetRows?studentId=' + encodeURIComponent(state.studentId));
            if (!result.success) throw new Error(result.message || 'Unable to load opening balance.');

            state.rows = toArray(result.data).map(r => ({
                openingBalanceId: Number(g(r, 'openingBalanceId')) || 0,
                monthNumber: Number(g(r, 'monthNumber')) || 0,
                feeHeadId: Number(g(r, 'feeHeadId')) || 0,
                feeHeadName: g(r, 'feeHeadName') ?? '',
                drCr: g(r, 'drCr') === 'Cr' ? 'Cr' : 'Dr',
                amount: Number(g(r, 'amount')) || 0
            }));
        } catch (err) {
            console.error('GetRows error:', err);
            state.rows = [];
            Swal.fire('Error!', err.message || 'Unable to load opening balance.', 'error');
        }

        state.hasSaved = state.rows.length > 0;
        // saved data opens read-only (Edit to change it); a student with nothing saved goes straight to entry
        setMode(state.hasSaved ? 'view' : 'edit');
        renderGrid();
    }

    // --------------------------------------------------------
    // Modes: none (no student) | view (saved data, locked) | edit
    // --------------------------------------------------------
    function setMode(mode) {
        state.mode = mode;
        const editing = mode === 'edit';

        $id('btnObEdit').disabled = !(mode === 'view');
        $id('btnObDelete').disabled = !(state.hasSaved && mode !== 'none');
        $id('btnObSave').disabled = !editing;
        $id('btnObReset').disabled = !editing;

        ['ddlObMonth', 'ddlObHead', 'ddlObDrCr', 'txtObAmount'].forEach(id => { $id(id).disabled = !editing; });

        const addBtn = $id('btnObAddRow');
        addBtn.style.pointerEvents = editing ? 'auto' : 'none';
        addBtn.style.opacity = editing ? '1' : '.4';

        renderGrid();
    }

    // --------------------------------------------------------
    // Entry row: add / update
    // --------------------------------------------------------
    function addOrUpdateRow() {
        if (state.mode !== 'edit') return;

        const monthNumber = parseInt($id('ddlObMonth').value || '0', 10);
        const feeHeadId = parseInt($id('ddlObHead').value || '0', 10);
        const drCr = $id('ddlObDrCr').value === 'Cr' ? 'Cr' : 'Dr';
        const amount = round2(parseFloat($id('txtObAmount').value));

        if (!monthNumber) { Swal.fire('Required', 'Please select the opening month.', 'warning'); return; }
        if (!feeHeadId) { Swal.fire('Required', 'Please select a fee head.', 'warning'); return; }
        if (!amount || amount <= 0) { Swal.fire('Required', 'Amount must be greater than 0.', 'warning'); return; }

        const duplicate = state.rows.some((r, i) =>
            i !== state.editIndex && r.monthNumber === monthNumber && r.feeHeadId === feeHeadId);
        if (duplicate) {
            Swal.fire('Duplicate', 'This fee head is already entered for that month.', 'warning');
            return;
        }

        const headName = $id('ddlObHead').selectedOptions[0]?.textContent?.trim() || '';

        if (state.editIndex >= 0) {
            const row = state.rows[state.editIndex];
            row.monthNumber = monthNumber;
            row.feeHeadId = feeHeadId;
            row.feeHeadName = headName;
            row.drCr = drCr;
            row.amount = amount;
        } else {
            state.rows.push({ openingBalanceId: 0, monthNumber, feeHeadId, feeHeadName: headName, drCr, amount });
        }

        clearEntry();
        renderGrid();
    }

    function clearEntry() {
        state.editIndex = -1;
        $id('ddlObMonth').value = '';
        $id('ddlObHead').value = '';
        $id('ddlObDrCr').value = 'Dr';
        $id('txtObAmount').value = '';
        $id('btnObAddRow').title = 'Add row';
        $id('btnObAddRow').className = 'ti ti-square-plus text-success';
    }

    // --------------------------------------------------------
    // Grid
    // --------------------------------------------------------
    function renderGrid() {
        const body = $id('obBody');
        const editing = state.mode === 'edit';

        if (!state.studentId) {
            body.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-3">Search and select a student</td></tr>`;
            updateTotals();
            return;
        }

        if (!state.rows.length) {
            body.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-3">No opening balance entered</td></tr>`;
            updateTotals();
            return;
        }

        body.innerHTML = state.rows.map((r, i) => `
            <tr class="${state.editIndex === i ? 'table-warning' : ''}">
                <td class="text-center">
                    ${editing ? `<i class="ti ti-edit text-primary" role="button" data-act="edit" data-idx="${i}" title="Edit"></i>` : ''}
                </td>
                <td>${i + 1}</td>
                <td>${escapeHtml(monthName(r.monthNumber))}</td>
                <td>${escapeHtml(r.feeHeadName)}</td>
                <td>${r.drCr === 'Cr' ? 'Credit' : 'Debit'}</td>
                <td class="text-end">${money(r.amount)}</td>
                <td class="text-center">
                    ${editing ? `<i class="ti ti-trash text-danger" role="button" data-act="del" data-idx="${i}" title="Delete row"></i>` : ''}
                </td>
            </tr>
        `).join('');

        updateTotals();
    }

    function onGridClick(e) {
        const el = e.target.closest('[data-act]');
        if (!el || state.mode !== 'edit') return;

        const idx = parseInt(el.dataset.idx, 10);
        const row = state.rows[idx];
        if (!row) return;

        if (el.dataset.act === 'edit') {
            state.editIndex = idx;
            $id('ddlObMonth').value = String(row.monthNumber);
            $id('ddlObHead').value = String(row.feeHeadId);
            $id('ddlObDrCr').value = row.drCr;
            $id('txtObAmount').value = money(row.amount);
            $id('btnObAddRow').title = 'Update row';
            $id('btnObAddRow').className = 'ti ti-device-floppy text-primary';
            renderGrid();
        } else if (el.dataset.act === 'del') {
            state.rows.splice(idx, 1);
            if (state.editIndex === idx) clearEntry();
            else if (state.editIndex > idx) state.editIndex--;
            renderGrid();
        }
    }

    function updateTotals() {
        const debit = state.rows.filter(r => r.drCr === 'Dr').reduce((a, r) => a + r.amount, 0);
        const credit = state.rows.filter(r => r.drCr === 'Cr').reduce((a, r) => a + r.amount, 0);
        $id('footDebit').textContent = money(debit);
        $id('footCredit').textContent = money(credit);
        $id('footNet').textContent = money(debit - credit);
    }

    // --------------------------------------------------------
    // Save the whole grid
    // --------------------------------------------------------
    async function saveAll() {
        if (!state.studentId) {
            Swal.fire('Select student', 'Please search and select a student first.', 'info');
            return;
        }
        if (!state.rows.length && !state.hasSaved) {
            Swal.fire('Nothing to save', 'Add at least one opening balance row.', 'info');
            return;
        }
        if (!state.rows.length && state.hasSaved) {
            const ok = await Swal.fire({
                icon: 'warning', title: 'Clear opening balance?',
                text: 'All rows were removed. Saving will delete this student\'s opening balance.',
                showCancelButton: true, confirmButtonText: 'Yes, save'
            });
            if (!ok.isConfirmed) return;
        }

        const btn = $id('btnObSave');
        btn.disabled = true;

        try {
            const result = await postJson('/FeeOpeningBalance/Save', {
                StudentId: state.studentId,
                Lines: state.rows.map(r => ({
                    OpeningBalanceId: r.openingBalanceId,
                    MonthNumber: r.monthNumber,
                    FeeHeadId: r.feeHeadId,
                    DrCr: r.drCr,
                    Amount: r.amount
                }))
            });

            if (!result.success) {
                Swal.fire('Error!', result.message || 'Unable to save opening balance.', 'error');
                return;
            }

            await Swal.fire({ icon: 'success', title: 'Saved', text: result.message || 'Opening balance saved.' });
            await loadRows();
        } catch (err) {
            console.error('Save opening balance error:', err);
            Swal.fire('Error!', 'An unexpected error occurred while saving.', 'error');
        } finally {
            btn.disabled = state.mode !== 'edit';
        }
    }

    // --------------------------------------------------------
    // Reset = throw away unsaved changes
    // --------------------------------------------------------
    async function resetChanges() {
        if (!state.studentId) return;
        await loadRows();
    }

    // --------------------------------------------------------
    // Delete everything stored for the student
    // --------------------------------------------------------
    async function deleteAll() {
        if (!state.studentId || !state.hasSaved) return;

        const ok = await Swal.fire({
            icon: 'warning', title: 'Delete opening balance?',
            text: 'All opening balance rows of this student will be deleted.',
            showCancelButton: true, confirmButtonText: 'Yes, delete', confirmButtonColor: '#dc3545'
        });
        if (!ok.isConfirmed) return;

        try {
            const result = await postJson('/FeeOpeningBalance/Delete', { StudentId: state.studentId });
            if (!result.success) {
                Swal.fire('Error!', result.message || 'Unable to delete opening balance.', 'error');
                return;
            }
            await Swal.fire({ icon: 'success', title: 'Deleted', text: result.message || 'Opening balance deleted.' });
            await loadRows();
        } catch (err) {
            console.error('Delete opening balance error:', err);
            Swal.fire('Error!', 'An unexpected error occurred while deleting.', 'error');
        }
    }
})();