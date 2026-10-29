// ============================================================
// BankClearing.js — server-rendered partial pattern (no pagination)
// ============================================================

let editMode = false;

document.addEventListener("DOMContentLoaded", function () {
    if ($.fn.select2) {
        $("#ddlClearingBank").select2({ width: "100%" });
    }
});

// ------------------------------------------------------------
// Search — submits the filter form's values to the partial
// endpoint via GET and swaps the table container, same pattern
// as loadVoucherHeaderPartial() in VoucherHeader.js.
// ------------------------------------------------------------
function searchClearingList() {

    const bankId = parseInt(document.getElementById("ddlClearingBank").value || "0");
    const errEl = document.getElementById("errClearingBank");

    if (!bankId) {
        errEl.classList.remove("d-none");
        document.getElementById("ddlClearingBank").classList.add("is-invalid");
        return;
    }
    errEl.classList.add("d-none");
    document.getElementById("ddlClearingBank").classList.remove("is-invalid");

    const form = document.getElementById("frmClearingFilter");
    const params = new URLSearchParams(new FormData(form)).toString();

    loadClearingPartial(params);
    history.replaceState(null, "", `?${params}`);
}

function loadClearingPartial(queryString) {

    const container = document.getElementById("ClearingTableContainer");
    if (!container) return;

    container.style.opacity = "0.5";

    fetch(`/VoucherHeader/GetAccountBankClearingPartial?${queryString}`, {
        method: "GET",
        headers: { "X-Requested-With": "XMLHttpRequest" }
    })
        .then(res => {
            if (!res.ok) throw new Error("Failed to load clearing list");
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            container.style.opacity = "1";
            editMode = false; // re-render starts locked; user hits Edit again to select rows
            syncEditModeUI();
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = "1";
            showClearingNotice("Could not refresh the clearing list.");
        });
}

// ------------------------------------------------------------
// Edit / Save
// ------------------------------------------------------------
function enableEditMode() {
    editMode = true;
    syncEditModeUI();
}

function syncEditModeUI() {
    document.querySelectorAll(".clearing-row-check").forEach(cb => {
        editMode ? cb.removeAttribute("disabled") : cb.setAttribute("disabled", "true");
    });

    const saveBtn = document.getElementById("btnSave");
    const editBtn = document.getElementById("btnEdit");
    if (saveBtn) editMode ? saveBtn.removeAttribute("disabled") : saveBtn.setAttribute("disabled", "true");
    if (editBtn) editMode ? editBtn.setAttribute("disabled", "true") : editBtn.removeAttribute("disabled");
}

function toggleSelectAll(master) {
    document.querySelectorAll(".clearing-row-check").forEach(cb => { cb.checked = master.checked; });
}

async function saveClearing() {

    const checked = Array.from(document.querySelectorAll(".clearing-row-check:checked"));

    if (!checked.length) {
        showClearingNotice("Please select at least one row to update.");
        return;
    }

    const clearingDateEl = document.getElementById("txtGlobalClearingDate");
    const clearingDate = clearingDateEl ? clearingDateEl.value : null;

    // Currently viewing the UnCleared tab + saving => marking rows Cleared.
    // Currently viewing the Cleared tab + saving => sending rows back to UnCleared.
    const cleared = document.getElementById("rdUnCleared").checked;

    if (cleared && !clearingDate) {
        showClearingNotice("Please set a clearing date.");
        return;
    }

    const detailIds = checked.map(cb => parseInt(cb.dataset.detailId));

    const payload = {
        DetailIdsJson: JSON.stringify(detailIds),
        ClearingDate: cleared ? clearingDate : null,
        Cleared: cleared,
        CompanyID: window.companyId || 0
    };

    const saveBtn = document.getElementById("btnSave");
    saveBtn?.setAttribute("disabled", "true");

    try {
        const response = await fetch("/VoucherHeader/SaveVoucherClearing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Server returned ${response.status}`);

        const res = await response.json();
        const success = res.success ?? res.data?.result === 1 ?? res.result === 1;

        if (success) {
            await Swal.fire({
                icon: "success",
                title: "Updated!",
                text: res.message || res.data?.message || "Clearing status updated.",
                confirmButtonText: "OK"
            });

            const form = document.getElementById("frmClearingFilter");
            const params = new URLSearchParams(new FormData(form)).toString();
            loadClearingPartial(params); // refresh — updated rows drop off the current filter
        }
        else {
            Swal.fire({ icon: "error", title: "Error", text: res.message || res.data?.message || "Failed to update clearing status." });
        }
    }
    catch (error) {
        console.error(error);
        Swal.fire("Error!", "An unexpected error occurred while saving.", "error");
    }
    finally {
        editMode = false;
        syncEditModeUI();
    }
}

// ------------------------------------------------------------
// Reset — clears filters and reloads the whole page (simplest,
// matches "Reset" semantics elsewhere in your app rather than a
// partial-only reset).
// ------------------------------------------------------------
function resetAllFilters() {
    window.location.href = "/VoucherHeader/BankClearing";
}

function showClearingNotice(message) {
    const el = document.getElementById("clearingPageNotice");
    if (!el) return;
    el.innerHTML = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
            ${escapeHtmlCl(message)}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>`;
}

function escapeHtmlCl(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}