// ============================================================
// FeeDiscount.js  --  Fee Discount screen
// Endpoints used (FeeDiscountController):
//   GET  /FeeDiscount/GetConcessions
//   GET  /FeeDiscount/GetDiscountByUsers
//   GET  /FeeDiscount/GetRows?studentId=
//   GET  /FeeDiscount/GetHeader?studentId=&feeHeadId=
//   POST /FeeDiscount/Save            (multipart/form-data)
// Student search reuses /FeeReceipt/SearchMember.
// ============================================================
(function () {
    'use strict';

    const state = {
        studentId: null,
        rows: []          // every fee line of the student: {mapStudentsFeeId, detailId, feeTemplateId, installmentLabel,
        //   installmentSno, feeHeadId, feeHeadName, actualAmount, savedDiscount, isPaid, discount}
    };

    const $id = (id) => document.getElementById(id);
    const money = (n) => (Number(n) || 0).toFixed(2);
    const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
    const g = (o, name) => (o == null ? undefined : (o[name] ?? o[name.charAt(0).toUpperCase() + name.slice(1)]));

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

    document.addEventListener('DOMContentLoaded', function () {
        initStudentAutocomplete();
        loadDropdown('/FeeDiscount/GetConcessions', 'ddlConcession', '--Select--');
        loadDropdown('/FeeDiscount/GetDiscountByUsers', 'ddlDiscountBy', 'Select');

        $id('ddlHead').addEventListener('change', onHeadChanged);
        $id('ddlFromInst').addEventListener('change', recalc);
        $id('ddlDiscType').addEventListener('change', recalc);
        $id('txtDiscValue').addEventListener('input', recalc);
        $id('btnSaveDiscount').addEventListener('click', saveDiscount);
        $id('btnClearDiscount').addEventListener('click', clearAll);
        $id('discBody').addEventListener('input', onGridInput);
    });

    // --------------------------------------------------------
    // Simple id/name dropdowns
    // --------------------------------------------------------
    async function loadDropdown(url, selectId, placeholder) {
        const ddl = $id(selectId);
        if (!ddl) return;
        try {
            const result = await getJson(url);
            const items = result.success ? toArray(result.data) : [];
            ddl.innerHTML = `<option value="">${placeholder}</option>` +
                items.map(o => `<option value="${escapeHtml(g(o, 'id'))}">${escapeHtml(g(o, 'name'))}</option>`).join('');
        } catch (err) {
            console.error('Dropdown error (' + url + '):', err);
        }
    }

    // --------------------------------------------------------
    // Student autocomplete (same endpoint as the Fee Receipt screen)
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
        clearForm();

        state.studentId = item.studentID;
        const name = [item.firstName, item.middleName, item.lastName].filter(p => p && p.trim()).join(' ');

        $id('txtStudentID').value = item.studentID ?? '';
        $id('txtSrCode').value = item.srCode ?? item.houseNo ?? item.admissionNo ?? '';
        $id('lblClass').textContent = item.className ? item.className + (item.sectionName ? ' (' + item.sectionName + ')' : '') : '-';
        $id('lblName').textContent = name || '-';
        $id('lblGender').textContent = item.gender || '-';
        $id('lblAdmType').textContent = item.admissionType || '-';
        $id('lblFather').textContent = item.fatherName || '-';
        $id('lblMother').textContent = item.motherName || '-';
        if (item.studentPhoto) $id('imgStudent').src = item.studentPhoto;

        await loadRows();
    }

    // --------------------------------------------------------
    // Load the student's fee lines, fill the Concession Head dropdown
    // --------------------------------------------------------
    async function loadRows() {
        const body = $id('discBody');
        body.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">Loading...</td></tr>`;

        try {
            const result = await getJson('/FeeDiscount/GetRows?studentId=' + encodeURIComponent(state.studentId));
            if (!result.success) throw new Error(result.message || 'Unable to load fee details.');

            state.rows = toArray(result.data).map(r => ({
                mapStudentsFeeId: g(r, 'mapStudentsFeeId'),
                detailId: g(r, 'detailId'),
                feeTemplateId: g(r, 'feeTemplateId'),
                installmentLabel: g(r, 'installmentLabel') ?? '',
                installmentSno: Number(g(r, 'installmentSno')) || 0,
                feeHeadId: g(r, 'feeHeadId'),
                feeHeadName: g(r, 'feeHeadName') ?? '',
                actualAmount: Number(g(r, 'actualAmount')) || 0,
                savedDiscount: Number(g(r, 'savedDiscount')) || 0,
                isPaid: !!g(r, 'isPaid'),
                discount: 0
            }));

            // distinct heads
            const heads = [];
            state.rows.forEach(r => {
                if (!heads.some(h => String(h.id) === String(r.feeHeadId))) heads.push({ id: r.feeHeadId, name: r.feeHeadName });
            });

            $id('ddlHead').innerHTML = `<option value="">--Select--</option>` +
                heads.map(h => `<option value="${escapeHtml(h.id)}">${escapeHtml(h.name)}</option>`).join('');

            // one head only? pick it straight away
            if (heads.length === 1) {
                $id('ddlHead').value = String(heads[0].id);
                await onHeadChanged();
            } else {
                renderGrid();
            }
        } catch (err) {
            console.error('GetRows error:', err);
            body.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-3">Unable to load fee details</td></tr>`;
        }
    }

    function visibleRows() {
        const headId = $id('ddlHead').value;
        if (!headId) return [];
        return state.rows.filter(r => String(r.feeHeadId) === String(headId));
    }

    // --------------------------------------------------------
    // Head picked: rebuild "From Month/Inst.", load any saved discount for it
    // --------------------------------------------------------
    async function onHeadChanged() {
        const rows = visibleRows();

        $id('ddlFromInst').innerHTML = rows.map(r =>
            `<option value="${escapeHtml(r.feeTemplateId)}" data-sno="${r.installmentSno}">${escapeHtml(r.installmentLabel)}</option>`
        ).join('') || `<option value="">--Select--</option>`;

        setAttachment(null);

        let saved = null;
        if (state.studentId && $id('ddlHead').value) {
            try {
                const result = await getJson('/FeeDiscount/GetHeader?studentId=' + encodeURIComponent(state.studentId) +
                    '&feeHeadId=' + encodeURIComponent($id('ddlHead').value));
                saved = result.success ? (Array.isArray(result.data) ? result.data[0] : result.data) : null;
            } catch (err) {
                console.error('GetHeader error:', err);
            }
        }

        if (saved && g(saved, 'discountId')) {
            $id('ddlConcession').value = String(g(saved, 'concessionId') ?? '');
            if (g(saved, 'fromTemplateId')) $id('ddlFromInst').value = String(g(saved, 'fromTemplateId'));
            $id('ddlDiscType').value = g(saved, 'discountType') || 'P';
            $id('txtDiscValue').value = money(g(saved, 'discountValue'));
            $id('ddlDiscountBy').value = String(g(saved, 'discountByUserId') ?? '');
            $id('txtRemark').value = g(saved, 'remark') ?? '';
            setAttachment(g(saved, 'attachmentPath'));

            // show what is stored, exactly as saved
            rows.forEach(r => { r.discount = r.savedDiscount; });
            renderGrid();
        } else {
            recalc();
        }
    }

    // --------------------------------------------------------
    // Work out each line's discount from Type / Value / From-installment
    // --------------------------------------------------------
    function recalc() {
        const rows = visibleRows();
        const type = $id('ddlDiscType').value;
        const value = Math.max(0, parseFloat($id('txtDiscValue').value) || 0);
        const fromOpt = $id('ddlFromInst').selectedOptions[0];
        const fromSno = fromOpt ? (parseInt(fromOpt.dataset.sno || '0', 10) || 0) : 0;

        rows.forEach(r => {
            if (r.isPaid) { r.discount = r.savedDiscount; return; }     // paid lines never change
            if (r.installmentSno < fromSno) { r.discount = 0; return; }
            r.discount = type === 'P'
                ? round2(r.actualAmount * Math.min(value, 100) / 100)
                : Math.min(value, r.actualAmount);
        });

        renderGrid();
    }

    // --------------------------------------------------------
    // Grid
    // --------------------------------------------------------
    function renderGrid() {
        const body = $id('discBody');
        const rows = visibleRows();

        if (!rows.length) {
            body.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">${state.rows.length ? 'Select a concession head' : 'No fee lines found'}</td></tr>`;
            updateTotals();
            return;
        }

        body.innerHTML = rows.map((r, i) => `
            <tr class="${r.isPaid ? 'row-paid' : ''}">
                <td>${i + 1}</td>
                <td>${escapeHtml(r.installmentLabel)}</td>
                <td>${escapeHtml(r.feeHeadName)}${r.isPaid ? ' <span class="badge bg-success ms-1">Paid</span>' : ''}</td>
                <td class="text-end">${money(r.actualAmount)}</td>
                <td class="text-end">
                    <input type="number" step="0.01" min="0" max="${r.actualAmount}"
                           class="form-control form-control-sm disc-input"
                           data-detail="${escapeHtml(r.detailId)}" value="${money(r.discount)}" ${r.isPaid ? 'disabled' : ''}>
                </td>
            </tr>
        `).join('');

        updateTotals();
    }

    function onGridInput(e) {
        const el = e.target;
        if (!el.classList.contains('disc-input')) return;

        const row = state.rows.find(r => String(r.detailId) === String(el.dataset.detail));
        if (!row) return;

        let v = parseFloat(el.value) || 0;
        if (v < 0) v = 0;
        if (v > row.actualAmount) { v = row.actualAmount; el.value = money(v); }
        row.discount = round2(v);

        updateTotals();
    }

    function updateTotals() {
        const rows = visibleRows();
        $id('footCount').textContent = rows.length;
        $id('footActual').textContent = money(rows.reduce((a, r) => a + r.actualAmount, 0));
        $id('footDiscount').textContent = money(rows.reduce((a, r) => a + r.discount, 0));
    }

    function setAttachment(path) {
        const link = $id('lnkViewFile');
        if (path) {
            link.href = path;
            link.classList.remove('d-none');
        } else {
            link.href = '#';
            link.classList.add('d-none');
        }
    }

    // --------------------------------------------------------
    // Save
    // --------------------------------------------------------
    async function saveDiscount() {
        if (!state.studentId) {
            Swal.fire('Select student', 'Please search and select a student first.', 'info');
            return;
        }
        if (!$id('ddlConcession').value) {
            Swal.fire('Required', 'Please select a fee concession.', 'warning');
            return;
        }
        if (!$id('ddlHead').value) {
            Swal.fire('Required', 'Please select a concession head.', 'warning');
            return;
        }
        if (!$id('txtRemark').value.trim()) {
            Swal.fire('Required', 'Remark is required.', 'warning');
            return;
        }

        const rows = visibleRows();
        if (!rows.length) {
            Swal.fire('No fee lines', 'There is nothing to save.', 'info');
            return;
        }
        if (rows.reduce((a, r) => a + r.discount, 0) <= 0) {
            Swal.fire('No discount', 'Total discount is zero. Enter a discount value first.', 'info');
            return;
        }

        const fd = new FormData();
        fd.append('StudentId', state.studentId);
        fd.append('ConcessionId', $id('ddlConcession').value);
        fd.append('FromTemplateId', $id('ddlFromInst').value || '');
        fd.append('FeeHeadId', $id('ddlHead').value);
        fd.append('DiscountType', $id('ddlDiscType').value);
        fd.append('DiscountValue', $id('txtDiscValue').value || '0');
        fd.append('DiscountByUserId', $id('ddlDiscountBy').value || '');
        fd.append('Remark', $id('txtRemark').value.trim());
        fd.append('Lines', JSON.stringify(rows.map(r => ({ DetailId: r.detailId, DiscountAmount: r.discount }))));

        const file = $id('fileAttach').files[0];
        if (file) fd.append('File', file);

        const btn = $id('btnSaveDiscount');
        btn.disabled = true;

        try {
            const res = await fetch('/FeeDiscount/Save', { method: 'POST', body: fd });
            if (!res.ok) throw new Error('Server returned ' + res.status);
            const result = await res.json();

            if (!result.success) {
                Swal.fire('Error!', result.message || 'Unable to save discount.', 'error');
                return;
            }

            await Swal.fire({ icon: 'success', title: 'Saved', text: result.message || 'Fee discount saved.' });
            $id('fileAttach').value = '';
            await loadRows();
        } catch (err) {
            console.error('Save discount error:', err);
            Swal.fire('Error!', 'An unexpected error occurred while saving.', 'error');
        } finally {
            btn.disabled = false;
        }
    }

    // --------------------------------------------------------
    // Reset
    // --------------------------------------------------------
    function clearForm() {
        state.rows = [];
        $id('ddlConcession').value = '';
        $id('ddlDiscountBy').value = '';
        $id('ddlDiscType').value = 'P';
        $id('txtDiscValue').value = '0.00';
        $id('txtRemark').value = '';
        $id('fileAttach').value = '';
        $id('ddlHead').innerHTML = `<option value="">--Select--</option>`;
        $id('ddlFromInst').innerHTML = `<option value="">--Select--</option>`;
        setAttachment(null);
        renderGrid();
    }

    function clearAll() {
        state.studentId = null;
        $id('txtStudentID').value = '';
        $id('txtSrCode').value = '';
        ['lblClass', 'lblName', 'lblGender', 'lblAdmType', 'lblFather', 'lblMother'].forEach(id => { $id(id).textContent = '-'; });
        $id('imgStudent').src = '/assets/img/doctors/doctor-01.jpg';
        clearForm();
        $id('discBody').innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">Search and select a student to load fee details</td></tr>`;
    }
})();