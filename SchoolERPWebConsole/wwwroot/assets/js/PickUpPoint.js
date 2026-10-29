const currentUserId = window.currentUserId;

let selectedId = 0;

// ============================================================
// DataTable Export
// ============================================================

function triggerExport(index) {
    if ($.fn.DataTable.isDataTable("#tblPickupPoint")) {
        const table = $("#tblPickupPoint").DataTable();

        table.button(index).trigger();
    }
}

// ============================================================
// DataTable Initialization
// ============================================================

$(document).ready(function () {

    // ========================================================
    // Clear Selection on Page Load / Refresh
    // ========================================================

    $(".pickPoint-checkbox").prop("checked", false);
    $(".item-row").removeClass("bg-light");
    selectedId = 0;

    // ========================================================
    // DataTable
    // ========================================================

    if ($.fn.DataTable.isDataTable("#tblPickupPoint")) {
        $("#tblPickupPoint").DataTable().destroy();
    }

    $.fn.dataTable.ext.errMode = "none";

    const pickupPointTable = $("#tblPickupPoint").DataTable({
        dom: "Brtip",

        buttons: [{ extend: "copy", title: "Pickup Point List", exportOptions: { columns: [1, 2, 3], }, },
        { extend: "csv", title: "Pickup Point List", exportOptions: { columns: [1, 2, 3], }, },
        { extend: "excel", title: "Pickup Point List", exportOptions: { columns: [1, 2, 3], }, },
        { extend: "pdf", title: "Pickup Point List", exportOptions: { columns: [1, 2, 3], }, },
        { extend: "print", title: "Pickup Point List", exportOptions: { columns: [1, 2, 3], }, },
        ],

        searching: true,
        paging: false,
        info: false,

        language: {
            emptyTable: "No records found.",
            zeroRecords: "No records found.",
            search: "",
        },
    });

    // ========================================================
    // Custom Search Box
    // ========================================================

    $("#txtSearchInput").on("keyup", function () {
        pickupPointTable.search($(this).val()).draw();
    });

    // ========================================================
    // Initial Button State
    // ========================================================

    updateActionButtons();
});

// ============================================================
// Select Pickup Point
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

$(document).on("change", ".pickPoint-checkbox", function (e) {
    e.stopPropagation();

    const checkedBoxes = $(".pickPoint-checkbox:checked");

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
    const checkedCount = $(".pickPoint-checkbox:checked").length;

    $("#btnDelete").prop("disabled", checkedCount === 0);

    $("#btnEdit").prop("disabled", checkedCount !== 1);

    $("#btnActive").prop("disabled", checkedCount === 0);

    $("#btnInactive").prop("disabled", checkedCount === 0);
}

// ============================================================
// Get Selected Pickup Point IDs
// ============================================================

function getSelectedPPIds() {
    let ids = [];

    $(".pickPoint-checkbox:checked").each(function () {
        ids.push(parseInt($(this).val()));
    });

    return ids;
}

// ============================================================
// Open Map
// ============================================================

function openMap(lat, lng) {
    if (!lat || !lng) {
        showToast("Latitude and Longitude are required to view the map.", "warning");

        return;
    }

    const url = `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;

    document.getElementById("mapFrame").src = url;

    new bootstrap.Modal(document.getElementById("mapModal")).show();
}

// ============================================================
// Preview Map
// ============================================================

function previewMap() {
    const lat = document.getElementById("txtLatitude").value;

    const lng = document.getElementById("txtLongitude").value;

    if (!lat || !lng) {
        showToast("Please enter both Latitude and Longitude to preview.", "warning");

        return;
    }

    openMap(lat, lng);
}

// ============================================================
// Clear Error
// ============================================================

function clearError(id) {
    const el = document.getElementById(id);

    if (el) {
        el.classList.remove("is-invalid");
    }
}

// ============================================================
// Edit Selected Pickup Point
// ============================================================

function editSelected() {
    if (selectedId === 0) {
        return;
    }

    location.href = "/Transport/AddPickupPoint/" + selectedId;
}

// ============================================================
// Delete Selected Pickup Points
// ============================================================

function deleteSelected() {
    const selectedIds = getSelectedPPIds();

    if (selectedIds.length === 0) {
        Swal.fire("Oops!", "Please select at least one Pickup Point.", "warning");

        return;
    }

    Swal.fire({
        title: "Are you sure?",

        text: "You are about to delete this Pickup Point record. This action cannot be undone!",

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
            url: "/Transport/DeletePickupPoint",

            type: "POST",

            contentType: "application/json",

            data: JSON.stringify(selectedIds),

            success: function (res) {
                if (res.success) {
                    Swal.fire(
                        "Deleted!",

                        res.message || "Pickup Point record has been deleted.",

                        "success"
                    ).then(function () {
                        location.reload();
                    });
                } else {
                    Swal.fire(
                        "Error!",

                        res.message || "Failed to delete Pickup Point.",

                        "error"
                    );
                }
            },

            error: function (xhr) {
                console.error("Delete Pickup Point Error:", xhr.status, xhr.responseText);

                Swal.fire("Error!", "An unexpected error occurred.", "error");
            },
        });
    });
}

// ============================================================
// Toggle Pickup Point Status
// ============================================================

window.toggleStatus = async function (id, isActive) {
    let ids = id && id !== 0 ? [parseInt(id)] : getSelectedPPIds();

    if (ids.length === 0) {
        Swal.fire("Oops!", "Please select at least one Pickup Point.", "warning");

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

            // Clear selected Pickup Point checkboxes
            $(".pickPoint-checkbox").prop("checked", false);

            // Remove row highlight
            $(".item-row").removeClass("bg-light");

            // Reset selected ID
            selectedId = 0;

            // Update toolbar buttons
            updateActionButtons();

            // Refresh page
            if (id && id !== 0) {
                location.reload();
            }

            return;
        }

        // ====================================================
        // AJAX
        // ====================================================

        $.ajax({
            url: "/Transport/TogglePickupPointStatus",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(request),
            success: function (res) {
                if (res.success) {
                    Swal.fire(
                        config.successTitle,

                        res.message || config.successText,

                        "success"
                    ).then(function () {
                        location.reload();
                    });
                } else {
                    Swal.fire(
                        "Error!",
                        res.message || "Failed to update status.",
                        "error"
                    );
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
