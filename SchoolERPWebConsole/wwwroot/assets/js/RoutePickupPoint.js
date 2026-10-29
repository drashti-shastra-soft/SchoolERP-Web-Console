let selectedId = 0;
let exportTable;

function clearError(id) {
    $('#' + id).removeClass('is-invalid');
}

function formatIndianNumber(value) {
    value = value.replace(/,/g, '');
    value = value.replace(/[^0-9.]/g, '');
    if (value === '') return '';

    let parts = value.split('.');
    let integerPart = parts[0];
    let decimalPart = parts[1];

    if (!integerPart) {
        integerPart = '0';
    }

    if (integerPart.length > 3) {
        let lastThree = integerPart.slice(-3);
        let remaining = integerPart.slice(0, -3);
        remaining = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
        integerPart = remaining + ',' + lastThree;
    }

    return decimalPart !== undefined
        ? integerPart + '.' + decimalPart
        : integerPart;
}

function handleIndianNumberInput(e) {
    const el = e.target;
    const beforeLen = el.value.length;
    const caretPos = el.selectionStart ?? el.value.length;
    const formatted = formatIndianNumber(el.value);
    el.value = formatted;

    const diff = formatted.length - beforeLen;
    let newPos = caretPos + diff;
    if (newPos < 0) newPos = 0;
    if (newPos > formatted.length) newPos = formatted.length;
    el.setSelectionRange(newPos, newPos);
}


function parseFeesValue(v) {
    return parseFloat((v || '').replace(/,/g, '')) || 0;
}

$(document).ready(function () {
    $('#txtFees').on('input', handleIndianNumberInput);
});
function updateHeaderButtons() {
    let checkedCount = $('.student-checkbox:checked').length;
    $('#btnDelete').prop('disabled', checkedCount === 0);
    $('#btnEdit').prop('disabled', checkedCount !== 1);
    $('#btnActive').prop('disabled', checkedCount === 0);
    $('#btnInactive').prop('disabled', checkedCount === 0);
}

function selectItem(id, row) {
    selectedId = id;
    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));
    row.classList.add('bg-light');
    updateHeaderButtons();
}

$(document).on('change', '.student-checkbox', function () {
    selectedId = parseInt($(this).val());
    updateHeaderButtons();
});

function getSelectedRPPIds() {
    let ids = [];
    $('.student-checkbox:checked').each(function () {
        ids.push(parseInt($(this).val()));
    });
    return ids;
}

function initSelect2() {
    $('#ddlRoute').select2({
        dropdownParent: $('#entryModal'),
        width: '100%',
        placeholder: "-- Select Route --"
    });
    $('#ddlPoint').select2({
        dropdownParent: $('#entryModal'),
        width: '100%',
        placeholder: "-- Select Point --"
    });
}

function editSelected() {
    if (selectedId == 0) return;
    location.href = "/Transport/AddRoutePickupPoint/" + selectedId;
}

window.saveRecord = function () {
    var data = {
        routePickupPointID: parseInt($('#hdnRPPID').val()) || 0,
        routeID: parseInt($('#ddlRoute').val()) || 0,
        pickupPointID: parseInt($('#ddlPoint').val()) || 0,
        distance: parseFloat($('#txtDistance').val()) || 0,
        pickupTime: $('#txtTime').val().trim(),
        monthlyFees: parseFeesValue($('#txtFees').val()),
        isActive: $('#chkActive').is(':checked'),
        companyID: parseInt($('#hdnCompanyID').val()) || 0,
        sessionID: parseInt($('#hdnSessionID').val()) || 0
    };

    var missing = [];
    $('#ddlRoute, #ddlPoint, #txtDistance, #txtFees').removeClass('is-invalid');

    if (!data.routeID) {
        missing.push('Route');
        $('#ddlRoute').addClass('is-invalid');
    }

    if (!data.pickupPointID) {
        missing.push('Pickup Point');
        $('#ddlPoint').addClass('is-invalid');
    }

    // Distance: if entered, must not be negative
    var distanceRaw = $('#txtDistance').val();
    if (distanceRaw !== '' && parseFloat(distanceRaw) < 0) {
        missing.push('Distance (must be 0 or greater)');
        $('#txtDistance').addClass('is-invalid');
    }

    // Monthly Fees: if entered, must not be negative (comma-stripped compare)
    var feesRaw = $('#txtFees').val();
    if (feesRaw !== '' && parseFeesValue(feesRaw) < 0) {
        missing.push('Monthly Fees (must be 0 or greater)');
        $('#txtFees').addClass('is-invalid');
    }

    if (missing.length > 0) {
        $('.is-invalid').first().focus();
        return;
    }

    $.ajax({
        url: '/Transport/UpsertRoutePickupPoint',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function (resp) {
            if (resp.success) {
                Swal.fire({
                    title: 'Saved!',
                    text: data.routePickupPointID > 0 ? "Route Pickup Point has been Updated successfully." : "Route Pickup Point has been Added successfully.",
                    icon: 'success',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-success' },
                    buttonsStyling: false
                }).then(() => {
                    window.location.href = '/Transport/RoutePickupPoints';
                });
            } else {
                Swal.fire({
                    title: 'Error!',
                    text: resp.message || 'Failed to save Route Pickup Point.',
                    icon: 'error',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-danger' },
                    buttonsStyling: false
                });
            }
        },
        error: function () {
            Swal.fire({
                title: 'Error!',
                text: 'An unexpected error occurred while saving.',
                icon: 'error',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-danger' },
                buttonsStyling: false
            });
        }
    });
};

function deleteSelected() {
    let selectedIds = getSelectedRPPIds();
    if (selectedIds.length === 0) {
        Swal.fire('Oops!', 'Please select at least one pickup point.', 'warning');
        return;
    }

    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to remove the selected pickup point(s) from the route. This action cannot be undone!",
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
        if (!result.isConfirmed) return;

        $.ajax({
            url: '/Transport/DeleteRoutePickupPoint',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(selectedIds),
            success: function (res) {
                if (res.success) {
                    Swal.fire('Deleted!', res.message || 'Pickup point(s) have been deleted.', 'success')
                        .then(() => location.reload());
                } else {
                    Swal.fire('Error!', res.message || 'Failed to delete pickup point(s).', 'error');
                }
            },
            error: function () {
                Swal.fire('Error!', 'An unexpected error occurred.', 'error');
            }
        });
    });
}

window.toggleStatus = async function (id, isActive) {
    let ids = (id && id !== 0) ? [parseInt(id)] : getSelectedRPPIds();

    if (ids.length === 0) {
        Swal.fire('Oops!', 'Please select at least one record.', 'warning');
        return;
    }

    const request = {
        ids: ids.join(','),
        isActive: isActive,
        doneBy: window.currentUserId
    };

    const config = isActive
        ? {
            icon: 'question',
            title: 'Activate Record(s)?',
            text: 'Activating this record will make it visible and available for use across the system. Do you want to continue?',
            confirmButtonText: 'Yes, proceed',
            confirmButtonColor: '#198754',
            confirmButtonClass: 'btn btn-danger me-2',
            successTitle: 'Activated!',
            successText: 'The selected record(s) have been activated.'
        }
        : {
            icon: 'warning',
            title: 'Deactivate Record(s)?',
            text: 'Deactivating this record will hide it from the system and prevent it from being used. Do you want to continue?',
            confirmButtonText: 'Yes, proceed!',
            confirmButtonColor: '#d33',
            confirmButtonClass: 'btn btn-danger me-2',
            successTitle: 'Deactivated!',
            successText: 'The selected record(s) have been deactivated.'
        };

    try {
        const result = await Swal.fire({
            icon: config.icon,
            title: config.title,
            text: config.text,
            showCancelButton: true,
            confirmButtonColor: config.confirmButtonColor,
            cancelButtonColor: '#3085d6',
            confirmButtonText: config.confirmButtonText,
            customClass: {
                confirmButton: config.confirmButtonClass,
                cancelButton: 'btn btn-secondary'
            },
            buttonsStyling: false
        });

        if (!result.isConfirmed) {
            if (id && id !== 0) location.reload();
            return;
        }

        $.ajax({
            url: '/Transport/ToggleRoutePickupPointStatus',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(request),
            success: function (res) {
                if (res.success) {
                    Swal.fire(config.successTitle, res.message || config.successText, 'success')
                        .then(() => location.reload());
                } else {
                    Swal.fire('Error!', res.message || 'Failed to update status.', 'error');
                }
            },
            error: function (xhr) {
                console.error('Status update error:', xhr.status, xhr.responseText);
                Swal.fire('Error!', 'An unexpected error occurred.', 'error');
            }
        });
    } catch (err) {
        console.error(err);
        Swal.fire('Error!', 'Could not update status.', 'error');
    }
};

function triggerExport(type) {
    if (!exportTable) return;
    if (type === 'copy') exportTable.button('.buttons-copy').trigger();
    else if (type === 'csv') exportTable.button('.buttons-csv').trigger();
    else if (type === 'excel') exportTable.button('.buttons-excel').trigger();
    else if (type === 'pdf') exportTable.button('.buttons-pdf').trigger();
    else if (type === 'print') exportTable.button('.buttons-print').trigger();
}

$(document).ready(function () {
    if ($.fn.DataTable.isDataTable('#tblRPP')) {
        $('#tblRPP').DataTable().destroy();
    }
    exportTable = $('#tblRPP').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', exportOptions: { columns: [1, 2, 3, 4, 5], rows: ':visible' } },
            { extend: 'csv', exportOptions: { columns: [1, 2, 3, 4, 5], rows: ':visible' } },
            { extend: 'excel', exportOptions: { columns: [1, 2, 3, 4, 5], rows: ':visible' } },
            { extend: 'pdf', exportOptions: { columns: [1, 2, 3, 4, 5], rows: ':visible' } },
            { extend: 'print', exportOptions: { columns: [1, 2, 3, 4, 5], rows: ':visible' } }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false,
        language: {
            emptyTable: "No record found",
            zeroRecords: "No record found"
        }
    });

    $('#txtSearchInput').on('input keyup', function () {
        const q = this.value.toLowerCase();
        document.querySelectorAll('#tblRPP tbody tr.item-row').forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
    });
});