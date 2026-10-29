// ========================================
// Student Disable — Save flow + Validation
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // ── Select2 init for Reason dropdown ───────────────────────────────
    try {
        if (window.jQuery && typeof jQuery.fn.select2 === 'function') {
            jQuery('#ddlPurpose').select2({
                width: '100%',
                placeholder: 'Select',
                allowClear: true
            });
        }
    } catch (e) {
        console.warn('Select2 init skipped:', e);
    }

    // ── Clear field error as soon as user fixes it ─────────────────────
    document.getElementById('ddlPurpose')?.addEventListener('change', () => clearFieldError('ddlPurpose', 'errPurpose'));
    if (window.jQuery) {
        jQuery('#ddlPurpose').on('change', () => clearFieldError('ddlPurpose', 'errPurpose'));
    }
    document.getElementById('txtDate')?.addEventListener('input', () => clearFieldError('txtDate', 'errDate'));
});

// ========================================
// Validation helpers
// ========================================
function showFieldError(fieldId, errId, message) {
    const field = document.getElementById(fieldId);
    const errEl = document.getElementById(errId);
    if (field) field.classList.add('is-invalid');
    if (errEl) {
        errEl.textContent = message;
        errEl.style.display = 'block';
    }
}

function clearFieldError(fieldId, errId) {
    const field = document.getElementById(fieldId);
    const errEl = document.getElementById(errId);
    if (field) field.classList.remove('is-invalid');
    if (errEl) {
        errEl.textContent = '';
        errEl.style.display = 'none';
    }
}

function clearAllErrors() {
    clearFieldError('ddlPurpose', 'errPurpose');
    clearFieldError('txtDate', 'errDate');
}

/**
 * Validates the form. Returns true if valid, false otherwise
 * (and shows the relevant inline error messages).
 */
function validateStudentDisableForm() {
    clearAllErrors();
    let isValid = true;
    let firstInvalidField = null;

    // Reason (required)
    const purposeEl = document.getElementById('ddlPurpose');
    if (!purposeEl?.value) {
        showFieldError('ddlPurpose', 'errPurpose', 'Reason is required.');
        isValid = false;
        firstInvalidField = firstInvalidField || purposeEl;
    }

    // Date (required, cannot be in the future — enforced by max attr too)
    const dateEl = document.getElementById('txtDate');
    if (!dateEl?.value) {
        showFieldError('txtDate', 'errDate', 'Date is required.');
        isValid = false;
        firstInvalidField = firstInvalidField || dateEl;
    } else {
        const selectedDate = new Date(dateEl.value);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (selectedDate > today) {
            showFieldError('txtDate', 'errDate', 'Date cannot be in the future.');
            isValid = false;
            firstInvalidField = firstInvalidField || dateEl;
        }
    }

    if (!isValid && firstInvalidField) {
        firstInvalidField.focus();
    }

    return isValid;
}

// ========================================
// Save
// ========================================
async function saveRecord() {
    if (!validateStudentDisableForm()) {
        return;
    }

    const studentId = parseInt(document.getElementById('txtItemId')?.value) || 0;
    const disableReasonId = parseInt(document.getElementById('ddlPurpose')?.value) || 0;
    const disableDate = document.getElementById('txtDate')?.value || '';
    const disableNote = document.getElementById('txtName')?.value.trim() || '';

    const data = {
        studentID: studentId,
        disableReasonID: disableReasonId,
        disableDate: disableDate,
        disableNote: disableNote
    };

    const btn = document.querySelector('.top-btn.btn-success');
    const originalBtnHtml = btn ? btn.innerHTML : null;
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving...';
    }

    try {
        const response = await fetch('/StudentInformation/UpsertStudentDisable', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const res = await response.json();
        const isEdit = disableReasonId > 0;
        if (res.success) {
            await Swal.fire({
                icon: 'success',
                title: 'Saved!',               
                text: isEdit
                    ? 'Student disable details has been updated successfully.'
                    : 'Student disable details has been added successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            });
            window.location.href = '/StudentInformation/DisabledStudents';
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.message || 'Failed to save student disable details.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-danger' },
                buttonsStyling: false
            });
        }
    } catch (err) {
        console.error(err);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An error occurred while saving.',
            confirmButtonText: 'OK',
            customClass: { confirmButton: 'btn btn-danger' },
            buttonsStyling: false
        });
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalBtnHtml;
        }
    }
}