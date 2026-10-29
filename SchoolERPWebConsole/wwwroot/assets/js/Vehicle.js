const currentUserId = @currentUserId;
function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#tblVehicles')) {
        const table = $('#tblVehicles').DataTable();
        table.button(index).trigger();
    }
}

$(document).ready(function () {
    $('#tblVehicles').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', exportOptions: { columns: [1, 2, 3, 4, 5, 6] } },
            { extend: 'csv', exportOptions: { columns: [1, 2, 3, 4, 5, 6] } },
            { extend: 'excel', exportOptions: { columns: [1, 2, 3, 4, 5, 6] } },
            { extend: 'pdf', exportOptions: { columns: [1, 2, 3, 4, 5, 6] } },
            { extend: 'print', exportOptions: { columns: [1, 2, 3, 4, 5, 6] } }
        ],
        searching: false,
        paging: false,
        info: false,

        language: {
            emptyTable: "No records found.",
            zeroRecords: "No records found.",
            search: ""
        }
    });
});

let selectedId = 0;
const canEdit = p.CanEdit.ToString().ToLower();
const canDelete = p.CanDelete.ToString().ToLower();

function selectItem(id, row) {
    selectedId = id;
    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));
    row.classList.add('bg-light');

    let checkedCount = $('.vehicles-checkbox:checked').length;
    $('#btnDelete').prop('disabled', checkedCount === 0);
    $('#btnEdit').prop('disabled', checkedCount !== 1);
    $('#btnActive').prop('disabled', checkedCount === 0);
    $('#btnInactive').prop('disabled', checkedCount === 0);
}
document.getElementById('txtSearchInput').addEventListener('keyup', function () {
    const q = this.value.toLowerCase();
    document.querySelectorAll('#tblVehicles tbody tr').forEach(row => {
        if (row.classList.contains('item-row')) {
            row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
        }
    });
});

function getSelectedVehicleIds() {
    let ids = [];
    $('.vehicles-checkbox:checked').each(function () {
        ids.push(parseInt($(this).val()));
    });
    return ids;
}


function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => document.getElementById('imgPreview').src = e.target.result;
        reader.readAsDataURL(input.files[0]);
    }
}

function clearError(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('is-invalid');
}



function editSelected() {
    if (selectedId == 0)
        return;
    location.href = "/Transport/AddVehicle/" + selectedId;
}


function deleteSelected() {
    if (!selectedId) return;

    let selectedIds = [];
    $('.vehicles-checkbox:checked').each(function () {
        selectedIds.push(parseInt($(this).val()));
    });
    if (selectedIds.length === 0) {
        alert("Please select at least one student.");
        return;
    }
    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to delete this vehicle record. This action cannot be undone!",
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
                url: '/Transport/DeleteVehicle',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Vehicle record has been deleted.', 'success')
                            .then(() => location.reload());
                    } else {
                        Swal.fire('Error!', res.message || 'Failed to delete vehicle.', 'error');
                    }
                },
                error: function () {
                    Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                }
            });
        }
    });
}

window.toggleStatus = async function (id, isActive) {
    let ids = (id && id !== 0) ? [parseInt(id)] : getSelectedVehicleIds();

    if (ids.length === 0) {
        Swal.fire('Oops!', 'Please select at least one ID Card.', 'warning');
        return;
    }

    const request = {
        ids: ids.join(','),
        isActive: isActive,
        doneBy: currentUserId
    };

    const config = isActive
        ? {
            icon: 'question',
            title: 'Activate Record(s)?',
            text: 'Activating will make the selected record(s) visible and available for use across the system. Continue?',
            confirmButtonText: 'Yes, Activate',
            confirmButtonColor: '#198754',
            confirmButtonClass: 'btn btn-success me-2',
            successTitle: 'Activated!',
            successText: 'The selected record(s) have been activated.'
        }
        : {
            icon: 'warning',
            title: 'Deactivate Record(s)?',
            text: 'Deactivating will hide the selected record(s) and prevent them from being used. Continue?',
            confirmButtonText: 'Yes, Deactivate',
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
            // if this was a row-level switch being clicked, revert the visual toggle on cancel
            if (id && id !== 0) location.reload();
            return;
        }

        $.ajax({
            url: '/Transport/ToggleVehicleStatus',
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

function showToast(msg, type = 'success') {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<div class="toast align-items-center text-bg-${type} border-0 show position-fixed bottom-0 end-0 m-3" role="alert" style="z-index:9999">
                <div class="d-flex"><div class="toast-body">${msg}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div></div>`;
    document.body.appendChild(wrapper);
    setTimeout(() => wrapper.remove(), 3000);
}