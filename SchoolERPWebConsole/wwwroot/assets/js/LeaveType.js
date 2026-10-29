function triggerExport(index) {
    if ($.fn.DataTable.isDataTable("#tblLeaveType")) {
        const table = $("#tblLeaveType").DataTable();
        table.button(index).trigger();
    }
}
// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = "appliedFilters_leaveType";
let appliedFilters = {};
try {
    const stored = sessionStorage.getItem(FILTER_KEY);
    if (stored) appliedFilters = JSON.parse(stored);
} catch (e) {
    appliedFilters = {};
}

function saveAppliedFilters() {
    try {
        sessionStorage.setItem(FILTER_KEY, JSON.stringify(appliedFilters));
    } catch (e) {
        console.warn("sessionStorage unavailable");
    }
}

function clearAppliedFilters() {
    appliedFilters = {};
    try {
        sessionStorage.removeItem(FILTER_KEY);
    } catch (e) { }
}

function submitForm() {
    // Sync hidden form fields from dropdowns before submit
    const sessionEl = document.getElementById("ddlFilterSessions");
    const companyEl = document.getElementById("ddlFilterCompany");
    if (sessionEl) document.getElementById("hdnSessionID").value = sessionEl.value;
    if (companyEl) document.getElementById("hdnCompanyId").value = companyEl.value;
    const form = document.getElementById("frmSearch");
    const params = new URLSearchParams(new FormData(form)).toString();

    loadLeaveTypePartial(params);
}

function applyFilters() {
    const sessionEl = document.getElementById("ddlFilterSessions");
    const companyEl = document.getElementById("ddlFilterCompany");
    const searchEl = document.getElementById("txtSearchInput");

    // Search
    const searchVal = searchEl?.value.trim();
    if (searchVal) appliedFilters["txtSearchInput"] = { label: "Search", text: searchVal };
    else delete appliedFilters["txtSearchInput"];

    // Session
    if (sessionEl?.value && sessionEl.value !== "") {
        appliedFilters["ddlFilterSessions"] = {
            label: "Session",
            text: sessionEl.options[sessionEl.selectedIndex]?.text || sessionEl.value,
        };
    } else delete appliedFilters["ddlFilterSessions"];

    // Company
    if (companyEl?.value && companyEl.value !== "") {
        appliedFilters["ddlFilterCompany"] = {
            label: "Company",
            text: companyEl.options[companyEl.selectedIndex]?.text || companyEl.value,
        };
    } else delete appliedFilters["ddlFilterCompany"];

    saveAppliedFilters();
    renderFilterBadges();
}

function renderFilterBadges() {
    const container = document.getElementById("badgeContainer");
    const mainContainer = document.getElementById("activeFilterBadges");
    if (!container || !mainContainer) return;

    container.innerHTML = "";
    const activeCount = Object.keys(appliedFilters).length;

    Object.entries(appliedFilters).forEach(([id, { label, text }]) => {
        const badge = document.createElement("span");
        badge.className =
            "badge bg-primary-subtle text-primary border border-primary-subtle d-flex align-items-center gap-1 fw-medium px-2 py-1";
        badge.innerHTML = `${label}: ${text} <i class="ti ti-x ms-1 cursor-pointer" onclick="removeFilter('${id}')" style="font-size:10px;"></i>`;
        container.appendChild(badge);
    });

    mainContainer.style.display = activeCount > 0 ? "block" : "none";
}

function removeFilter(filterId) {
    // Clear the matching dropdown/input
    if (filterId === "ddlFilterSessions") {
        const el = document.getElementById("ddlFilterSessions");
        if (el) {
            el.value = "";
            if (window.jQuery && jQuery(el).data("select2")) jQuery(el).val("").trigger("change");
        }
    } else if (filterId === "ddlFilterCompany") {
        const el = document.getElementById("ddlFilterCompany");
        if (el) {
            el.value = "";
            if (window.jQuery && jQuery(el).data("select2")) jQuery(el).val("").trigger("change");
        }
    } else if (filterId === "txtSearchInput") {
        const el = document.getElementById("txtSearchInput");
        if (el) el.value = "";
        document.getElementById("hdnSearch").value = "";
    }
    delete appliedFilters[filterId];
    saveAppliedFilters();
    renderFilterBadges();
    document.getElementById("hdnPageIndex").value = 1;
    submitForm();
}

function resetAllFilters() {
    document.getElementById("txtSearchInput").value = "";
    document.getElementById("hdnSearch").value = "";

    ["ddlFilterSessions", "ddlFilterCompany"].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = "";
        if (window.jQuery && jQuery(el).data("select2")) jQuery(el).val("").trigger("change");
    });

    clearAppliedFilters();
    renderFilterBadges();
    document.getElementById("hdnPageIndex").value = 1;
    submitForm();
}

// ========================================
// DOMContentLoaded — init DataTable + UI
// ========================================
document.addEventListener("DOMContentLoaded", () => {
    var companyname = localStorage.getItem("comName");
    // ── DataTable (export only) ───────────────────────────────────────
    if ($.fn.DataTable.isDataTable("#tblLeaveType")) {
        $("#tblLeaveType").DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = "none";
    window.exportTable = $("#tblLeaveType").DataTable({
        dom: "Bfrtip",
        buttons: [
            { extend: "copy", title: `Leave Type - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: "csv", title: `Leave Type - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: "excel", title: `Leave Type - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: "pdf", title: `Leave Type - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: "print", title: `Leave Type - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false,
    });

    // ── Select2 ───────────────────────────────────────────────────────
    try {
        if (window.jQuery && typeof jQuery.fn.select2 === "function") {
            jQuery("#ddlFilterSessions, #ddlFilterCompany").select2({
                width: "100%",
                dropdownParent: jQuery("#filter-dropdown"),
                allowClear: true,
                placeholder: function () {
                    return jQuery(this).data("placeholder") || "Select";
                },
            });
        }
    } catch (e) {
        console.warn("Select2 init skipped:", e);
    }

    // ── Keep filter dropdown open while interacting inside ────────────
    document.getElementById("filter-dropdown")?.addEventListener("click", (e) => e.stopPropagation());

    // ── Apply Filters ─────────────────────────────────────────────────
    document.getElementById("btnApplyFilters")?.addEventListener("click", () => {
        document.getElementById("hdnPageIndex").value = 1;
        document.getElementById("hdnSearch").value = document.getElementById("txtSearchInput").value;
        applyFilters();
        renderFilterBadges();
        submitForm();
    });

    // ── Reset Filters ─────────────────────────────────────────────────
    document.getElementById("btnResetFilters")?.addEventListener("click", () => {
        document.getElementById("txtSearchInput").value = "";
        document.getElementById("hdnSearch").value = "";
        ["ddlFilterSessions", "ddlFilterCompany"].forEach((id) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.value = "";
            if (window.jQuery && jQuery(el).data("select2")) jQuery(el).val("").trigger("change");
        });
        clearAppliedFilters();
        renderFilterBadges();
        document.getElementById("hdnPageIndex").value = 1;
        submitForm();
    });

    // ── Render badges on load ─────────────────────────────────────────
    renderFilterBadges();
});

// ========================================
// Search input — debounced server submit
// ========================================
let searchTimer = null;

document.getElementById("txtSearchInput")?.addEventListener("input", function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        document.getElementById("hdnSearch").value = this.value;
        document.getElementById("hdnPageIndex").value = 1;

        // ── Sync search into appliedFilters before submit ─────────────
        const val = this.value.trim();
        if (val) appliedFilters["txtSearchInput"] = { label: "Search", text: val };
        else delete appliedFilters["txtSearchInput"];
        saveAppliedFilters(); // ← persist before submit
        renderFilterBadges();
        submitForm();
    }, 500);
});

let selectedId = 0;
const canEdit = window.canEdit;
const canDelete = window.canDelete;

function triggerExport(index) {
    if ($.fn.DataTable.isDataTable("#tblLeaveType")) {
        const table = $("#tblLeaveType").DataTable();
        table.button(index).trigger();
    }
}

$(document).ready(function () {
    $("#tblLeaveType").DataTable({
        dom: "Bfrtip",
        buttons: [
            { extend: "copy", exportOptions: { columns: [1] } },
            { extend: "csv", exportOptions: { columns: [1] } },
            { extend: "excel", exportOptions: { columns: [1] } },
            { extend: "pdf", exportOptions: { columns: [1] } },
            { extend: "print", exportOptions: { columns: [1] } },
        ],
        searching: false,
        paging: false,
        info: false,
    });

    $("#txtName").on("input", function () {
        this.value = this.value.replace(/[^a-zA-Z\s]/g, "");
    });
});

function selectItem(id, row) {
    selectedId = id;
    document.querySelectorAll(".item-row").forEach((r) => r.classList.remove("bg-light"));
    row.classList.add("bg-light");
    //row.querySelector('input[type="radio"]').checked = true;

    if (canEdit) {
        const btnEdit = document.getElementById("btnEdit");
        if (btnEdit) btnEdit.disabled = false;
    }
    if (canDelete) {
        const btnDelete = document.getElementById("btnDelete");
        if (btnDelete) btnDelete.disabled = false;
    }

    let checkedCount = $(".student-checkbox:checked").length;
    $("#btnDelete").prop("disabled", checkedCount === 0);
    // Edit sirf 1 record select hone par
    $("#btnEdit").prop("disabled", checkedCount !== 1);
    $("#btnActive").prop("disabled", checkedCount === 0);
    $("#btnInactive").prop("disabled", checkedCount === 0);
}

document.getElementById("txtSearchInput").addEventListener("keyup", function () {
    const q = this.value.toLowerCase();
    document.querySelectorAll("#tblLeaveType tbody tr").forEach((row) => {
        if (row.classList.contains("item-row")) {
            row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none";
        }
    });
});

function editSelected() {
    if (!selectedId) return;
    location.href = `/HumanResource/AddLeaveType/${selectedId}`;
}

function setFieldError(inputSel, errorSel, message, useSelect2 = false) {
    const $input = $(inputSel);
    const $error = $(errorSel);
    $error.text(message || "");

    if (useSelect2) {
        $input.next(".select2").find(".select2-selection").toggleClass("border-danger", !!message);
    } else {
        $input.toggleClass("is-invalid", !!message);
    }
}

function fnValidation() {
    let isValid = true;

    // Leave Type Name
    const leaveType = $("#txtLeaveTypeField").val();
    if (!leaveType) {
        setFieldError("#txtLeaveTypeField", "#leaveTypeFieldError", "Leave Type is required!", true);
        isValid = false;
    } else {
        setFieldError("#txtLeaveTypeField", "#leaveTypeFieldError", "", true);
    }

    // Leave Code
    const leaveCode = $("#txtLeaveCode").val()?.trim();
    if (!leaveCode) {
        setFieldError("#txtLeaveCode", "#leaveCodeError", "Leave Code is required!");
        isValid = false;
    } else if (leaveCode.length > 20) {
        setFieldError("#txtLeaveCode", "#leaveCodeError", "Leave Code cannot exceed 20 characters!");
        isValid = false;
    } else {
        setFieldError("#txtLeaveCode", "#leaveCodeError", "");
    }

    // Leave Type (field)
    const leaveTypeField = $("#txtLeaveTypeField").val()?.trim();
    if (!leaveTypeField) {
        setFieldError("#txtLeaveTypeField", "#leaveTypeFieldError", "Leave Type is required!");
        isValid = false;
    } else {
        setFieldError("#txtLeaveTypeField", "#leaveTypeFieldError", "");
    }
    // Leave Frequency (Monthly / Yearly)
    const leaveFrequency = $('input[name="leaveFrequency"]:checked').val();
    if (!leaveFrequency) {
        $("#leaveFrequencyError").text("Please select Monthly or Yearly!");
        isValid = false;
    } else {
        $("#leaveFrequencyError").text("");
    }
    // From Month / To Month
    const fromMonth = $("#ddlFromMonth").val();
    const toMonth = $("#ddlToMonth").val();
    if (!fromMonth) {
        setFieldError("#ddlFromMonth", "#fromMonthError", "From Month is required!");
        isValid = false;
    } else {
        setFieldError("#ddlFromMonth", "#fromMonthError", "");
    }

    if (!toMonth) {
        setFieldError("#ddlToMonth", "#toMonthError", "To Month is required!");
        isValid = false;
    } else if (fromMonth && parseInt(toMonth) < parseInt(fromMonth)) {
        setFieldError("#ddlToMonth", "#toMonthError", "To Month cannot be earlier than From Month!");
        isValid = false;
    } else {
        setFieldError("#ddlToMonth", "#toMonthError", "");
    }

    // Max Leave Per Month
    const maxLeaveRaw = $("#txtMaxLeavePerMonth").val();
    const maxLeave = parseFloat(maxLeaveRaw);
    if (maxLeaveRaw === "" || isNaN(maxLeave)) {
        setFieldError("#txtMaxLeavePerMonth", "#maxLeaveError", "Max Leave Per Month is required!");
        isValid = false;
    } else if (maxLeave < 0 || maxLeave > 999.99) {
        setFieldError("#txtMaxLeavePerMonth", "#maxLeaveError", "Enter a value between 0 and 999.99!");
        isValid = false;
    } else {
        setFieldError("#txtMaxLeavePerMonth", "#maxLeaveError", "");
    }

    return isValid;
}

async function saveRecord() {
    if (!fnValidation()) return;
    const form = document.getElementById("entryForm");
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    var leaveName = document.getElementById("txtLeaveTypeField").value.trim();
    var displayLabel = document.getElementById("txtDisplayLabel").value.trim();
    const data = {
        leaveTypeID: parseInt(document.getElementById("hdnLeaveTypeID").value) || 0,
        leaveTypeName: leaveName,
        displayLabel: displayLabel || leaveName,
        leaveCode: document.getElementById("txtLeaveCode").value.trim(),
        leaveType: $('input[name="leaveFrequency"]:checked').val() || "",
        fromMonth: parseInt(document.getElementById("ddlFromMonth").value) || 0,
        toMonth: parseInt(document.getElementById("ddlToMonth").value) || 0,
        maxLeavePerMonth: parseFloat(document.getElementById("txtMaxLeavePerMonth").value) || 0,
        isPaid: document.getElementById("chkIsPaid").checked,
        isActive: document.getElementById("chkActive").checked,
        companyID: parseInt(document.getElementById("hdnCompanyID").value) || 0,
        sessionID: parseInt(document.getElementById("hdnSessionID").value) || 0,
    };
    fetch("/UpsertLeaveType", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    })
        .then((r) => r.json())
        .then((res) => {
            if (res.success) {
                Swal.fire({
                    icon: "success",
                    title: "Saved!",
                    text: "Leave Type has been saved successfully.",
                    confirmButtonText: "OK",
                    customClass: { confirmButton: "btn btn-success" },
                    buttonsStyling: false,
                }).then(() => {
                    window.location.href = "/HumanResource/LeaveType";
                });
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: res.message || "Failed to save Leave Type.",
                    confirmButtonText: "OK",
                    customClass: { confirmButton: "btn btn-danger" },
                    buttonsStyling: false,
                });
            }
        });
}

function deleteSelected() {
    if (!selectedId) return;

    let selectedIds = [];
    $(".student-checkbox:checked").each(function () {
        selectedIds.push(parseInt($(this).val()));
    });
    if (selectedIds.length === 0) {
        alert("Please select at least one student.");
        return;
    }
    Swal.fire({
        title: "Are you sure?",
        text: "You are about to delete this student record. This action cannot be undone!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes, delete it!",
        customClass: {
            confirmButton: "btn btn-danger me-2",
            cancelButton: "btn btn-secondary",
        },
        buttonsStyling: false,
    }).then((result) => {
        if (result.isConfirmed) {
            $.ajax({
                url: "/HumanResource/DeleteLeaveType",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire("Deleted!", "Student record has been deleted.", "success").then(() =>
                            location.reload()
                        );
                    } else {
                        Swal.fire("Error!", res.message || "Failed to delete student.", "error");
                    }
                },
                error: function () {
                    Swal.fire("Error!", "An unexpected error occurred.", "error");
                },
            });
        }
    });
}

async function toggleStatus(id, isActive, checkboxEl) {
    //if (!permCanEdit) {
    //    IV.setNotice('classPageNotice', 'You do not have permission to change status.');
    //    if (checkboxEl) checkboxEl.checked = !isActive;
    //    location.reload();
    //    return;
    //}

    // ✅ collect both ids AND the actual checkbox elements
    let sectionIds = [];
    let checkedBoxes = [];
    $(".student-checkbox:checked").each(function () {
        sectionIds.push(parseInt($(this).val()));
        checkedBoxes.push(this);
    });

    // single-row toggle (checkboxEl passed from the row switch)
    if (sectionIds.length === 0) {
        if (id != 0) {
            sectionIds.push(parseInt(id));
            if (checkboxEl) checkedBoxes.push(checkboxEl);
        } else {
            showToast("Please select at least one user", false);
            return;
        }
    }

    const request = {
        ids: sectionIds.join(","),
        isActive: isActive,
    };

    // helper to revert every affected checkbox
    function revertAll() {
        checkedBoxes.forEach((cb) => {
            if (cb.classList.contains("student-checkbox")) {
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
            ? {
                icon: "question",
                title: "Activate Record(s)?",
                text: "Activating this record will make it visible and available for use across the system. Do you want to continue?",
                confirmText: "Yes, Activate",
                confirmBtnClass: "btn btn-success me-2",
                successTitle: "Activated Successfully!",
                successText: "The selected record(s) have been activated and are now available for use.",
            }
            : {
                icon: "warning",
                title: "Deactivate Record(s)?",
                text: "Deactivating this record will hide it from the system and prevent it from being used. Do you want to continue?",
                confirmText: "Yes, Deactivate",
                confirmBtnClass: "btn btn-danger me-2",
                successTitle: "Deactivated Successfully!",
                successText: "The selected record(s) have been deactivated and are no longer available for use.",
            };

        Swal.fire({
            icon: config.icon,
            title: config.title,
            text: config.text,
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, proceed!",
            customClass: { confirmButton: "btn btn-danger me-2", cancelButton: "btn btn-secondary" },
            buttonsStyling: false,
        }).then((result) => {
            if (result.isConfirmed) {
                $.ajax({
                    url: "/HumanResource/ToggleLeaveTypeStatus",
                    type: "POST",
                    contentType: "application/json",
                    data: JSON.stringify(request),
                    success: function (res) {
                        if (res.success) {
                            Swal.fire("Updated!", res.message || "Status updated successfully.", "success").then(() =>
                                location.reload()
                            );
                        } else {
                            revertAll();
                            updateButtonStates();
                            Swal.fire("Error!", res.message || "Failed to update status.", "error");
                        }
                    },
                    error: function (xhr) {
                        revertAll();
                        updateButtonStates();
                        console.error("Status update error:", xhr.status, xhr.responseText);
                        Swal.fire("Error!", "An unexpected error occurred.", "error");
                    },
                });
            } else {
                // Cancel clicked — revert whatever was optimistically toggled,
                // and fully resync selection state + buttons + row highlight.
                revertAll();
                selectedId = 0;
                window.selectedId = 0;
                document.querySelectorAll(".item-row").forEach((r) => r.classList.remove("bg-light"));
                updateButtonStates();
            }
        });
    } catch (err) {
        revertAll();
        console.error(err);
        IV.setNotice("sectionPageNotice", "Could not update status.");
        location.reload();
    }
}

function showToast(msg, type = "success") {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `<div class="toast align-items-center text-bg-${type} border-0 show position-fixed bottom-0 end-0 m-3" role="alert" style="z-index:9999">
            <div class="d-flex"><div class="toast-body">${msg}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div></div>`;
    document.body.appendChild(wrapper);
    setTimeout(() => wrapper.remove(), 3000);
}

// ========================================
// Partial reload — used by submitForm() for filter/search/pagination
// ========================================
function loadLeaveTypePartial(queryString) {
    const container = document.getElementById("leaveTypeTableContainer");
    if (!container) return;

    container.style.opacity = "0.5";

    fetch(`/HumanResource/GetLeaveTypePartial?${queryString}`, {
        method: "GET",
        headers: { "X-Requested-With": "XMLHttpRequest" },
    })
        .then((res) => {
            if (!res.ok) throw new Error("Failed to load subjects");
            return res.text();
        })
        .then((html) => {
            container.innerHTML = html;
            container.style.opacity = "1";
            updateButtonStates();
        })
        .catch((err) => {
            console.error(err);
            container.style.opacity = "1";
            if (window.toast) window.toast.error("Could not refresh the list.");
        });
}

// ✅ Pagination click interception, scoped to the hostel type container
document.addEventListener("click", function (e) {
    const link = e.target.closest("#leaveTypeTableContainer .page-link");
    if (!link || link.closest(".disabled")) return;

    e.preventDefault();
    const href = link.getAttribute("href");
    if (!href || href === "#") return;

    const query = href.split("?")[1] || "";
    document.getElementById("hdnPageIndex").value = new URLSearchParams(query).get("PageIndex") || 1;
    loadLeaveTypePartial(query);
    history.replaceState(null, "", href);
});

// ========================================
// Helpers
// ========================================
function updateButtonStates() {
    const count = $(".student-checkbox:checked").length;
    $("#btnEdit").prop("disabled", count !== 1);
    $("#btnDelete").prop("disabled", count === 0);
    $("#btnActive").prop("disabled", count === 0);
    $("#btnInactive").prop("disabled", count === 0);
}
