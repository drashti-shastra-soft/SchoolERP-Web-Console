// ========================================
// Global state for the current receipt
// ========================================
let feeHeadRows = [];   // CURRENTLY VISIBLE rows (based on installment selection)
let accountOptions = [];

// Adjust the controller if VoucherGetByID lives elsewhere (e.g. '/FeeReceipt/VoucherGetByID')
const VOUCHER_GETBYID_URL = '/FeeReceipt/VoucherGetByID'; 

// ============================================================
// VoucherHeader.js
// Dynamic voucher header fields + dropdown options
// ============================================================

let dynamicFields = [];
let headerFieldDefs = [];       // dynamic fields with Section <> 'DETAIL' (header / Amount Receiving Details)
let dynamicFieldsLoaded = false;

// ------------------------------------------------------------
// Voucher Details grid state
// ------------------------------------------------------------
let detailFieldDefs = [];       // dynamic fields with Section = 'DETAIL'
let voucherDetails = [];        // rows currently in the grid
let editingDetailIndex = -1;    // -1 = entry row is adding a new row
let accountHeadOptions = [];    // loaded once, shared by every row's Account Name select

document.addEventListener('DOMContentLoaded', () => {
    initStudentAutocomplete();
    initVoucherNoAutocomplete();
    loadFeeHeadDropdown('ddlExtraFeeHead', 0, 0);
    loadAccountOptions();
    // loadModeOfReceiptOptions();   // TODO: confirm real endpoint — see note at bottom

    document.querySelectorAll('.paymode-radio').forEach(radio => {
        radio.addEventListener('change', applyPaymentModeUI);
    });
    document.getElementById('txtCashAmount')?.addEventListener('input', recalcReceivedAmount);
    document.getElementById('txtChqAmount')?.addEventListener('input', recalcReceivedAmount);

    loadVoucherDynamicFields();

    loadAccountHeadOptions();
    //hydrateVoucherDetailsFromServer();

    //bindVoucherValidationClear();
    loadGetPaymentModeSummary();
    applyPaymentModeUI();

    // Installment dropdown selection listener (see bindInstallmentDropdown
    // section below for allFeeTemplateData / the master-cache pattern).
    document.getElementById('ddlInstallment')?.addEventListener('change', function () {
        const selectedIds = Array.from(this.selectedOptions).map(o => String(o.value));

        const visible = allFeeTemplateData.filter(t => selectedIds.includes(String(t.feeTemplateId)));

        loadedInstallments = visible.map(t => ({ feeTemplateId: t.feeTemplateId, label: t.label }));
        feeHeadRows = visible.flatMap(t => t.rows);

        renderFeeHeadGrid();
    });
});

// ========================================
// toArray / unwrapApiData — normalizes .NET JSON shapes
// (handles null, a single object, or { $values: [...] }, and
// unwraps { success, message, data } envelopes)
// ========================================
function toArray(value) {
    if (Array.isArray(value)) return value;
    if (value && Array.isArray(value.$values)) return value.$values;
    if (value && typeof value === 'object') return Object.values(value);
    return [];
}

function unwrapApiData(payload) {
    let current = payload;
    let guard = 0;
    while (current && !Array.isArray(current) && typeof current === 'object' && 'data' in current && guard < 5) {
        current = current.data;
        guard++;
    }
    return current;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function setVal(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value ?? '';
}

// ========================================
// Student autocomplete
// ========================================
function initStudentAutocomplete() {
    const input = document.getElementById('txtStudentID');
    const list = document.getElementById('pinStudentSuggestions');
    if (!input || !list) return;

    let debounceTimer;
    let currentItems = [];

    input.addEventListener('input', function () {
        const term = this.value.trim();
        clearTimeout(debounceTimer);
        if (term.length < 2) { hideList(); return; }
        debounceTimer = setTimeout(() => fetchStudents(term), 300);
    });

    document.addEventListener('click', function (e) {
        if (!input.contains(e.target) && !list.contains(e.target)) hideList();
    });

    async function fetchStudents(term) {
        try {
            const res = await fetch(`/FeeReceipt/SearchMember?searchText=${encodeURIComponent(term)}`);
            const result = await res.json();
            if (result.success && result.data && result.data.length > 0) {
                currentItems = result.data;
                renderList(currentItems);
            } else {
                hideList();
            }
        } catch (err) {
            console.error('SearchMember error:', err);
            hideList();
        }
    }

    function renderList(items) {
        list.innerHTML = '';
        items.forEach((item, idx) => {
            const li = document.createElement('li');
            li.className = 'list-group-item list-group-item-action';
            li.style.cursor = 'pointer';
            const name = getName(item);
            const admissionNo = item.admissionNo ?? '-';
            const className = item.className ?? '';
            const sectionName = item.sectionName ?? '';
            li.innerHTML = `<strong>${admissionNo}</strong> &nbsp;-&nbsp; ${name || '-'}` +
                (className ? ` <span class="text-muted small">(${className}${sectionName ? ' - ' + sectionName : ''})</span>` : '');
            li.addEventListener('click', () => selectStudentItem(idx));
            list.appendChild(li);
        });
        list.style.display = 'block';
    }

    async function selectStudentItem(idx) {
        const item = currentItems[idx];
        if (!item) return;
        hideList();
        await fillStudentFields(item);
    }

    function hideList() { list.style.display = 'none'; list.innerHTML = ''; }
    function getName(item) {
        return [item.firstName, item.middleName, item.lastName].filter(p => p && p.trim() !== '').join(' ');
    }
}

async function fillStudentFields(item) {
    document.getElementById('txtStudentID').value = item.studentID ?? '';
    document.getElementById('txtName').value = [item.firstName, item.middleName, item.lastName]
        .filter(p => p && p.trim() !== '').join(' ');
    document.getElementById('txtFathersName').value = item.fatherName ?? '';

    window.CURRENT_STUDENT_ID = item.studentID;
    window.CURRENT_FEE_TEMPLATE_ID = item.feeTemplateId; // e.g. "1,7"

    await loadFeeTemplatesForStudent(item.feeTemplateId);
    await loadInstallmentSummary(item.studentID);
}

// ========================================
// Voucher No autocomplete (search list -> pick -> load everything)
// ========================================
function initVoucherNoAutocomplete() {
    const input = document.getElementById('txtVoucherNo');
    const list = document.getElementById('pinVoucherNo');
    if (!input || !list) return;

    let debounceTimer;
    let currentItems = [];

    input.addEventListener('input', function () {
        const term = this.value.trim();
        clearTimeout(debounceTimer);
        if (term.length < 2) { hideList(); return; }
        debounceTimer = setTimeout(() => fetchVouchers(term), 300);
    });

    document.addEventListener('click', function (e) {
        if (!input.contains(e.target) && !list.contains(e.target)) hideList();
    });

    async function fetchVouchers(term) {
        try {
            const res = await fetch(`/FeeReceipt/SearchVoucher?searchText=${encodeURIComponent(term)}`);
            const result = await res.json();
            const items = result.success ? toArray(unwrapApiData(result.data)) : [];
            if (items.length > 0) {
                currentItems = items;
                renderList(currentItems);
            } else {
                hideList();
            }
        } catch (err) {
            console.error('SearchVoucher error:', err);
            hideList();
        }
    }

    function renderList(items) {
        list.innerHTML = '';
        items.forEach((item, idx) => {
            const li = document.createElement('li');
            li.className = 'list-group-item list-group-item-action';
            li.style.cursor = 'pointer';
            const name = [item.firstName, item.middleName, item.lastName].filter(p => p && p.trim() !== '').join(' ');
            li.innerHTML = `<strong>${escapeHtml(item.voucherNo ?? '-')}</strong>` +
                (name ? ` &nbsp;-&nbsp; ${escapeHtml(name)}` : '') +
                (item.className ? ` <span class="text-muted small">(${escapeHtml(item.className)}${item.sectionName ? ' - ' + escapeHtml(item.sectionName) : ''})</span>` : '');
            li.addEventListener('click', () => selectVoucherItem(idx));
            list.appendChild(li);
        });
        list.style.display = 'block';
    }

    async function selectVoucherItem(idx) {
        const item = currentItems[idx];
        if (!item) return;
        hideList();
        await onVoucherSelected(item);
    }

    function hideList() { list.style.display = 'none'; list.innerHTML = ''; }
}

// ------------------------------------------------------------
// Voucher picked: student first, then the voucher itself
// ------------------------------------------------------------
async function onVoucherSelected(item) {
    const voucherHeaderId = item.voucherHeaderID ?? item.voucherHeaderId ?? 0;

    document.getElementById('txtVoucherNo').value = item.voucherNo ?? '';
    window.CURRENT_VOUCHER_HEADER_ID = voucherHeaderId;

    await fillStudentFromVoucher(item);          // student info + fee heads + installment summary
    await loadVoucherIntoForm(voucherHeaderId);  // Amount Receiving Details (header + detail)
}

// The search item only has StudentID/VoucherNo/VoucherHeaderID unless you add the extra
// fields to FeesSearchVoucherResponse (recommended). If feeTemplateId is missing, fall back
// to SearchMember and match by studentID.
async function fillStudentFromVoucher(v) {
    const studentId = v.studentID ?? v.studentId;
    let s = v;

    if (!v.feeTemplateId && studentId) {
        try {
            const res = await fetch(`/FeeReceipt/SearchMember?searchText=${encodeURIComponent(studentId)}`);
            const result = await res.json();
            const found = toArray(unwrapApiData(result.data))
                .find(x => String(x.studentID) === String(studentId));
            if (found) s = found;
        } catch (e) {
            console.error('Student lookup for voucher failed:', e);
        }
    }

    await fillStudentFields({ ...s, studentID: studentId });
}

// ------------------------------------------------------------
// Call VoucherGetByID and fill Amount Receiving Details
// ------------------------------------------------------------
async function loadVoucherIntoForm(voucherHeaderId) {
    if (!voucherHeaderId) return;

    try {
        const res = await fetch(`${VOUCHER_GETBYID_URL}?id=${encodeURIComponent(voucherHeaderId)}`,
            { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);

        const result = await res.json();
        if (!result.success) throw new Error(result.message || 'Unable to load voucher.');

        const d = unwrapApiData(result.data) ?? result.data ?? {};
        console.log('VoucherGetByID payload:', d);   // check key names here if anything stays empty

        const header = d.header ?? d.Header ?? d.voucherHeader ?? d.VoucherHeader ?? d;
        const headerValues = toArray(d.headerValues ?? d.HeaderValues ?? d.values ?? d.Values);
        const details = toArray(d.details ?? d.Details);
        const detailValues = toArray(d.detailValues ?? d.DetailValues);

        // values nested inside each detail row
        details.forEach(row => {
            const id = row.detailID ?? row.DetailID ?? 0;
            toArray(row.values ?? row.Values).forEach(v => detailValues.push({ ...v, detailID: id }));
        });

        // ---- 1. plain header fields ----
        const total = Number(header.totalAmount ?? header.TotalAmount ?? 0) || 0;
        setVal('txtReceiptNo', header.vNo ?? header.VNo ?? '');
        setVal('txtDate', formatDateValue(header.voucherDate ?? header.VoucherDate));
        setVal('txtCashAmount', total.toFixed(2));
        setVal('txtReceivedAmount', total.toFixed(2));

        // ---- 2. dynamic header fields (Amount Receiving Details) ----
        if (!dynamicFieldsLoaded) await loadVoucherDynamicFields();

        window.dynamicFieldValues = {};
        headerValues.forEach(v => {
            window.dynamicFieldValues[v.fieldID ?? v.FieldID] = String(pickValue(v));
        });
        renderDynamicFields(headerFieldDefs);
        wireLinkedTypeFields('#dynamicFieldsContainer', headerFieldDefs);

        // ---- 3. detail row (account, narration, amount, detail fields) ----
        voucherDetails = details.map((row, i) => {
            const id = row.detailID ?? row.DetailID ?? 0;
            const values = {};
            detailValues
                .filter(v => String(v.detailID ?? v.DetailID) === String(id))
                .forEach(v => { values[v.fieldID ?? v.FieldID] = pickValue(v); });

            return {
                detailId: id,
                rowNo: row.rowNo ?? row.RowNo ?? i + 1,
                accId: row.accID ?? row.AccID ?? null,
                accountName: row.accountDisplayName ?? row.AccountDisplayName ?? '',
                narration: row.narration ?? row.Narration ?? '',
                amount: row.amount ?? row.Amount ?? 0,
                detailValues: values
            };
        });
        renderVoucherDetailsSection();
    } catch (err) {
        console.error('loadVoucherIntoForm error:', err);
        Swal.fire('Error!', err.message || 'Unable to load voucher details.', 'error');
    }
}

// one stored value row -> the single value the field renderer expects
function pickValue(v) {
    const t = v.valueText ?? v.ValueText;
    if (t !== null && t !== undefined && t !== '') return t;

    const n = v.valueNumber ?? v.ValueNumber;
    if (n !== null && n !== undefined) return n;

    const dt = v.valueDate ?? v.ValueDate;
    if (dt) return formatDateValue(dt);

    const b = v.valueBit ?? v.ValueBit;
    if (b !== null && b !== undefined) return b;

    return '';
}

// referenced by hydrateVoucherDetailsFromServer / addOrUpdateDetailRow
function recalcTotalAmount() {
    const total = voucherDetails.reduce((a, r) => a + (Number(r.amount) || 0), 0);
    if (total > 0) {
        setVal('txtReceivedAmount', total.toFixed(2));
    }
}

// ========================================
// Fee Head grid — PLAIN columns only. No per-row dynamic payment
// fields here: Mode Of Tran / Tran No / Date / DrawnOn are
// receipt-level, not per-installment, so they live in the static
// "Amount Receiving Details" panel instead (see below).
//
// Builds allFeeTemplateData (master cache, one entry per template,
// each carrying its own rows array), then derives the initially
// visible feeHeadRows/loadedInstallments from it. The master cache
// is NEVER mutated by dropdown selection afterwards — see
// bindInstallmentDropdown's change listener above.
// ========================================
async function loadFeeTemplatesForStudent(feeTemplateIdCsv) {
    const body = document.getElementById('feeHeadBody');

    if (!feeTemplateIdCsv) {
        body.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-3">No fee template assigned</td></tr>`;
        allFeeTemplateData = [];
        loadedInstallments = [];
        feeHeadRows = [];
        bindInstallmentDropdown();
        return;
    }

    const ids = feeTemplateIdCsv.split(',').map(s => s.trim()).filter(Boolean);
    body.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-3">Loading...</td></tr>`;

    allFeeTemplateData = [];
    let admissionType = '';

    try {
        for (const id of ids) {
            const res = await fetch(`/FeeReceipt/GetFeeTemplateDetails?feeTemplateId=${encodeURIComponent(id)}`);
            const result = await res.json();

            if (!result.success || !result.data) continue;

            const payload = unwrapApiData(result.data) ?? result.data;
            const header = payload.header ?? payload.Header ?? {};
            const details = toArray(payload.details ?? payload.Details);

            const installmentLabel = header.installmentLabel ?? header.InstallmentLabel ?? id;
            const admissionTypeVal = header.admissionType ?? header.AdmissionType;
            if (admissionTypeVal) admissionType = admissionTypeVal;

            const rows = details.map(d => ({
                feeTemplateId: id,
                detailId: d.detailId ?? d.DetailId ?? d.DetailID,
                feeHeadId: d.feeHeadId ?? d.FeeHeadId,
                feeHeadName: d.feeHeadName ?? d.FeeHeadName,
                addLess: d.addLess ?? d.AddLess ?? 'Add',
                actualAmount: d.actualAmount ?? d.ActualAmount ?? 0,
                submitted: d.submitted ?? d.Submitted ?? 0,
                balance: d.balance ?? d.Balance ?? 0,
                discount: d.discount ?? d.Discount ?? 0,
                received: d.received ?? d.Received ?? 0
            }));

            allFeeTemplateData.push({ feeTemplateId: id, label: installmentLabel, rows });
        }

        document.getElementById('txtAdmisionType').value = admissionType;

        // Everything starts visible/selected in the dropdown.
        loadedInstallments = allFeeTemplateData.map(t => ({ feeTemplateId: t.feeTemplateId, label: t.label }));
        feeHeadRows = allFeeTemplateData.flatMap(t => t.rows);

        bindInstallmentDropdown();
        renderFeeHeadGrid();
    } catch (err) {
        console.error('GetFeeTemplateDetails error:', err);
        body.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-3">Unable to load fee details</td></tr>`;
    }
}

// ========================================
// Installment dropdown state.
//
// allFeeTemplateData = MASTER CACHE, one entry per loaded fee
// template: { feeTemplateId, label, rows: [...] }. NEVER mutated by
// checking/unchecking an option — only read from.
//
// feeHeadRows / loadedInstallments = the CURRENTLY VISIBLE slice,
// recomputed from allFeeTemplateData every time the dropdown
// selection changes (see the change listener registered in
// DOMContentLoaded above).
// ========================================
let allFeeTemplateData = [];   // [{ feeTemplateId, label, rows }]
let loadedInstallments = [];   // [{ feeTemplateId, label }] — currently visible only
// feeHeadRows declared at top of file — currently visible rows only

function bindInstallmentDropdown() {
    const ddl = document.getElementById('ddlInstallment');
    if (!ddl) return;

    if (allFeeTemplateData.length === 0) {
        ddl.innerHTML = `<option value="" disabled selected>—</option>`;
        return;
    }

    ddl.innerHTML = allFeeTemplateData.map(t => `
        <option value="${escapeHtml(t.feeTemplateId)}" selected>
            ${escapeHtml(t.label)}
        </option>
    `).join('');
}

function renderFeeHeadGrid() {
    const body = document.getElementById('feeHeadBody');

    if (feeHeadRows.length === 0) {
        body.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-3">No fee heads found</td></tr>`;
        recalcGridTotals();
        return;
    }

    body.innerHTML = feeHeadRows.map((row, idx) => `
        <tr>
            <td>${row.feeHeadName ?? '-'}</td>
            <td>${row.addLess}</td>
            <td class="text-end">${row.actualAmount.toFixed(2)}</td>
            <td class="text-end">${row.submitted.toFixed(2)}</td>
            <td class="text-end">${row.balance.toFixed(2)}</td>
            <td class="text-end">${row.discount.toFixed(2)}</td>
            <td class="text-end">
                <input type="number" step="0.01" class="form-control form-control-sm text-end fee-received-input"
                       data-idx="${idx}" value="${row.received.toFixed(2)}" style="width:100px; display:inline-block;">
            </td>
        </tr>
    `).join('');

    document.querySelectorAll('.fee-received-input').forEach(inp => {
        inp.addEventListener('input', function () {
            const idx = parseInt(this.dataset.idx, 10);
            feeHeadRows[idx].received = parseFloat(this.value) || 0;
            recalcGridTotals();
        });
    });

    recalcGridTotals();
}

function recalcGridTotals() {
    const sum = (key) => feeHeadRows.reduce((acc, r) => acc + (r[key] || 0), 0);

    document.getElementById('totalActual').textContent = sum('actualAmount').toFixed(2);
    document.getElementById('totalSubmitted').textContent = sum('submitted').toFixed(2);
    document.getElementById('totalBalance').textContent = sum('balance').toFixed(2);
    document.getElementById('totalDiscount').textContent = sum('discount').toFixed(2);
    document.getElementById('totalReceived').textContent = sum('received').toFixed(2);

    // Pre-fill Cash Amount from the grid's total Received, unless the
    // user has already switched away from Cash.
    const totalReceived = sum('received');
    const cashOnly = document.querySelector('input[name="paymentMode"]:checked')?.value === 'Cash';
    if (cashOnly) {
        const cashEl = document.getElementById('txtCashAmount');
        if (cashEl) cashEl.value = totalReceived.toFixed(2);
    }
    recalcReceivedAmount();
}

// ========================================
// Amount Receiving Details — STATIC panel, shown once per receipt
// (Cash / Cheque/DD / Debit/Credit / Cash+Cheque/DD, Account, Date,
// Drawn On, Mode of Receipt, Narration). Not driven by dynamic
// fields — this is fixed markup in the view.
// ========================================
async function loadAccountOptions() {
    const ddl = document.getElementById('ddlAccount');
    if (!ddl) return;

    try {
        const response = await fetch('/VoucherHeader/GetAccountHeadOptions', {
            method: 'GET',
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (!response.ok) throw new Error(`Server returned ${response.status}`);

        const res = await response.json();
        if (!res.success) throw new Error(res.message || 'Unable to load account list.');

        accountOptions = toArray(unwrapApiData(res.data)).map(o => ({
            id: o.id ?? o.Id ?? o.optionValue ?? o.OptionValue ?? '',
            name: o.name ?? o.Name ?? o.optionLabel ?? o.OptionLabel ?? ''
        }));

        ddl.innerHTML = `<option value="">-- Select --</option>` +
            accountOptions.map(o => `<option value="${escapeHtml(o.id)}">${escapeHtml(o.name)}</option>`).join('');
    } catch (err) {
        console.error('Account options error:', err);
        ddl.innerHTML = `<option value="">-- Select --</option>`;
    }
}

// ------------------------------------------------------------
// Parse a field's options into a normalized array of
// { optionID, optionLabel, optionValue, displayOrder, isDefault }
// Handles options sent as a JSON string, PascalCase keys
// (OptionID/OptionLabel/...), or the $values wrapper.
// ------------------------------------------------------------
function parseFieldOptions(field) {

    let raw = field?.options;

    if (typeof raw === "string") {
        try {
            raw = raw.trim() ? JSON.parse(raw) : [];
        }
        catch (e) {
            console.error("Invalid options JSON for field", field?.fieldID, e);
            raw = [];
        }
    }

    return toArray(raw).map(option => ({
        optionID: option.optionID ?? option.OptionID ?? null,
        optionLabel: option.optionLabel ?? option.OptionLabel ?? "",
        optionValue: option.optionValue ?? option.OptionValue ?? "",
        displayOrder: option.displayOrder ?? option.DisplayOrder ?? 0,
        isDefault: !!(option.isDefault ?? option.IsDefault ?? false)
    }));
}

// ------------------------------------------------------------
// Resolve the value a field should show:
// 1) a previously saved value (edit mode)
// 2) the option flagged IsDefault (dropdown/radio)
// 3) the field's own DefaultValue
// 4) empty
// ------------------------------------------------------------
function getEffectiveFieldValue(field, options) {

    const savedValues = window.dynamicFieldValues || {};
    const saved = savedValues[field.fieldID];

    if (saved !== undefined && saved !== null && saved !== "") {
        return saved;
    }

    const defaultOption = (options || []).find(o => o.isDefault);

    if (defaultOption) {
        return String(defaultOption.optionValue ?? "");
    }

    if (field.defaultValue !== undefined && field.defaultValue !== null) {
        return String(field.defaultValue);
    }

    return "";
}

// ------------------------------------------------------------
// Load dynamic fields by VoucherId
// ------------------------------------------------------------
async function loadVoucherDynamicFields() {

    const voucherId = window.FEE_RECEIPT_VOUCHER_ID || 11;

    const container =
        document.getElementById("dynamicFieldsContainer");

    const empty =
        document.getElementById("dynamicFieldsEmpty");

    if (!container) return;

    if (voucherId <= 0) {
        dynamicFields = [];
        headerFieldDefs = [];
        dynamicFieldsLoaded = false;
        detailFieldDefs = [];

        container.innerHTML = `
            <div class="col-12 text-muted">
                Select a voucher type to load dynamic fields.
            </div>`;

        renderVoucherDetailsSection();
        return;
    }

    try {
        const response = await fetch(
            `/VoucherHeader/GetDynamicFields?voucherId=${voucherId}`,
            {
                method: "GET",
                headers: {
                    "X-Requested-With": "XMLHttpRequest"
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const res = await response.json();

        if (!res.success) {
            throw new Error(
                res.message || "Unable to load voucher fields."
            );
        }

        dynamicFields = toArray(unwrapApiData(res.data));
        dynamicFieldsLoaded = true;

        // Section = 'DETAIL' fields belong to the details grid, not the
        // header card - everything else (including unset/blank Section,
        // treated as HEADER) renders in dynamicFieldsContainer as before.
        const headerFields = dynamicFields.filter(
            f => (f.section || "HEADER").toUpperCase() !== "DETAIL"
        );

        headerFieldDefs = headerFields;

        detailFieldDefs = dynamicFields.filter(
            f => (f.section || "").toUpperCase() === "DETAIL"
        );

        renderDynamicFields(headerFields);

        // Generic "type picks the source" wiring (e.g. Expense For:
        // Student/Staff). Driven entirely by each field's
        // linkedChildFieldCode - nothing here is hardcoded to a
        // specific field, voucher type, or option value.
        wireLinkedTypeFields("#dynamicFieldsContainer", headerFields);

        renderVoucherDetailsSection();
    }
    catch (error) {
        console.error("Dynamic field error:", error);

        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    ${escapeHtml(error.message || "Unable to load voucher fields.")}
                </div>
            </div>`;
    }
    finally {
    }
}

// ------------------------------------------------------------
// Render fields
// ------------------------------------------------------------
function renderDynamicFields(fields) {

    const container =
        document.getElementById("dynamicFieldsContainer");

    if (!container) return;

    fields = toArray(fields);

    container.innerHTML = "";

    if (!fields || fields.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-muted">
                No dynamic fields configured for this voucher type.
            </div>`;
        return;
    }

    fields.forEach(field => {

        const col = document.createElement("div");
        col.className = getFieldColumnClass(field);

        col.innerHTML = buildFieldHtml(field);

        container.appendChild(col);
    });

    initializeDynamicControls();
}

// ------------------------------------------------------------
// Field HTML
// ------------------------------------------------------------
function buildFieldHtml(field) {

    const fieldId = field.fieldID;
    const label = escapeHtml(field.fieldLabel || field.fieldCode || "");
    const code = escapeHtml(field.fieldCode || `FIELD_${fieldId}`);

    const required = field.isRequired
        ? `<span class="text-danger">*</span>`
        : "";

    const readonly = field.isReadOnly ? "readonly" : "";

    const type = (field.fieldType || "TEXT").toUpperCase();

    const needsOptions =
        type === "DROPDOWN" ||
        type === "SELECT" ||
        type === "RADIOBUTTON" ||
        type === "RADIO";

    const options = needsOptions ? parseFieldOptions(field) : [];

    const savedValue = getEffectiveFieldValue(field, options);

    let input = "";

    switch (type) {

        case "DROPDOWN":
        case "SELECT":
            input = buildDropdown(field, options, savedValue);
            break;

        case "RADIOBUTTON":
        case "RADIO":
            input = buildRadioGroup(field, options, savedValue);
            return `
                <label class="form-label">
                    ${label} ${required}
                </label>

                ${input}

                <div class="text-danger small mt-1 d-none"
                     id="errDynamic_${fieldId}">
                    ${field.isRequired ? "This field is required." : ""}
                </div>
            `;

        case "DATE":
            input = `
                <input type="date"
                       class="form-control dynamic-field"
                       id="dynamic_${fieldId}"
                       data-field-id="${fieldId}"
                       data-field-code="${code}"
                       ${readonly}
                       value="${escapeHtml(formatDateValue(savedValue))}">
            `;
            break;

        case "DATETIME":
        case "DATETIME2":
            input = `
                <input type="datetime-local"
                       class="form-control dynamic-field"
                       id="dynamic_${fieldId}"
                       data-field-id="${fieldId}"
                       data-field-code="${code}"
                       ${readonly}
                       value="${escapeHtml(formatDateTimeValue(savedValue))}">
            `;
            break;

        case "NUMBER":
        case "DECIMAL":
            input = `
                <input type="number"
                       class="form-control dynamic-field"
                       id="dynamic_${fieldId}"
                       data-field-id="${fieldId}"
                       data-field-code="${code}"
                       ${readonly}
                       step="${getDecimalStep(field.decimalPlaces)}"
                       value="${escapeHtml(savedValue)}">
            `;
            break;

        case "CHECKBOX":
        case "BIT":
        case "BOOLEAN":
            input = `
                <div class="form-check form-switch mt-2">
                    <input class="form-check-input dynamic-field"
                           type="checkbox"
                           id="dynamic_${fieldId}"
                           data-field-id="${fieldId}"
                           data-field-code="${code}"
                           ${savedValue === "true" || savedValue === "1" ? "checked" : ""}
                           ${field.isReadOnly ? "disabled" : ""}>
                    <label class="form-check-label" for="dynamic_${fieldId}">
                        ${label}
                    </label>
                </div>
            `;
            return `
                <div>
                    ${input}
                    ${requiredErrorHtml(field)}
                </div>
            `;

        case "TEXTAREA":
            input = `
                <textarea class="form-control dynamic-field"
                          id="dynamic_${fieldId}"
                          data-field-id="${fieldId}"
                          data-field-code="${code}"
                          maxlength="${field.maxLength || ""}"
                          ${readonly}>${escapeHtml(savedValue)}</textarea>
            `;
            break;

        default:
            input = `
                <input type="text"
                       class="form-control dynamic-field"
                       id="dynamic_${fieldId}"
                       data-field-id="${fieldId}"
                       data-field-code="${code}"
                       maxlength="${field.maxLength || ""}"
                       ${readonly}
                       value="${escapeHtml(savedValue)}">
            `;
            break;
    }

    return `
        <label class="form-label">
            ${label} ${required}
        </label>

        ${input}

        <div class="text-danger small mt-1 d-none"
             id="errDynamic_${fieldId}">
            ${field.isRequired ? "This field is required." : ""}
        </div>
    `;
}

function getFieldColumnClass(field) {

    const type =
        (field.fieldType || "TEXT").toUpperCase();

    if (type === "TEXTAREA") {
        return "col-md-12";
    }

    return "col-md-3";
}

function getDecimalStep(decimalPlaces) {

    const places = parseInt(decimalPlaces || "2");

    if (places <= 0) return "1";

    return "0." + "0".repeat(Math.max(0, places - 1)) + "1";
}

function formatDateValue(value) {

    if (!value) return "";

    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        return value.substring(0, 10);
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) return "";

    return date.toISOString().substring(0, 10);
}

function formatDateTimeValue(value) {

    if (!value) return "";

    const date = new Date(value);

    if (isNaN(date.getTime())) return "";

    const pad = n => String(n).padStart(2, "0");

    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
        `T${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
}

function requiredErrorHtml(field) {

    return `
        <div class="text-danger small mt-1 d-none"
             id="errDynamic_${field.fieldID}">
            ${field.isRequired ? "This field is required." : ""}
        </div>
    `;
}

function showVoucherNotice(message) {

    const el =
        document.getElementById("voucherHeaderPageNotice");

    if (!el) return;

    el.innerHTML = `
        <div class="alert alert-danger alert-dismissible fade show"
             role="alert">
            ${escapeHtml(message)}
            <button type="button"
                    class="btn-close"
                    data-bs-dismiss="alert"></button>
        </div>`;
}

// ------------------------------------------------------------
// Dropdown
// ------------------------------------------------------------
function buildDropdown(field, options, savedValue) {

    let html = `
        <select class="form-select select2 dynamic-field"
                id="dynamic_${field.fieldID}"
                data-field-id="${field.fieldID}"
                data-field-code="${escapeHtml(field.fieldCode || "")}"
                data-linked-child="${escapeHtml(field.linkedChildFieldCode || "")}"
                ${field.isReadOnly ? "disabled" : ""}>
            <option value="">--Select--</option>
    `;

    (options || []).forEach(option => {

        const selected =
            String(option.optionValue ?? "") ===
                String(savedValue ?? "")
                ? "selected"
                : "";

        html += `
            <option value="${escapeHtml(option.optionValue ?? "")}"
                    ${selected}>
                ${escapeHtml(option.optionLabel ?? "")}
            </option>
        `;
    });

    html += `</select>`;

    return html;
}

// ------------------------------------------------------------
// Radio button group
// ------------------------------------------------------------
function buildRadioGroup(field, options, savedValue) {

    const fieldId = field.fieldID;
    const groupName = `dynamic_${fieldId}`;

    if (!options || options.length === 0) {
        return `
            <div class="text-muted small">
                No options configured for this field.
            </div>
        `;
    }

    let html = `<div class="mt-1">`;

    options.forEach((option, index) => {

        const optionValue = String(option.optionValue ?? "");

        const checked =
            optionValue === String(savedValue ?? "")
                ? "checked"
                : "";

        const inputId = `${groupName}_${option.optionID ?? index}`;

        html += `
            <div class="form-check form-check-inline">
                <input class="form-check-input dynamic-field"
                       type="radio"
                       name="${groupName}"
                       id="${inputId}"
                       data-field-id="${fieldId}"
                       data-field-code="${escapeHtml(field.fieldCode || "")}"
                       data-linked-child="${escapeHtml(field.linkedChildFieldCode || "")}"
                       value="${escapeHtml(optionValue)}"
                       ${checked}
                       ${field.isReadOnly ? "disabled" : ""}>
                <label class="form-check-label" for="${inputId}">
                    ${escapeHtml(option.optionLabel ?? "")}
                </label>
            </div>
        `;
    });

    html += `</div>`;

    return html;
}

// ------------------------------------------------------------
// Initialize Select2
// ------------------------------------------------------------
function initializeDynamicControls() {

    if (!$.fn.select2) return;

    $("#dynamicFieldsContainer select.select2").each(function () {

        if ($(this).hasClass("select2-hidden-accessible")) {
            $(this).select2("destroy");
        }

        $(this).select2({
            width: "100%"
        });
    });
}

// ------------------------------------------------------------
// Generic "type picks the source" wiring.
// ------------------------------------------------------------
function wireLinkedTypeFields(scopeSelector, fieldDefs) {

    const container = document.querySelector(scopeSelector);
    if (!container) return;

    const linkedFieldsById = {};
    (fieldDefs || []).forEach(field => {
        if (field.linkedChildFieldCode) {
            linkedFieldsById[field.fieldID] = field;
        }
    });

    const getTypeValue = (typeEls) => {

        if (typeEls[0].type === "radio") {
            const checked = typeEls.find(el => el.checked);
            return checked ? checked.value : "";
        }

        return typeEls[0].value;
    };

    const refreshFieldById = async (fieldId, preselectValue) => {

        const field = linkedFieldsById[fieldId];
        if (!field) return;

        const typeEls = Array.from(container.querySelectorAll(
            `[data-field-id="${fieldId}"]`
        ));

        const childEl = container.querySelector(
            `[data-field-code="${field.linkedChildFieldCode}"]`
        );

        if (!typeEls.length || !childEl) return;

        const optionValue = getTypeValue(typeEls);

        if ($(childEl).hasClass("select2-hidden-accessible")) {
            $(childEl).val(null).trigger("change");
        }

        if (!optionValue) {
            childEl.innerHTML = `<option value="">--Select type first--</option>`;
            $(childEl).prop("disabled", true).trigger("change.select2");
            return;
        }

        let options = [];

        try {
            const res = await (await fetch(
                `/VoucherHeader/GetLinkedFieldOptions?fieldId=${fieldId}&optionValue=${encodeURIComponent(optionValue)}`,
                { headers: { "X-Requested-With": "XMLHttpRequest" } }
            )).json();

            options = res.success ? toArray(unwrapApiData(res.data)) : [];
        }
        catch (e) {
            console.error("Linked field options error:", e);
        }

        childEl.innerHTML = `<option value="">--Select--</option>` + options.map(o => {
            const val = o.OptionValue ?? o.optionValue ?? "";
            const label = o.OptionLabel ?? o.optionLabel ?? "";
            const sel = preselectValue && String(val) === String(preselectValue) ? "selected" : "";
            return `<option value="${escapeHtml(val)}" ${sel}>${escapeHtml(label)}</option>`;
        }).join("");

        $(childEl).prop("disabled", false).trigger("change.select2");
    };

    if (!container.dataset.linkedDelegated) {
        container.dataset.linkedDelegated = "1";

        container.addEventListener("change", (e) => {

            const fieldId = parseInt(e.target?.dataset?.fieldId || "0");
            if (!fieldId || !linkedFieldsById[fieldId]) return;

            refreshFieldById(fieldId);
        });
    }

    Object.keys(linkedFieldsById).forEach(fieldIdStr => {

        const fieldId = parseInt(fieldIdStr);
        const field = linkedFieldsById[fieldId];

        const typeEls = Array.from(container.querySelectorAll(
            `[data-field-id="${fieldId}"]`
        ));

        if (!typeEls.length) return;

        const hasValue = typeEls[0].type === "radio"
            ? typeEls.some(el => el.checked)
            : !!typeEls[0].value;

        if (!hasValue) return;

        const childField = (fieldDefs || []).find(
            f => f.fieldCode === field.linkedChildFieldCode
        );

        const savedChildValue = childField
            ? (window.dynamicFieldValues || {})[childField.fieldID]
            : null;

        refreshFieldById(fieldId, savedChildValue);
    });
}

// ============================================================
// Voucher Details grid
// ============================================================

async function loadAccountHeadOptions() {

    try {
        const response = await fetch(
            "/VoucherHeader/GetAccountHeadOptions",
            {
                method: "GET",
                headers: { "X-Requested-With": "XMLHttpRequest" }
            }
        );

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const res = await response.json();

        if (!res.success) {
            throw new Error(res.message || "Unable to load account list.");
        }

        accountHeadOptions = toArray(unwrapApiData(res.data)).map(o => ({
            id: o.id ?? o.Id ?? o.optionValue ?? o.OptionValue ?? "",
            name: o.name ?? o.Name ?? o.optionLabel ?? o.OptionLabel ?? ""
        }));
    }
    catch (error) {
        console.error("Account head options error:", error);
        accountHeadOptions = [];
    }

    renderVoucherDetailsSection();
}

// ------------------------------------------------------------
// If the server pre-loaded existing detail rows for edit mode
// ------------------------------------------------------------
function hydrateVoucherDetailsFromServer() {

    const rows = toArray(window.voucherDetailRows);

    if (!rows.length) return;

    const allValues = toArray(window.voucherDetailValues);

    voucherDetails = rows.map(row => {

        const detailId = row.detailID ?? row.DetailID ?? 0;

        const values = {};

        allValues
            .filter(v => (v.detailID ?? v.DetailID) === detailId)
            .forEach(v => {
                const fieldId = v.fieldID ?? v.FieldID;
                values[fieldId] =
                    v.valueText ?? v.ValueText ??
                    v.valueNumber ?? v.ValueNumber ??
                    v.valueDate ?? v.ValueDate ??
                    v.valueBit ?? v.ValueBit ?? "";
            });

        return {
            detailId,
            rowNo: row.rowNo ?? row.RowNo ?? null,
            accId: row.accID ?? row.AccID ?? null,
            accountName: row.accountDisplayName ?? row.AccountDisplayName ?? "",
            narration: row.narration ?? row.Narration ?? "",
            amount: row.amount ?? row.Amount ?? 0,
            detailValues: values
        };
    });

    renderVoucherDetailsSection();
    recalcTotalAmount();
}

// ------------------------------------------------------------
// Render the whole Voucher Details card
// ------------------------------------------------------------
function renderVoucherDetailsSection() {

    const container = document.getElementById("voucherDetailsSection");
    if (!container) return;

    const current = voucherDetails[0] || null;

    const accOptionsHtml = accountHeadOptions
        .map(o => `
            <option value="${escapeHtml(o.id)}"
                    ${current && String(current.accId) === String(o.id) ? "selected" : ""}>
                ${escapeHtml(o.name)}
            </option>
        `)
        .join("");

    const extraFieldsHtml = detailFieldDefs.map(field => `
        <div class="${getFieldColumnClass(field)}">
            <label class="form-label fw-semibold">
                ${escapeHtml(field.fieldLabel || field.fieldCode || "")}
                ${field.isRequired ? '<span class="text-danger">*</span>' : ''}
            </label>
            ${buildDetailFieldInputHtml(field, current ? current.detailValues?.[field.fieldID] : "")}
        </div>
    `).join("");

    container.innerHTML = `
        <div class="row g-3">
            <div class="d-none col-md-2">
                <label class="form-label fw-semibold">AccID</label>
                <input type="text" class="form-control" id="detailAccIdDisplay" readonly
                       value="${current ? escapeHtml(current.accId ?? "") : ""}">
            </div>
            <div class="col-md-3">
                <label class="form-label fw-semibold">Account Name <span class="text-danger">*</span></label>
                <select class="form-select select2" id="detailAccId" style="width:100%;">
                    <option value="">--Select--</option>
                    ${accOptionsHtml}
                </select>
            </div>
            <div class="col-md-3">
                <label class="form-label fw-semibold">Narration</label>
                <input type="text" class="form-control" id="detailNarration"
                       value="${current ? escapeHtml(current.narration ?? "") : ""}">
            </div>
            ${extraFieldsHtml}
            <div class="col-md-2">
                <label class="form-label fw-semibold">Amount <span class="text-danger">*</span></label>
                <input type="number" step="0.01" class="form-control text-end" id="detailAmount"
                       value="${current ? escapeHtml(current.amount ?? "0.00") : "0.00"}">
            </div>
        </div>
        <div class="text-danger small mt-1 d-none" id="errVoucherDetails"></div>
    `;

    if ($.fn.select2) {
        $("#detailAccId").select2({ width: "100%" });
        $("#detailAccId").on("change", function () {
            document.getElementById("detailAccIdDisplay").value = this.value || "";
        });
    }

    wireLinkedTypeFields("#voucherDetailsSection", detailFieldDefs);
}

// ------------------------------------------------------------
// The always-present editable row used to add a new row, or
// (when editingDetailIndex >= 0) to edit an existing one.
// ------------------------------------------------------------
function renderDetailEntryRow() {

    const tbody = document.getElementById("voucherDetailsEntryRow");
    if (!tbody) return;

    const editing = editingDetailIndex >= 0;
    const current = editing ? voucherDetails[editingDetailIndex] : null;

    const accOptionsHtml = accountHeadOptions
        .map(o => `
            <option value="${escapeHtml(o.id)}"
                    ${current && String(current.accId) === String(o.id) ? "selected" : ""}>
                ${escapeHtml(o.name)}
            </option>
        `)
        .join("");

    const extraCells = detailFieldDefs
        .map(field => `
            <td>
                ${buildDetailFieldInputHtml(field, current ? current.detailValues[field.fieldID] : "")}
            </td>
        `)
        .join("");

    tbody.innerHTML = `
        <tr class="item-row">
            <td colspan="2" class="text-center">
                ${editing
            ? `<i class="ti ti-x text-danger" role="button" title="Cancel edit" onclick="cancelDetailEdit()"></i>`
            : ""
        }
            </td>
            <td>
                <input type="text" class="form-control form-control-sm" id="detailAccIdDisplay" readonly
                       value="${current ? escapeHtml(current.accId ?? "") : ""}">
            </td>
            <td>
                <select class="form-select form-select-sm select2" id="detailAccId" style="width:100%;">
                    <option value="">--Select--</option>
                    ${accOptionsHtml}
                </select>
            </td>
            <td>
                <input type="text" class="form-control form-control-sm" id="detailNarration"
                       value="${current ? escapeHtml(current.narration) : ""}">
            </td>
            ${extraCells}
            <td>
                <input type="number" step="0.01" class="form-control form-control-sm text-end" id="detailAmount"
                       value="${current ? escapeHtml(current.amount) : "0.00"}">
            </td>
            <td class="text-center">
                <i class="ti ${editing ? "ti-device-floppy text-primary" : "ti-circle-plus text-success"}"
                   role="button" title="${editing ? "Update row" : "Add row"}"
                   style="font-size:1.2rem;"
                   onclick="addOrUpdateDetailRow()"></i>
            </td>
        </tr>
    `;

    if ($.fn.select2) {
        $("#detailAccId").select2({ width: "100%" });

        $("#detailAccId").on("change", function () {
            document.getElementById("detailAccIdDisplay").value = this.value || "";
        });

        if (current) {
            document.getElementById("detailAccIdDisplay").value = current.accId ?? "";
        }
    }

    wireLinkedTypeFields("#voucherDetailsEntryRow", detailFieldDefs);
}

// ------------------------------------------------------------
// Simplified per-row dynamic field input (DETAIL-section fields).
// ------------------------------------------------------------
function buildDetailFieldInputHtml(field, value) {

    const type = (field.fieldType || "TEXT").toUpperCase();
    const fieldId = field.fieldID;
    const val = value ?? "";

    if (type === "DROPDOWN" || type === "SELECT") {
        const options = parseFieldOptions(field);
        const effective = value !== undefined && value !== "" ? value : getEffectiveFieldValue(field, options);

        const optionsHtml = options.map(o => `
            <option value="${escapeHtml(o.optionValue)}" ${String(o.optionValue) === String(effective) ? "selected" : ""}>
                ${escapeHtml(o.optionLabel)}
            </option>
        `).join("");

        return `
            <select class="form-select form-select-sm select2 detail-dynamic-field"
                    data-field-id="${fieldId}"
                    data-field-code="${escapeHtml(field.fieldCode || "")}"
                    data-linked-child="${escapeHtml(field.linkedChildFieldCode || "")}">
                <option value="">--Select--</option>
                ${optionsHtml}
            </select>
        `;
    }

    if (type === "RADIOBUTTON" || type === "RADIO") {
        const options = parseFieldOptions(field);
        const effective = value !== undefined && value !== "" ? value : getEffectiveFieldValue(field, options);

        if (!options.length) {
            return `<div class="text-muted small">No options configured.</div>`;
        }

        const groupName = `detail_dynamic_${fieldId}_${Math.random().toString(36).slice(2, 8)}`;

        const optionsHtml = options.map((o, index) => {

            const optVal = String(o.optionValue ?? "");
            const checked = optVal === String(effective ?? "") ? "checked" : "";
            const inputId = `${groupName}_${o.optionID ?? index}`;

            return `
                <div class="form-check form-check-inline m-0">
                    <input class="form-check-input detail-dynamic-field"
                           type="radio"
                           name="${groupName}"
                           id="${inputId}"
                           data-field-id="${fieldId}"
                           data-field-code="${escapeHtml(field.fieldCode || "")}"
                           data-linked-child="${escapeHtml(field.linkedChildFieldCode || "")}"
                           value="${escapeHtml(optVal)}"
                           ${checked}>
                    <label class="form-check-label" for="${inputId}">
                        ${escapeHtml(o.optionLabel ?? "")}
                    </label>
                </div>
            `;
        }).join("");

        return `<div class="d-flex flex-wrap gap-2">${optionsHtml}</div>`;
    }

    if (type === "DATE") {
        return `<input type="date" class="form-control form-control-sm detail-dynamic-field" data-field-id="${fieldId}" value="${escapeHtml(formatDateValue(val))}">`;
    }

    if (type === "NUMBER" || type === "DECIMAL") {
        return `<input type="number" step="${getDecimalStep(field.decimalPlaces)}" class="form-control form-control-sm detail-dynamic-field" data-field-id="${fieldId}" value="${escapeHtml(val)}">`;
    }

    if (type === "CHECKBOX" || type === "BIT" || type === "BOOLEAN") {
        return `<input type="checkbox" class="form-check-input detail-dynamic-field" data-field-id="${fieldId}" ${val === true || val === "true" || val === "1" ? "checked" : ""}>`;
    }

    return `<input type="text" class="form-control form-control-sm detail-dynamic-field" data-field-id="${fieldId}" value="${escapeHtml(val)}">`;
}

// ------------------------------------------------------------
// Read the entry row, push a new row or update the one being
// edited, then reset the entry row back to "add" mode.
// ------------------------------------------------------------
function addOrUpdateDetailRow() {

    const errEl = document.getElementById("errVoucherDetails");
    errEl?.classList.add("d-none");

    const accSelect = document.getElementById("detailAccId");
    const accId = parseInt(accSelect?.value || "0") || null;
    const accountName = accSelect?.selectedOptions?.[0]?.textContent?.trim() || "";
    const narration = document.getElementById("detailNarration")?.value?.trim() || "";
    const amount = parseFloat(document.getElementById("detailAmount")?.value || "0") || 0;

    if (!accId) {
        if (errEl) {
            errEl.textContent = "Please select an account name.";
            errEl.classList.remove("d-none");
        }
        return;
    }

    if (amount <= 0) {
        if (errEl) {
            errEl.textContent = "Amount must be greater than 0.";
            errEl.classList.remove("d-none");
        }
        return;
    }

    const detailValues = {};
    document.querySelectorAll("#voucherDetailsEntryRow .detail-dynamic-field").forEach(el => {

        const fieldId = parseInt(el.dataset.fieldId || "0");
        if (!fieldId) return;

        if (el.type === "radio") {
            if (!el.checked) return;
            detailValues[fieldId] = el.value;
            return;
        }

        detailValues[fieldId] = el.type === "checkbox" ? el.checked : el.value;
    });

    const row = {
        detailId: editingDetailIndex >= 0 ? voucherDetails[editingDetailIndex].detailId : 0,
        rowNo: editingDetailIndex >= 0 ? voucherDetails[editingDetailIndex].rowNo : voucherDetails.length + 1,
        accId,
        accountName,
        narration,
        amount,
        detailValues
    };

    if (editingDetailIndex >= 0) {
        voucherDetails[editingDetailIndex] = row;
        editingDetailIndex = -1;
    }
    else {
        voucherDetails.push(row);
    }

    renumberDetailRows();
    renderVoucherDetailsSection();
    recalcTotalAmount();
}


function applyPaymentModeUI() {
    const mode = document.querySelector('input[name="paymentMode"]:checked')?.value || 'Cash';

    const cashEl = document.getElementById('txtCashAmount');
    const chqEl = document.getElementById('txtChqAmount');
    const chqNoEl = document.getElementById('txtChqNo');
    const drawnOnEl = document.getElementById('txtDrawnOn');

    const isCashOnly = mode === 'Cash';
    const isChequeOnly = mode === 'Cheque/DD' || mode === 'Debit/Credit';

    if (cashEl) cashEl.disabled = isChequeOnly;
    if (chqEl) chqEl.disabled = isCashOnly;
    if (chqNoEl) chqNoEl.disabled = isCashOnly;
    if (drawnOnEl) drawnOnEl.disabled = isCashOnly;

    if (isCashOnly) {
        if (chqEl) chqEl.value = '0.00';
        if (chqNoEl) chqNoEl.value = '';
        if (drawnOnEl) drawnOnEl.value = '';
    }
    if (isChequeOnly && cashEl) {
        cashEl.value = '0.00';
    }

    recalcReceivedAmount();
}

function recalcReceivedAmount() {
    const cash = parseFloat(document.getElementById('txtCashAmount')?.value || '0') || 0;
    const chq = parseFloat(document.getElementById('txtChqAmount')?.value || '0') || 0;
    const el = document.getElementById('txtReceivedAmount');
    if (el) el.value = (cash + chq).toFixed(2);
}

function renumberDetailRows() {
    voucherDetails.forEach((row, i) => { row.rowNo = i + 1; });
}

// ------------------------------------------------------------
// Render the already-added rows below the entry row.
// ------------------------------------------------------------
function renderDetailRowsTable() {

    const tbody = document.getElementById("voucherDetailsRows");
    if (!tbody) return;

    if (!voucherDetails.length) {
        const colCount = 6 + detailFieldDefs.length;
        tbody.innerHTML = `
            <tr>
                <td colspan="${colCount}" class="text-center text-muted py-3">
                    No rows added yet.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = voucherDetails.map((row, index) => `
        <tr>
            <td class="text-center">
                <i class="ti ti-edit text-primary" role="button" title="Edit" onclick="editDetailRow(${index})"></i>
            </td>
            <td class="text-center">
                <i class="ti ti-trash text-danger" role="button" title="Delete" onclick="removeDetailRow(${index})"></i>
            </td>
            <td>${escapeHtml(row.accId ?? "")}</td>
            <td>${escapeHtml(row.accountName)}</td>
            <td>${escapeHtml(row.narration)}</td>
            ${detailFieldDefs.map(f => `<td>${escapeHtml(row.detailValues[f.fieldID] ?? "")}</td>`).join("")}
            <td class="text-end">${Number(row.amount || 0).toFixed(2)}</td>
            <td></td>
        </tr>
    `).join("");
}

// ========================================
// Extra Fee Head row (ad-hoc addition not in the template)
// ========================================
function addExtraFeeHeadRow() {
    const ddl = document.getElementById('ddlExtraFeeHead');
    if (!ddl.value) {
        Swal.fire('Select', 'Please select a fee head first.', 'info');
        return;
    }
    const mode = document.querySelector('input[name="addLessMode"]:checked')?.value || 'Add';

    feeHeadRows.push({
        feeTemplateId: null,
        detailId: null,
        feeHeadId: parseInt(ddl.value, 10),
        feeHeadName: ddl.options[ddl.selectedIndex].text,
        addLess: mode,
        actualAmount: 0,
        submitted: 0,
        balance: 0,
        discount: 0,
        received: 0
    });

    renderFeeHeadGrid();
    ddl.value = '';
}

// ------------------------------------------------------------
// Collect dynamic fields
// ------------------------------------------------------------
function collectDynamicFieldValues() {

    const values = [];

    document
        .querySelectorAll("#dynamicFieldsContainer .dynamic-field")
        .forEach(el => {

            const fieldId =
                parseInt(el.dataset.fieldId || "0");

            if (fieldId <= 0) return;

            const field = dynamicFields.find(
                x => x.fieldID === fieldId
            );

            if (!field) return;

            let valueText = null;
            let valueNumber = null;
            let valueDate = null;
            let valueBit = null;
            let refId = null;

            const type =
                (field.fieldType || "TEXT").toUpperCase();

            if (type === "RADIOBUTTON" || type === "RADIO") {
                if (!el.checked) return;

                valueText = el.value || null;
                refId = parseInt(el.value || "0") || null;
            }
            else if (type === "NUMBER" || type === "DECIMAL") {
                valueNumber = el.value === ""
                    ? null
                    : parseFloat(el.value);
            }
            else if (type === "DATE" || type === "DATETIME" || type === "DATETIME2") {
                valueDate = el.value || null;
            }
            else if (
                type === "CHECKBOX" ||
                type === "BIT" ||
                type === "BOOLEAN"
            ) {
                valueBit = el.checked;
            }
            else {
                valueText = el.value || null;

                if (
                    type === "DROPDOWN" ||
                    type === "SELECT"
                ) {
                    refId = parseInt(el.value || "0") || null;
                }
            }

            values.push({
                FieldID: fieldId,
                ValueText: valueText,
                ValueNumber: valueNumber,
                ValueDate: valueDate,
                ValueBit: valueBit,
                RefID: refId
            });
        });

    return values;
}

// ------------------------------------------------------------
// Validation
// ------------------------------------------------------------
function validateVoucherHeader() {

    let valid = true;

    const voucherType =
        parseInt(document.getElementById("ddlVoucherType").value || "0");

    const voucherNo =
        document.getElementById("txtVoucherNo").value.trim();

    const voucherDate =
        document.getElementById("txtVoucherDate").value;

    clearVoucherError(
        "ddlVoucherType",
        "errVoucherType"
    );

    clearVoucherError(
        "txtVoucherNo",
        "errVoucherNo"
    );

    clearVoucherError(
        "txtVoucherDate",
        "errVoucherDate"
    );

    if (voucherType <= 0) {
        showVoucherError(
            "ddlVoucherType",
            "errVoucherType",
            "Please select voucher type."
        );
        valid = false;
    }


    if (!voucherDate) {
        showVoucherError(
            "txtVoucherDate",
            "errVoucherDate",
            "Voucher date is required."
        );
        valid = false;
    }

    const processedRadioFields = new Set();

    document
        .querySelectorAll("#dynamicFieldsContainer .dynamic-field")
        .forEach(el => {

            const fieldId =
                parseInt(el.dataset.fieldId || "0");

            const field =
                dynamicFields.find(x => x.fieldID === fieldId);

            if (!field || !field.isRequired) return;

            let empty = false;

            if (el.type === "radio") {

                if (processedRadioFields.has(fieldId)) return;
                processedRadioFields.add(fieldId);

                empty = !document.querySelector(
                    `input[name="dynamic_${fieldId}"]:checked`
                );
            }
            else if (el.type === "checkbox") {
                empty = !el.checked;
            }
            else {
                empty = !String(el.value || "").trim();
            }

            if (empty) {
                showVoucherError(
                    el.id,
                    `errDynamic_${fieldId}`,
                    `${field.fieldLabel || "This field"} is required.`
                );
                valid = false;
            }
            else {
                clearVoucherError(
                    el.id,
                    `errDynamic_${fieldId}`
                );
            }
        });

    return valid;
}

// ------------------------------------------------------------
// Shape voucherDetails into the JSON SaveFull expects.
// ------------------------------------------------------------
function buildDetailsPayload() {

    const accId = parseInt(document.getElementById("detailAccId")?.value || "0") || null;
    const narration = document.getElementById("detailNarration")?.value?.trim() || null;
    const amount = parseFloat(document.getElementById("detailAmount")?.value || "0") || 0;

    const values = [];
    document.querySelectorAll("#voucherDetailsSection .detail-dynamic-field").forEach(el => {
        const fieldId = parseInt(el.dataset.fieldId || "0");
        if (!fieldId) return;

        if (el.type === "radio") {
            if (!el.checked) return;
            values.push({ FieldID: fieldId, ValueText: el.value || null, ValueNumber: null, ValueDate: null, ValueBit: null, RefID: null });
            return;
        }

        if (el.type === "checkbox") {
            values.push({ FieldID: fieldId, ValueText: null, ValueNumber: null, ValueDate: null, ValueBit: el.checked, RefID: null });
            return;
        }

        values.push({ FieldID: fieldId, ValueText: el.value || null, ValueNumber: null, ValueDate: null, ValueBit: null, RefID: null });
    });

    return [{
        DetailID: (voucherDetails[0] && voucherDetails[0].detailId) || 0,
        RowNo: 1,
        AccID: accId,
        Narration: narration,
        Amount: amount,
        Values: values
    }];
}

function validateVoucherDetails() {
    const errEl = document.getElementById("errVoucherDetails");
    errEl?.classList.add("d-none");

    const accId = parseInt(document.getElementById("detailAccId")?.value || "0");
    const amount = parseFloat(document.getElementById("detailAmount")?.value || "0");

    if (!accId) {
        if (errEl) { errEl.textContent = "Please select an account name."; errEl.classList.remove("d-none"); }
        return false;
    }
    if (amount <= 0) {
        if (errEl) { errEl.textContent = "Amount must be greater than 0."; errEl.classList.remove("d-none"); }
        return false;
    }
    return true;
}

// ========================================
// Save — CollectOffline first (actual fee collection / balances),
// then SaveFull (records the receipt as a Voucher/ledger entry).
// If CollectOffline fails, we stop — nothing is recorded as a
// voucher for a collection that never happened. If CollectOffline
// succeeds but SaveFull fails, the fee IS collected but not logged
// as a voucher — surfaced as a warning.
//
// Payload: FeesJson (JSON string of objects), matching what
// SP_STUDENT_FEE_COLLECT's @FEESJSON parses:
//   { DetailId, FeeHeadId, AddLess: 'A'|'L', ActualAmount, ReceivedAmount }
// A row from a loaded template has detailId set and feeHeadId null;
// an ad-hoc row added via "Select → Fee Head" has detailId null and
// feeHeadId set.
// ========================================
async function saveIssue() {
    // A voucher loaded from search is already saved — don't collect it twice.
    if (window.CURRENT_VOUCHER_HEADER_ID > 0) {
        Swal.fire('Already saved', 'This receipt is already saved. Refresh the page to create a new one.', 'info');
        return;
    }

    if (!validateVoucherDetails()) return;
    if (!window.CURRENT_STUDENT_ID) {
        Swal.fire('Select student', 'Please search and select a student first.', 'info');
        return;
    }
    if (feeHeadRows.length === 0) {
        Swal.fire('No fee heads', 'There is nothing to collect.', 'info');
        return;
    }

    const modeMap = {
        'Cash': 'Cash',
        'Cheque/DD': 'Cheque',
        'Debit/Credit': 'Card',
        'Cash+Cheque/DD': 'Cheque'   // TODO: still unresolved from earlier — see prior note
    };
    const uiMode = document.querySelector('input[name="paymentMode"]:checked')?.value || 'Cash';
    const paymentMode = modeMap[uiMode] || 'Cash';

    // Build FeesJson from the CURRENTLY VISIBLE feeHeadRows — one entry
    // per line, whether it came from a template (detailId set) or was
    // added ad-hoc via "Select → Fee Head" (feeHeadId set instead).
    const feesJson = feeHeadRows
        .filter(r => r.detailId !== null && r.detailId !== undefined
            || r.feeHeadId !== null && r.feeHeadId !== undefined)
        .map(r => ({
            DetailId: r.detailId ?? null,
            FeeHeadId: r.feeHeadId ?? null,
            AddLess: (r.addLess === 'Less' || r.addLess === 'L') ? 'L' : 'A',
            ActualAmount: r.actualAmount ?? 0,
            ReceivedAmount: r.received ?? 0
        }));

    if (feesJson.length === 0) {
        Swal.fire('No fee heads', 'There is nothing to collect.', 'info');
        return;
    }

    const paymentDate = document.getElementById('txtPaymentDate')?.value || document.getElementById('txtDate')?.value;
    if (!paymentDate) {
        Swal.fire('Date required', 'Please enter the payment date.', 'warning');
        return;
    }

    const collectPayload = {
        StudentId: window.CURRENT_STUDENT_ID,
        PaymentDate: paymentDate,
        PaymentMode: paymentMode,
        Note: document.getElementById('txtNarration')?.value || document.getElementById('txtRemarks')?.value || '',
        ChequeNo: document.getElementById('txtChqNo')?.value || null,
        ChequeDate: null,
        BankName: document.getElementById('txtDrawnOn')?.value || null,
        ReferenceNo: null,
        FeesJson: JSON.stringify(feesJson)   // sent as a JSON string for @FEESJSON NVARCHAR(MAX)
    };

    const saveBtn = document.querySelector('button[onclick="saveIssue()"]');
    saveBtn?.setAttribute('disabled', 'true');

    try {
        // ---------- STEP 1: Collect the fee ----------
        const collectRes = await fetch('/StudentFees/CollectOffline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(collectPayload)
        });

        if (!collectRes.ok) throw new Error(`Server returned ${collectRes.status}`);

        const collectResult = await collectRes.json();
        // SP returns RESULT = 0 on failure (see BEGIN CATCH), a
        // CollectionId (> 0) on success.
        if (!collectResult.success) {
            Swal.fire('Error!', collectResult.data?.message || collectResult.message || 'Unable to collect fee.', 'error');
            return;
        }

        // ---------- STEP 2: Record the receipt as a Voucher ----------
        const totalReceived = parseFloat(document.getElementById('txtReceivedAmount')?.value || '0') || 0;
        const accId = parseInt(document.getElementById('ddlAccount')?.value || '0') || null;
        const headerValues = collectDynamicFieldValues();

        const voucherPayload = {
            VoucherHeaderID: 0,
            VoucherId: 11,
            VoucherNo: document.getElementById('txtVoucherNo')?.value?.trim() || '',
            VoucherDate: document.getElementById('txtDate')?.value,
            VNo: document.getElementById('txtReceiptNo')?.value?.trim() || null,
            CostCenterID: null,
            ForType: 'Student',
            ForRefId: window.CURRENT_STUDENT_ID,
            TotalAmount: totalReceived,
            HeaderValues: headerValues,
            Details: buildDetailsPayload()
        };

        const voucherRes = await fetch('/VoucherHeader/SaveFull', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(voucherPayload)
        });
        if (!voucherRes.ok) throw new Error(`Server returned ${voucherRes.status}`);

        const voucherResult = await voucherRes.json();

        if (!voucherResult.success) {
            Swal.fire({
                icon: 'warning',
                title: 'Fee collected',
                text: 'But recording the voucher failed: ' + (voucherResult.message || 'Unknown error.'),
                confirmButtonText: 'OK'
            });
            return;
        }

        await Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: collectResult.data?.message || voucherResult.message || 'Fee receipt saved successfully.',
            confirmButtonText: 'OK'
        });
        window.location.reload();

    } catch (err) {
        console.error('saveIssue error:', err);
        Swal.fire('Error!', 'An unexpected error occurred while saving.', 'error');
    } finally {
        saveBtn?.removeAttribute('disabled');
    }
}

// ========================================
// Fee Head dropdown — loads options into a given <select> element
// ========================================
async function loadFeeHeadDropdown(selectElementId, companyId, sessionId) {
    const $select = document.getElementById(selectElementId);
    if (!$select) {
        console.warn(`loadFeeHeadDropdown: element #${selectElementId} not found`);
        return;
    }

    $select.innerHTML = '<option value="">Loading...</option>';

    try {
        const res = await fetch(`/FeeTemplate/GetFeeHeadDropdown?companyId=${encodeURIComponent(companyId)}&sessionId=${encodeURIComponent(sessionId)}`);
        const result = await res.json();

        $select.innerHTML = '<option value="">Select</option>';

        if (result.success && result.data && result.data.length > 0) {
            result.data.forEach(fh => {
                const opt = document.createElement('option');
                opt.value = fh.id;
                opt.textContent = fh.name;
                $select.appendChild(opt);
            });
        }
    } catch (err) {
        console.error('GetFeeHeadDropdown error:', err);
        $select.innerHTML = '<option value="">Select</option>';
        if (typeof alertError === 'function') {
            alertError('Failed to load Fee Head list.');
        } else {
            Swal.fire('Error', 'Failed to load Fee Head list.', 'error');
        }
    }
}

// ========================================
// Installment summary side panel (Instt. / Act. Amt / Subm. / Balance)
// ========================================
async function loadInstallmentSummary(studentId) {
    const body = document.getElementById('installmentSummaryBody');
    const totalActualEl = document.getElementById('sideTotalActual');
    const totalSubmEl = document.getElementById('sideTotalSubm');
    const totalBalanceEl = document.getElementById('sideTotalBalance');

    if (!body) return;

    if (!studentId) {
        body.innerHTML = `<tr><td colspan="4" class="text-center text-muted">—</td></tr>`;
        totalActualEl.textContent = '0';
        totalSubmEl.textContent = '0';
        totalBalanceEl.textContent = '0';
        return;
    }

    body.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Loading...</td></tr>`;

    try {
        const res = await fetch(`/FeeReceipt/GetStudentInstallmentSummary?studentid=${encodeURIComponent(studentId)}`);
        const result = await res.json();

        if (!result.success) {
            throw new Error(result.message || 'Unable to load installment summary.');
        }

        const rows = toArray(unwrapApiData(result.data));

        if (rows.length === 0) {
            body.innerHTML = `<tr><td colspan="4" class="text-center text-muted">—</td></tr>`;
            totalActualEl.textContent = '0';
            totalSubmEl.textContent = '0';
            totalBalanceEl.textContent = '0';
            return;
        }

        let sumActual = 0, sumSubm = 0, sumBalance = 0;

        body.innerHTML = rows.map(r => {
            const instt = r.instt ?? r.Instt ?? '-';
            const actAmt = r.actAmt ?? r.ActAmt ?? 0;
            const subm = r.subm ?? r.Subm ?? 0;
            const balance = r.balance ?? r.Balance ?? 0;

            sumActual += actAmt;
            sumSubm += subm;
            sumBalance += balance;

            const balanceClass = balance > 0 ? 'text-danger' : '';

            return `
                <tr>
                    <td>${escapeHtml(instt)}</td>
                    <td class="text-end">${actAmt.toFixed(2)}</td>
                    <td class="text-end">${subm.toFixed(2)}</td>
                    <td class="text-end ${balanceClass}">${balance.toFixed(2)}</td>
                </tr>
            `;
        }).join('');

        totalActualEl.textContent = sumActual.toFixed(2);
        totalSubmEl.textContent = sumSubm.toFixed(2);
        totalBalanceEl.textContent = sumBalance.toFixed(2);

    } catch (err) {
        console.error('GetStudentInstallmentSummary error:', err);
        body.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Unable to load</td></tr>`;
        totalActualEl.textContent = '0';
        totalSubmEl.textContent = '0';
        totalBalanceEl.textContent = '0';
    }
}

async function loadGetPaymentModeSummary() {
    const body = document.getElementById('paymentTotalsBody');

    if (!body) return;

    body.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Loading...</td></tr>`;

    try {
        const res = await fetch(`/FeeReceipt/GetPaymentModeSummary`);
        const result = await res.json();

        if (!result.success) {
            throw new Error(result.message || 'Unable to load installment summary.');
        }

        const rows = toArray(unwrapApiData(result.data));

        if (rows.length === 0) {
            body.innerHTML = `<tr><td colspan="4" class="text-center text-muted">—</td></tr>`;
            return;
        }

        body.innerHTML = rows.map(r => {
            const title = r.title ?? r.title ?? '-';
            const amount = r.amount ?? r.amount ?? 0;
            const count = r.count ?? r.count ?? 0;

            return `
                <tr>
                    <td>${escapeHtml(title)}</td>
                    <td class="text-end">${amount.toFixed(2)}</td>
                    <td class="text-end">${count}</td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error('GetPaymentModeSummary error:', err);
        body.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Unable to load</td></tr>`;
    }
}