const currentUserId = window.currentUserId;
let selectedId = 0;

// ============================================================
// DataTable Export
// ============================================================

function triggerExport(index) {
    if ($.fn.DataTable.isDataTable("#tblRoutes")) {
        const table = $("#tblRoutes").DataTable();
        table.button(index).trigger();
    }
}

// ============================================================
// DataTable Initialization
// ============================================================

$(document).ready(function () {
    // Destroy existing DataTable if already initialized
    if ($.fn.DataTable.isDataTable("#tblRoutes")) {
        $("#tblRoutes").DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = "none";
    // ========================================================
    // Initialize DataTable
    // ========================================================
    const routeTable = $("#tblRoutes").DataTable({
        // IMPORTANT:
        // "f" is NOT included, so DataTable's default search
        // box will NOT be displayed.
        dom: "Brtip",
        buttons: [
            { extend: "copy", title: "Route List", exportOptions: { columns: [1] } },
            { extend: "csv", title: "Route List", exportOptions: { columns: [1] } },
            { extend: "excel", title: "Route List", exportOptions: { columns: [1] } },
            { extend: "pdf", title: "Route List", exportOptions: { columns: [1] } },
            { extend: "print", title: "Route List", exportOptions: { columns: [1] } },
        ],

        searching: true,
        paging: false,
        info: false,
        language: {
            emptyTable: "No records found.",
            zeroRecords: "No records found.",
        },
    });

    // ========================================================
    // CUSTOM SEARCH BOX
    // ========================================================

    $("#txtSearchInput").on("keyup", function () {
        const searchValue = $(this).val().trim();
        routeTable.search(searchValue).draw();
    });

    // ========================================================
    // Initial Button State
    // ========================================================

    updateActionButtons();
});

// ============================================================
// Select Route
// ============================================================

function selectItem(id, row) {
    selectedId = parseInt(id);
    document.querySelectorAll(".item-row").forEach(function (r) {
        r.classList.remove("bg-light");
    });
    row.classList.add("bg-light");
    updateActionButtons();
}

// ============================================================
// Checkbox Selection
// ============================================================

$(document).on("change", ".routes-checkbox", function (e) {
    e.stopPropagation();
    const checkedBoxes = $(".routes-checkbox:checked");
    const checkedCount = checkedBoxes.length;
    if (checkedCount === 1) {
        selectedId = parseInt(checkedBoxes.first().val());
        $(".item-row").removeClass("bg-light");
        checkedBoxes.first().closest(".item-row").addClass("bg-light");
    } else {
        selectedId = 0;
        $(".item-row").removeClass("bg-light");
    }
    updateActionButtons();
});

// ============================================================
// Update Action Buttons
// ============================================================

function updateActionButtons() {
    const checkedCount = $(".routes-checkbox:checked").length;
    $("#btnDelete").prop("disabled", checkedCount === 0);
    $("#btnEdit").prop("disabled", checkedCount !== 1);
    $("#btnActive").prop("disabled", checkedCount === 0);
    $("#btnInactive").prop("disabled", checkedCount === 0);
}

// ============================================================
// Get Selected Route IDs
// ============================================================

function getSelectedRoutesIds() {
    let ids = [];

    $(".routes-checkbox:checked").each(function () {
        ids.push(parseInt($(this).val()));
    });
    return ids;
}

// ============================================================
// Edit Selected Route
// ============================================================

function editSelected() {
    if (selectedId === 0) {
        return;
    }
    location.href = "/Transport/AddRoute/" + selectedId;
}

// ============================================================
// Delete Selected Routes
// ============================================================

function deleteSelected() {
    const selectedIds = getSelectedRoutesIds();

    if (selectedIds.length === 0) {
        Swal.fire("Oops!", "Please select at least one Route.", "warning");
        return;
    }

    Swal.fire({
        title: "Are you sure?",
        text: "You are about to delete this Route record. This action cannot be undone!",
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
    }).then(function (result) {
        if (!result.isConfirmed) {
            return;
        }

        $.ajax({
            url: "/Transport/DeleteRoute",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(selectedIds),
            success: function (res) {
                if (res.success) {
                    Swal.fire("Deleted!", res.message || "Route record has been deleted.", "success").then(function () {
                        location.reload();
                    });
                } else {
                    Swal.fire("Error!", res.message || "Failed to delete Route.", "error");
                }
            },
            error: function (xhr) {
                console.error("Delete Route Error:", xhr.status, xhr.responseText);
                Swal.fire("Error!", "An unexpected error occurred.", "error");
            },
        });
    });
}

// ============================================================
// Toggle Route Status
// ============================================================

window.toggleStatus = async function (id, isActive) {
    const ids = id && id !== 0 ? [parseInt(id, 10)] : getSelectedRoutesIds();
    //const ids = id && id !== 0 ? [parseInt(id)] : getSelectedRoutesIds();

    if (ids.length === 0) {
        Swal.fire("Oops!", "Please select at least one Route.", "warning");
        return;
    }

    const request = {
        ids: ids.join(","),
        isActive: isActive,
        doneBy: currentUserId,
    };

    const config = isActive
        ? {
            icon: "question",
            title: "Activate Record(s)?",
            text: "Activating will make the selected record(s) visible and available for use across the system. Continue?",
            confirmButtonText: "Yes, proceed!",
            confirmButtonColor: "#198754",
            confirmButtonClass: "btn btn-danger me-2",
            successTitle: "Activated!",
            successText: "The selected record(s) have been activated.",
        }
        : {
            icon: "warning",
            title: "Deactivate Record(s)?",
            text: "Deactivating will hide the selected record(s) and prevent them from being used. Continue?",
            confirmButtonText: "Yes, proceed!",
            confirmButtonColor: "#d33",
            confirmButtonClass: "btn btn-danger me-2",
            successTitle: "Deactivated!",
            successText: "The selected record(s) have been deactivated.",
        };

    try {
        const result = await Swal.fire({
            icon: config.icon,
            title: config.title,
            text: config.text,
            showCancelButton: true,
            confirmButtonColor: config.confirmButtonColor,
            cancelButtonColor: "#3085d6",
            confirmButtonText: config.confirmButtonText,
            customClass: {
                confirmButton: config.confirmButtonClass,
                cancelButton: "btn btn-secondary",
            },
            buttonsStyling: false,
        });

        // ====================================================
        // Cancel
        // ====================================================

        if (!result.isConfirmed) {
            // Clear selected Route checkboxes
            $(".routes-checkbox").prop("checked", false);

            // Remove selected row highlight
            $(".item-row").removeClass("bg-light");

            // Reset selected ID
            selectedId = 0;

            // Update toolbar buttons
            updateActionButtons();

            return;
        }

        // ====================================================
        // AJAX
        // ====================================================

        $.ajax({
            url: "/Transport/ToggleRouteStatus",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(request),
            success: function (res) {
                if (res.success) {
                    Swal.fire(config.successTitle, res.message || config.successText, "success").then(function () {
                        location.reload();
                    });
                } else {
                    Swal.fire("Error!", res.message || "Failed to update status.", "error");
                }
            },
            error: function (xhr) {
                console.error("Status update error:", xhr.status, xhr.responseText);
                Swal.fire("Error!", "An unexpected error occurred.", "error");
            },
        });
    } catch (err) {
        console.error(err);
        Swal.fire("Error!", "Could not update status.", "error");
    }
};
