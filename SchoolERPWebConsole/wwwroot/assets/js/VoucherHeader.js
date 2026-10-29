
// ============================================================
// VoucherTypeFieldOption.js
// Handles: list export, filter badges, search, CRUD (Add/Edit/
// Delete/ToggleStatus) for tbl_mst_VoucherType_FieldOption,
// matching VoucherFieldOptionRequest exactly.
// ============================================================

function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#VoucherTypeFieldOptionTable')) {
        $('#VoucherTypeFieldOptionTable').DataTable().button(index).trigger();
    }
}

// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_voucherTypeFieldOption';
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
    const form = document.getElementById('frmSearch');
    const params = new URLSearchParams(new FormData(form)).toString();
    loadVoucherHeaderPartial(params);
}

function applyFilters() {
    const searchEl = document.getElementById('txtSearchInput');

    const searchVal = searchEl?.value.trim();
    if (searchVal) appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    else delete appliedFilters['txtSearchInput'];

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
    if (filterId === 'txtSearchInput') {
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

    clearAppliedFilters();
    renderFilterBadges();
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

// ========================================
// DOMContentLoaded — init DataTable + UI
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    var companyname = localStorage.getItem("comName");

    if ($.fn.DataTable.isDataTable('#VoucherTypeFieldOptionTable')) {
        $('#VoucherTypeFieldOptionTable').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#VoucherTypeFieldOptionTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Voucher Type Field Option - ${companyname}`, exportOptions: { columns: [1, 2, 3] } },
            { extend: 'csv', title: `Voucher Type Field Option - ${companyname}`, exportOptions: { columns: [1, 2, 3] } },
            { extend: 'excel', title: `Voucher Type Field Option - ${companyname}`, exportOptions: { columns: [1, 2, 3] } },
            { extend: 'pdf', title: `Voucher Type Field Option - ${companyname}`, exportOptions: { columns: [1, 2, 3] } },
            { extend: 'print', title: `Voucher Type Field Option - ${companyname}`, exportOptions: { columns: [1, 2, 3] } }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false
    });

    const d = window.editHeader;
    if (!d) return;

    document.getElementById('recordId').value = d.VoucherHeaderID;

    const mw = (d.ForType === 'Student' || d.ForType === 'Staff') ? d.ForType : '';

    // Show/hide the correct section immediately.
    $('#ddlForType').val(mw).trigger('change');
    handleMeetingWith(mw);

    if (mw === 'Student' && d.StudentID) {        
        $('#ddlStudent').val(d.StudentID).trigger('change');

    } else if (mw === 'Staff' && d.StaffID) {
        $('#ddlStaff').val(d.StaffID).trigger('change');
    }
});

let searchTimer = null;
document.getElementById('txtSearchInput')?.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        document.getElementById('hdnSearch').value = this.value;
        document.getElementById('hdnPageIndex').value = 1;
        submitForm();
    }, 500);
});

function selectItem(id, row) {
    //IV.clearNotice('classPageNotice');
    window.selectedOptionId = id;
    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));

    let checkedCount = $('.student-checkbox:checked').length;
    $('#btnDelete').prop('disabled', checkedCount === 0);
    $('#btnEdit').prop('disabled', checkedCount !== 1);
    $('#btnActive').prop('disabled', checkedCount === 0);
    $('#btnInactive').prop('disabled', checkedCount === 0);
}

async function editSelected() {
    //if (!permCanEdit) {
    //    IV.setNotice('classPageNotice', 'You do not have permission to edit.');
    //    return;
    //}
    if (window.selectedOptionId === 0) return;
    //IV.clearNotice('classPageNotice');
    try {
        if (window.selectedOptionId) {
            location.href = `/VoucherHeader/Add/${window.selectedOptionId}`;
        }
    } catch (err) {
        console.error(err);
    }
}

async function deleteSelected() {
    //if (!permCanDelete) {
    //    IV.setNotice('classPageNotice', 'You do not have permission to delete.');
    //    return;
    //}

    let selectedIds = [];
    $('.student-checkbox:checked').each(function () {
        selectedIds.push(parseInt($(this).val()));
    });
    if (selectedIds.length === 0) {
        alert("Please select at least one option.");
        return;
    }

    $('#btnActive, #btnInactive, #btnDelete').prop('disabled', true);

    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to delete this voucher type field option record. This action cannot be undone!",
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
                url: '/VoucherHeader/Delete',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Voucher type field option record has been deleted.', 'success')
                            .then(() => submitForm());
                    } else {
                        updateButtonStates();
                        Swal.fire('Error!', res.message || 'Failed to delete voucher type field option.', 'error');
                    }
                },
                error: function () {
                    updateButtonStates();
                    Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                }
            });
        } else {
            updateButtonStates();
        }
    });
}

// ============================================================
// VoucherHeader.js
// Dynamic voucher header fields + dropdown options
// ============================================================

let dynamicFields = [];
let dynamicFieldsLoaded = false;

// ------------------------------------------------------------
// Voucher Details grid state
// ------------------------------------------------------------
let detailFieldDefs = [];       // dynamic fields with Section = 'DETAIL'
let voucherDetails = [];        // rows currently in the grid
let editingDetailIndex = -1;    // -1 = entry row is adding a new row
let accountHeadOptions = [];    // loaded once, shared by every row's Account Name select

// ------------------------------------------------------------
// Page load
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {

    const voucherType = document.getElementById("ddlVoucherType");

    if ($.fn.select2) {
        $("#ddlVoucherType").select2();
        $("#ddlCostCenter").select2();
    }

    if (voucherType && parseInt(voucherType.value || "0") > 0) {
        loadVoucherDynamicFields();
    }

    loadAccountHeadOptions();
    hydrateVoucherDetailsFromServer();

    bindVoucherValidationClear();
});

// ------------------------------------------------------------
// Normalize API payloads into a real array
// (handles null, a single object, or .NET's { $values: [...] }
// reference-preserving JSON shape)
// ------------------------------------------------------------
function toArray(value) {

    if (Array.isArray(value)) return value;

    if (value && Array.isArray(value.$values)) {
        return value.$values;
    }

    if (value && typeof value === "object") {
        return Object.values(value);
    }

    return [];
}

// ------------------------------------------------------------
// Unwrap nested API envelopes, e.g. { success, message, data, errors }
// wrapped around the actual payload (possibly more than once)
// ------------------------------------------------------------
function unwrapApiData(payload) {

    let current = payload;
    let guard = 0;

    while (
        current &&
        !Array.isArray(current) &&
        typeof current === "object" &&
        "data" in current &&
        guard < 5
    ) {
        current = current.data;
        guard++;
    }

    return current;
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

    const voucherId =
        parseInt(document.getElementById("ddlVoucherType")?.value || "0");

    const container =
        document.getElementById("dynamicFieldsContainer");

    const loader =
        document.getElementById("dynamicFieldsLoader");

    const empty =
        document.getElementById("dynamicFieldsEmpty");

    if (!container) return;

    if (voucherId <= 0) {
        dynamicFields = [];
        dynamicFieldsLoaded = false;
        detailFieldDefs = [];

        container.innerHTML = `
            <div class="col-12 text-muted">
                Select a voucher type to load dynamic fields.
            </div>`;

        updateDynamicFieldCount();
        renderVoucherDetailsSection();
        return;
    }

    if (loader) loader.classList.remove("d-none");
    container.innerHTML = "";

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
        if (loader) loader.classList.add("d-none");
        updateDynamicFieldCount();
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

// ------------------------------------------------------------
// Dropdown
//
// data-linked-child carries the FieldCode of the sibling dropdown
// this field controls (e.g. Expense For -> Expense For Value),
// as configured on the field definition (linkedChildFieldCode).
// Empty when the field is not a type-selector - harmless either way.
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
//
// NOTE: every option renders its own <input> and they all share the
// SAME data-field-id (that's correct for a radio group), plus
// data-field-code / data-linked-child so wireLinkedTypeFields() can
// treat a radio-group type-selector the same way it treats a
// dropdown type-selector.
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
//
// Any DROPDOWN or RADIOBUTTON/RADIO field whose definition carries
// linkedChildFieldCode is treated as a type-selector (e.g. Expense
// For: Student/Staff). On change, it calls
// SP_VoucherFieldOption_GetLinkedOptions (via
// /VoucherHeader/GetLinkedFieldOptions) to fetch the option list
// configured against the SELECTED OPTION ROW (LinkedSourceTable /
// LinkedSourceValueCol / LinkedSourceTextCol on
// tbl_mst_VoucherType_FieldOption), then rebinds the sibling field
// identified by linkedChildFieldCode.
//
// Nothing here is hardcoded to a FieldID, voucher type, or option
// value (STUDENT/STAFF/etc) - it works for any field configured
// this way, on any voucher type.
//
// IMPORTANT: a radio-group type field renders ONE <input> PER
// OPTION, all sharing the same data-field-id. document.querySelector
// only ever returns the first DOM match, so a naive single-element
// lookup would (a) only ever attach the change listener to the first
// radio option, and (b) always read that first option's static
// `value` attribute instead of whichever option is actually checked.
// We therefore collect ALL matching elements, wire every one of
// them, and resolve the "current value" by checking which one (if
// any) is actually checked.
//
// scopeSelector: CSS selector for the container holding both the
//                type field and its linked child (e.g.
//                "#dynamicFieldsContainer" for header fields, or
//                "#voucherDetailsEntryRow" for a DETAIL-section field).
// fieldDefs:     the array of field definitions rendered into that
//                scope (headerFields or detailFieldDefs).
// ------------------------------------------------------------
function wireLinkedTypeFields(scopeSelector, fieldDefs) {

    const container = document.querySelector(scopeSelector);
    if (!container) return;

    // Index every "type selector" field (one with a linkedChildFieldCode)
    // by fieldID, so the single delegated listener below can look up
    // the right field/child no matter which radio option or select
    // fired the change.
    const linkedFieldsById = {};
    (fieldDefs || []).forEach(field => {
        if (field.linkedChildFieldCode) {
            linkedFieldsById[field.fieldID] = field;
        }
    });

    // Works for both a <select> (single element) and a radio group
    // (multiple elements sharing the same data-field-id, only one of
    // which is checked).
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

    // ------------------------------------------------------------
    // Delegated listener, bound to the CONTAINER, not to the radio/
    // select inputs themselves.
    //
    // Why: the individual inputs get destroyed and recreated by
    // innerHTML on every render (especially the details entry row,
    // which re-renders on every add/edit/cancel). Binding straight to
    // those elements means either (a) you must re-wire every render,
    // risking duplicate listeners on any element that happens to
    // survive a render, or (b) you skip re-wiring via a "wired" flag,
    // which breaks the moment the element is actually a fresh one
    // without that flag.
    //
    // The container itself (#dynamicFieldsContainer,
    // #voucherDetailsEntryRow, ...) is never replaced - only its
    // children are - so we can safely guard registration on the
    // container ONCE, ever, and let normal event bubbling route any
    // radio/select change to this one listener regardless of how many
    // times its children get torn down and rebuilt.
    // ------------------------------------------------------------
    if (!container.dataset.linkedDelegated) {
        container.dataset.linkedDelegated = "1";

        container.addEventListener("change", (e) => {

            const fieldId = parseInt(e.target?.dataset?.fieldId || "0");
            if (!fieldId || !linkedFieldsById[fieldId]) return;

            refreshFieldById(fieldId);
        });
    }

    // Edit mode / initial render: any type field that already has a
    // saved value should refresh its child once, preselecting
    // whatever was previously saved on that child field.
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

// ------------------------------------------------------------
// Load Account Head options (once) for the Account Name column.
// Backed by USP_GetMasterTableOptions / vw_ACC_AccountHead_Options
// on the server - wire GetAccountHeadOptions to that in your API.
// ------------------------------------------------------------
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

    // Options may have arrived after the grid's first render.
    renderVoucherDetailsSection();
}

// ------------------------------------------------------------
// If the server pre-loaded existing detail rows for edit mode
// (window.voucherDetailRows / window.voucherDetailValues, the same
// way window.dynamicFieldValues works for header fields), hydrate
// the grid from them.
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
// Render the whole Voucher Details card: table head (with any
// dynamic DETAIL columns), the editable entry row, and the
// already-added rows.
// ------------------------------------------------------------
function renderVoucherDetailsSection() {

    const container = document.getElementById("voucherDetailsSection");
    if (!container) return;

    const extraHeaders = detailFieldDefs
        .map(f => `<th>${escapeHtml(f.fieldLabel || f.fieldCode || "")}</th>`)
        .join("");

    container.innerHTML = `
        <div class="table-responsive">
            <table class="table" id="voucherDetailsTable">
                <thead>
                    <tr class="bg-light">
                        <th style="width:36px;">#</th>
                        <th style="width:36px;">#</th>
                        <th>AccID</th>
                        <th>Account Name <span class="text-danger">*</span></th>
                        <th>Narration</th>
                        ${extraHeaders}
                        <th class="text-end">Amount <span class="text-danger">*</span></th>
                        <th style="width:36px;">#</th>
                    </tr>
                </thead>
                <tbody id="voucherDetailsEntryRow"></tbody>
                <tbody id="voucherDetailsRows"></tbody>
            </table>
        </div>
        <div class="text-danger small mt-1 d-none" id="errVoucherDetails"></div>
    `;

    renderDetailEntryRow();
    renderDetailRowsTable();
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

    // Same generic linked-dropdown/radio wiring, applied to any
    // DETAIL-section field configured with linkedChildFieldCode. Safe
    // to call on every re-render - wireLinkedTypeFields skips fields
    // already wired.
    wireLinkedTypeFields("#voucherDetailsEntryRow", detailFieldDefs);
}

// ------------------------------------------------------------
// Simplified per-row dynamic field input (DETAIL-section fields).
// Supports the common types; falls back to text for anything else.
//
// RADIOBUTTON/RADIO fields (e.g. a DETAIL-level Expense For:
// Student/Staff selector) are rendered as a genuine radio group here
// with data-field-code / data-linked-child, the same way the header
// fields are, so wireLinkedTypeFields() can find and drive them and
// GetLinkedFieldOptions actually gets called on change.
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

        // Unique-enough group name per row render so multiple rows
        // (or add-vs-edit re-renders) never collide on radio "name".
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

    // A DETAIL-level radio group renders one <input> per option, all
    // sharing the same data-field-id. Only the checked option should
    // contribute a value - unchecked siblings must be skipped, or
    // whichever one happens to come last in DOM order would silently
    // overwrite the actual selection.
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

// ------------------------------------------------------------
// Load a row's values back into the entry row for editing.
// ------------------------------------------------------------
function editDetailRow(index) {
    editingDetailIndex = index;
    renderDetailEntryRow();
}

function cancelDetailEdit() {
    editingDetailIndex = -1;
    renderDetailEntryRow();
}

// ------------------------------------------------------------
// Remove a row from the grid.
// ------------------------------------------------------------
function removeDetailRow(index) {

    voucherDetails.splice(index, 1);

    if (editingDetailIndex === index) {
        editingDetailIndex = -1;
    }

    renumberDetailRows();
    renderVoucherDetailsSection();
    recalcTotalAmount();
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

// ------------------------------------------------------------
// Keep the header's read-only Total Amount in sync with the grid.
// ------------------------------------------------------------
function recalcTotalAmount() {

    const total = voucherDetails.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

    const totalEl = document.getElementById("txtTotalAmount");
    if (totalEl) totalEl.value = total.toFixed(2);
}

// ------------------------------------------------------------
// Shape voucherDetails into the JSON SaveFull expects.
// ------------------------------------------------------------
function buildDetailsPayload() {

    return voucherDetails.map(row => ({
        DetailID: row.detailId || 0,
        RowNo: row.rowNo,
        AccID: row.accId,
        Narration: row.narration || null,
        Amount: row.amount || 0,
        // NOTE: this key MUST be "Values" (not "DetailValues") - it has
        // to match both the C# model property SaveFull binds to and the
        // stored procedure's JSON_QUERY(@row,'$.Values') read. A mismatch
        // here silently drops every row-level dynamic field value: the
        // browser payload looks correct, but the server never sees them.
        Values: Object.keys(row.detailValues || {}).map(fieldId => ({
            FieldID: parseInt(fieldId),
            ValueText: typeof row.detailValues[fieldId] === "boolean" ? null : (row.detailValues[fieldId] || null),
            ValueNumber: null,
            ValueDate: null,
            ValueBit: typeof row.detailValues[fieldId] === "boolean" ? row.detailValues[fieldId] : null,
            RefID: null
        }))
    }));
}

// ------------------------------------------------------------
// Save
// ------------------------------------------------------------
async function saveVoucherold() {

    if (!validateVoucherHeader()) {
        return;
    }

    const rawRecordId = document.getElementById("recordId")?.value;

    const id =
        rawRecordId &&
            rawRecordId !== "undefined" &&
            rawRecordId !== "null"
            ? Number(rawRecordId)
            : 0;

    const isEdit = id > 0;

    if (isEdit && !window.canEdit) {
        showVoucherNotice("You do not have permission to edit.");
        return;
    }

    if (!isEdit && !window.canAdd) {
        showVoucherNotice("You do not have permission to add.");
        return;
    }

    const headerValues = collectDynamicFieldValues();

    // ForType is a text value ("Student" / "Staff"), not a numeric ID -
    // parseInt() on it is always NaN, so read it as a plain string.
    // ForRefId then comes from whichever of ddlStudent / ddlStaff
    // actually applies to the selected ForType.
    const forType =
        document.getElementById("ddlForType")?.value || null;

    let forRefId = null;

    if (forType === "Student") {
        forRefId =
            parseInt(document.getElementById("ddlStudent")?.value || "0") || null;
    }
    else if (forType === "Staff") {
        forRefId =
            parseInt(document.getElementById("ddlStaff")?.value || "0") || null;
    }

    const payload = {
        VoucherHeaderID: id,

        VoucherId:
            parseInt(document.getElementById("ddlVoucherType").value || "0"),

        VoucherNo:
            document.getElementById("txtVoucherNo").value.trim(),

        VoucherDate:
            document.getElementById("txtVoucherDate").value,

        VNo:
            document.getElementById("txtVNo").value.trim() || null,

        CostCenterID:
            parseInt(document.getElementById("ddlCostCenter").value || "0") || null,

        ForType: forType,

        ForRefId: forRefId,

        TotalAmount:
            parseFloat(document.getElementById("txtTotalAmount").value || "0") || 0,

        HeaderValues: headerValues,

        Details: buildDetailsPayload()
    };

    const saveButton =
        document.querySelector('button[onclick="saveVoucher()"]');

    saveButton?.setAttribute("disabled", "true");

    try {

        const response = await fetch(
            "/VoucherHeader/SaveFull",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            }
        );

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const res = await response.json();

        if (res.success) {

            await Swal.fire({
                icon: "success",
                title: "Saved!",
                text: res.message || "Voucher saved successfully.",
                confirmButtonText: "OK",
                customClass: {
                    confirmButton: "btn btn-success"
                },
                buttonsStyling: false
            });

            window.location.href = "/VoucherHeader/Index";
        }
        else {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: res.message || "Failed to save voucher.",
                confirmButtonText: "OK",
                customClass: {
                    confirmButton: "btn btn-danger"
                },
                buttonsStyling: false
            });
        }
    }
    catch (error) {

        console.error(error);

        Swal.fire(
            "Error!",
            "An unexpected error occurred while saving.",
            "error"
        );
    }
    finally {
        saveButton?.removeAttribute("disabled");
    }
}
async function saveVoucher() {

    if (!validateVoucherHeader()) {
        return;
    }

    const rawRecordId = document.getElementById("recordId")?.value;

    const id =
        rawRecordId &&
            rawRecordId !== "undefined" &&
            rawRecordId !== "null"
            ? Number(rawRecordId)
            : 0;

    const isEdit = id > 0;

    if (isEdit && !window.canEdit) {
        showVoucherNotice("You do not have permission to edit.");
        return;
    }

    if (!isEdit && !window.canAdd) {
        showVoucherNotice("You do not have permission to add.");
        return;
    }

    const headerValues = collectDynamicFieldValues();

    const forType = document.getElementById("ddlForType")?.value || null;

    let forRefId = null;
    if (forType === "Student") {
        forRefId = parseInt(document.getElementById("ddlStudent")?.value || "0") || null;
    }
    else if (forType === "Staff") {
        forRefId = parseInt(document.getElementById("ddlStaff")?.value || "0") || null;
    }

    const payload = {
        VoucherHeaderID: id,
        VoucherId: parseInt(document.getElementById("ddlVoucherType").value || "0"),
        VoucherNo: document.getElementById("txtVoucherNo").value.trim(),
        VoucherDate: document.getElementById("txtVoucherDate").value,
        VNo: document.getElementById("txtVNo").value.trim() || null,
        CostCenterID: parseInt(document.getElementById("ddlCostCenter").value || "0") || null,
        ForType: forType,
        ForRefId: forRefId,
        TotalAmount: parseFloat(document.getElementById("txtTotalAmount").value || "0") || 0,
        HeaderValues: headerValues,
        Details: buildDetailsPayload()
    };

    const saveButton = document.querySelector('button[onclick="saveVoucher()"]');
    saveButton?.setAttribute("disabled", "true");

    try {
        // ---------- STEP 1: Save header ----------
        const response = await fetch("/VoucherHeader/SaveFull", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const res = await response.json();

        if (!res.success) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: res.message || "Failed to save voucher.",
                confirmButtonText: "OK",
                customClass: { confirmButton: "btn btn-danger" },
                buttonsStyling: false
            });
            return;
        }

        const voucherHeaderId = res.voucherHeaderId;

        // ---------- STEP 2: Upload attachment (only if a file was chosen) ----------
        const fileInput = document.getElementById("voucherAttachmentFile");
        const file = fileInput?.files?.[0];

        if (file && voucherHeaderId > 0) {

            const formData = new FormData();
            formData.append("voucherHeaderId", voucherHeaderId);
            formData.append("attachmentFile", file);

            const uploadResponse = await fetch("/VoucherHeader/UploadAttachment", {
                method: "POST",
                body: formData // no Content-Type header — browser sets the multipart boundary
            });

            if (!uploadResponse.ok) {
                throw new Error(`Server returned ${uploadResponse.status}`);
            }

            const uploadRes = await uploadResponse.json();

            if (!uploadRes.success) {
                // Header is already saved at this point — surface the upload
                // failure separately instead of treating the whole save as failed.
                Swal.fire({
                    icon: "warning",
                    title: "Voucher saved",
                    text: "But attachment upload failed: " + (uploadRes.message || "Unknown error."),
                    confirmButtonText: "OK"
                });
                return;
            }
        }

        // ---------- Both steps done ----------
        await Swal.fire({
            icon: "success",
            title: "Saved!",
            text: res.message || "Voucher saved successfully.",
            confirmButtonText: "OK",
            customClass: { confirmButton: "btn btn-success" },
            buttonsStyling: false
        });

        window.location.href = "/VoucherHeader/Index";
    }
    catch (error) {
        console.error(error);
        Swal.fire("Error!", "An unexpected error occurred while saving.", "error");
    }
    finally {
        saveButton?.removeAttribute("disabled");
    }
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

            // Radio groups render one input per option, all sharing
            // the same fieldId - only the checked one carries the value,
            // and unchecked siblings must be skipped entirely.
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

                // A radio group has several inputs sharing the same
                // fieldId - only evaluate the group once.
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
// Reset
// ------------------------------------------------------------
function resetVoucherForm() {

    document.getElementById("voucherHeaderForm")?.reset();

    $("#ddlVoucherType").val("0").trigger("change");
    $("#ddlCostCenter").val("0").trigger("change");

    document.getElementById("txtTotalAmount").value = "0";

    clearAllVoucherErrors();

    document.getElementById("dynamicFieldsContainer").innerHTML = `
        <div class="col-12 text-muted">
            Select a voucher type to load dynamic fields.
        </div>
    `;

    dynamicFields = [];
    dynamicFieldsLoaded = false;
    updateDynamicFieldCount();

    detailFieldDefs = [];
    voucherDetails = [];
    editingDetailIndex = -1;
    renderVoucherDetailsSection();
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function showVoucherError(inputId, errorId, message) {

    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);

    input?.classList.add("is-invalid");

    if (error) {
        error.textContent = message;
        error.classList.remove("d-none");
    }
}

function clearVoucherError(inputId, errorId) {

    document.getElementById(inputId)
        ?.classList.remove("is-invalid");

    document.getElementById(errorId)
        ?.classList.add("d-none");
}

function clearAllVoucherErrors() {

    document
        .querySelectorAll("#voucherHeaderForm .is-invalid")
        .forEach(x => x.classList.remove("is-invalid"));

    document
        .querySelectorAll("#voucherHeaderForm .text-danger")
        .forEach(x => {
            if (x.id.startsWith("err")) {
                x.classList.add("d-none");
            }
        });
}

function bindVoucherValidationClear() {

    [
        "ddlVoucherType",
        "txtVoucherNo",
        "txtVoucherDate"
    ].forEach(id => {

        const el = document.getElementById(id);

        el?.addEventListener(
            id === "ddlVoucherType" ? "change" : "input",
            function () {

                const errorMap = {
                    ddlVoucherType: "errVoucherType",
                    txtVoucherNo: "errVoucherNo",
                    txtVoucherDate: "errVoucherDate"
                };

                clearVoucherError(
                    id,
                    errorMap[id]
                );
            }
        );
    });
}

function updateDynamicFieldCount() {

    const el =
        document.getElementById("dynamicFieldCount");

    if (!el) return;

    // Section value is "GRID" (matches loadVoucherDynamicFields' filter),
    // not the old "DETAIL" - kept in sync so the header badge count
    // doesn't include grid-level fields.
    const count = dynamicFields.filter(
        f => (f.section || "HEADER").toUpperCase() !== "DETAIL"
    ).length;

    el.textContent =
        `${count} Field${count === 1 ? "" : "s"}`;
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

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function handleMeetingWith(val) {
    document.getElementById('studentSelection').classList.toggle('d-none', val !== 'Student');
    document.getElementById('staffSelection').classList.toggle('d-none', val !== 'Staff');

    if (val === 'Student') {
        document.getElementById('ddlStudent').setAttribute('required', 'required');
        document.getElementById('ddlStaff').removeAttribute('required');
    } else if (val === 'Staff') {
        document.getElementById('ddlStaff').setAttribute('required', 'required');
        document.getElementById('ddlStudent').removeAttribute('required');
    } else {
        document.getElementById('ddlStudent').removeAttribute('required');
        document.getElementById('ddlStaff').removeAttribute('required');
    }
}
// ========================================
// Partial reload — used by submitForm() for filter/search/pagination
// ========================================
function loadVoucherHeaderPartial(queryString) {
    const container = document.getElementById('VoucherHeaderTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/VoucherHeader/GetVoucherHeaderPartial?${queryString}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to load voucher type field options');
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

// Pagination click interception, scoped to this container
document.addEventListener('click', function (e) {
    const link = e.target.closest('#VoucherHeaderTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('PageIndex') || 1;
    loadVoucherHeaderPartial(query);
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