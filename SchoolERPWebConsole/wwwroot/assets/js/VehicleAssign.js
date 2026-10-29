let selectedRouteId = 0;

const currentUserId = window.currentUserId || 0;

// ============================================================
// DataTable Export
// ============================================================

let exportTable;

function triggerExport(type) {
    if (!exportTable) {
        return;
    }

    exportTable.button(".buttons-" + type).trigger();
}

// ============================================================
// DataTable Initialization
// ============================================================

$(document).ready(function () {
    $(".vehicleAssign-checkbox").prop("checked", false);
    $(".item-row").removeClass("bg-light");

    selectedRouteId = 0;

    if ($.fn.DataTable.isDataTable("#tblAssignments")) {
        $("#tblAssignments").DataTable().destroy();
    }

    $.fn.dataTable.ext.errMode = "none";

    exportTable = $("#tblAssignments").DataTable({
        dom: "Brtip",

        buttons: [
            { extend: "copy", title: "Vehicle Assignment List", exportOptions: { columns: [1, 2] } },
            { extend: "csv", title: "Vehicle Assignment List", exportOptions: { columns: [1, 2] } },
            { extend: "excel", title: "Vehicle Assignment List", exportOptions: { columns: [1, 2] } },
            { extend: "pdf", title: "Vehicle Assignment List", exportOptions: { columns: [1, 2] } },
            { extend: "print", title: "Vehicle Assignment List", exportOptions: { columns: [1, 2] } },
        ],

        searching: true,
        paging: false,
        info: false,
        ordering: false,

        language: {
            emptyTable: "No records found.",
            zeroRecords: "No records found.",
            search: "",
        },
    });

    // ========================================================
    // Custom Search
    // ========================================================

    $("#txtSearchInput").on("keyup", function () {
        exportTable.search($(this).val()).draw();
    });

    // ========================================================
    // Initial Button State
    // ========================================================

    updateButtonStates();
});

// ============================================================
// Select Route
// ============================================================

function selectRoute(routeId, row) {
    selectedRouteId = parseInt(routeId, 10) || 0;
    const checkbox = row.querySelector(".vehicleAssign-checkbox");
    if (!checkbox) {
        return;
    }
    checkbox.checked = !checkbox.checked;
    $(".item-row").removeClass("bg-light");
    if (checkbox.checked) {
        row.classList.add("bg-light");
    } else {
        selectedRouteId = 0;
    }

    updateButtonStates();
}

// ============================================================
// Checkbox Selection
// ============================================================

$(document).on("change", ".vehicleAssign-checkbox", function (e) {
    e.stopPropagation();
    const checkedBoxes = $(".vehicleAssign-checkbox:checked");
    $(".item-row").removeClass("bg-light");
    if (checkedBoxes.length === 1) {
        const checkbox = checkedBoxes.first();
        const row = checkbox.closest(".item-row");
        selectedRouteId = parseInt(row.attr("data-route-id") || "0", 10);
        row.addClass("bg-light");
    } else {
        selectedRouteId = 0;
    }
    updateButtonStates();
});

// ============================================================
// Update Action Buttons
// ============================================================

function updateButtonStates() {
    const checkedCount = $(".vehicleAssign-checkbox:checked").length;
    $("#btnDelete").prop("disabled", checkedCount === 0);
    $("#btnEdit").prop("disabled", checkedCount !== 1);
    $("#btnActive").prop("disabled", checkedCount === 0);
    $("#btnInactive").prop("disabled", checkedCount === 0);
}

// ============================================================
// Get Selected Assignment IDs
// ============================================================

function getSelectedAssignmentIds() {
    let ids = [];

    $(".vehicleAssign-checkbox:checked").each(function () {
        $(this)
            .val()
            .split(",")
            .forEach(function (value) {
                const id = parseInt(value, 10);

                if (!isNaN(id)) {
                    ids.push(id);
                }
            });
    });

    return ids;
}

// ============================================================
// Edit Selected
// ============================================================

function editSelected() {
    const checkedBoxes = $(".vehicleAssign-checkbox:checked");

    if (checkedBoxes.length !== 1) {
        Swal.fire("Oops!", "Please select one vehicle assignment to edit.", "warning");
        return;
    }

    const row = checkedBoxes.first().closest(".item-row");
    const routeId = parseInt(row.attr("data-route-id") || "0", 10);

    if (!routeId) {
        Swal.fire("Error!", "Route not found.", "error");
        return;
    }

    window.location.href = "/Transport/AddVehicleAssign/" + routeId;
}

// ============================================================
// Delete Selected
// ============================================================

function deleteSelected() {
    const selectedIds = getSelectedAssignmentIds();

    if (selectedIds.length === 0) {
        Swal.fire("Oops!", "Please select at least one assignment.", "warning");

        return;
    }

    Swal.fire({
        title: "Are you sure?",
        text: "You are about to delete the selected assignment(s). This action cannot be undone!",
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
            url: "/Transport/DeleteAssignment",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(selectedIds),
            success: function (res) {
                if (res.success) {
                    Swal.fire("Deleted!", res.message || "Assignment record(s) have been deleted.", "success").then(
                        function () {
                            location.reload();
                        }
                    );
                } else {
                    Swal.fire("Error!", res.message || "Failed to delete assignment.", "error");
                }
            },
            error: function (xhr) {
                console.error("Delete Assignment Error:", xhr.status, xhr.responseText);
                Swal.fire("Error!", "An unexpected error occurred.", "error");
            },
        });
    });
}

// ============================================================
// Toggle Assignment Status
// ============================================================

window.toggleStatus = async function (id, isActive) {
    const ids = id && id !== 0 ? [parseInt(id, 10)] : getSelectedAssignmentIds();

    if (ids.length === 0) {
        Swal.fire("Oops!", "Please select at least one assignment.", "warning");

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
            successTitle: "Activated!",
            successText: "The selected record(s) have been activated.",
        }
        : {
            icon: "warning",
            title: "Deactivate Record(s)?",
            text: "Deactivating will hide the selected record(s) and prevent them from being used. Continue?",
            confirmButtonText: "Yes, proceed!",
            confirmButtonColor: "#d33",
            successTitle: "Deactivated!",
            successText: "The selected record(s) have been deactivated.",
        };
    const result = await Swal.fire({
        icon: config.icon,
        title: config.title,
        text: config.text,
        showCancelButton: true,
        confirmButtonColor: config.confirmButtonColor,
        cancelButtonColor: "#3085d6",
        confirmButtonText: config.confirmButtonText,
        customClass: {
            confirmButton: "btn btn-danger me-2",
            cancelButton: "btn btn-secondary",
        },
        buttonsStyling: false,
    });

    if (!result.isConfirmed) {
        // Clear all selected checkboxes
        $(".vehicleAssign-checkbox").prop("checked", false);
        // Remove selected row highlight
        $(".item-row").removeClass("bg-light");
        // Reset selected values
        selectedRouteId = 0;
        // Reset action buttons
        updateButtonStates();
        // Row-level switch Cancel:
        // restore original switch state
        if (id && id !== 0) {
            location.reload();
        }
        return;
    }

    $.ajax({
        url: "/Transport/ToggleAssignmentStatus",
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
};
