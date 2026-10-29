let currentFields = [];
let activeTabId = 0;

function selectGatewayTab(paymentTypeId) {
    activeTabId = paymentTypeId;

    // highlight active tab
    document.querySelectorAll('.gateway-tab-link').forEach(a => {
        a.classList.toggle('active', parseInt(a.dataset.id, 10) === paymentTypeId);
    });

    document.getElementById('noGatewaySelectedMsg').style.display = 'none';
    loadGatewayFields(paymentTypeId);
    loadGatewayInfo(paymentTypeId);
}

function loadGatewayFields(paymentTypeId) {
    const container = document.getElementById('configFieldsContainer');
    const card = document.getElementById('configFieldsCard');
    const emptyMsg = document.getElementById('configEmptyMsg');
    const saveBtn = document.getElementById('btnSaveConfig');

    container.innerHTML = '';
    if (saveBtn) saveBtn.disabled = true;
    card.style.display = 'block';

    fetch(`/PaymentTypeConfig/GetFields?paymentTypeId=${paymentTypeId}`)
        .then(r => r.json())
        .then(res => {
            if (!res.success) {
                Swal.fire('Error!', res.message || 'Could not load fields.', 'error');
                return;
            }

            currentFields = res.data || [];

            if (currentFields.length === 0) {
                emptyMsg.style.display = 'block';
                return;
            }
            emptyMsg.style.display = 'none';

            currentFields.forEach(f => {
                const inputType = f.fieldType === 'PASSWORD' ? 'password' : 'text';
                const requiredMark = f.isRequired ? '<span class="req">*</span>' : '';
                const savedValue = f.fieldValue ?? '';
                const isSecretMasked = f.isSecret && savedValue;

                const col = document.createElement('div');
                col.className = 'col-md-12';
                col.innerHTML = `
                    <label class="form-label">${escapeHtml(f.fieldLabel)} ${requiredMark}</label>
                    <input type="${inputType}" class="form-control cfg-input"
                           id="cfg_${f.fieldID}" data-field-id="${f.fieldID}"
                           data-required="${f.isRequired}" data-secret="${f.isSecret}"
                           placeholder="${isSecretMasked ? 'Leave blank to keep unchanged' : ''}"
                           value="${isSecretMasked ? '' : escapeHtml(savedValue)}">
                    <div class="text-danger d-none" id="err_cfg_${f.fieldID}">This field is required.</div>
                `;
                container.appendChild(col);
            });

            if (saveBtn) saveBtn.disabled = false;

            container.querySelectorAll('.cfg-input').forEach(el => {
                el.addEventListener('input', function () {
                    this.classList.remove('is-invalid');
                    document.getElementById(`err_${this.id}`)?.classList.add('d-none');
                });
            });
        })
        .catch(err => {
            console.error(err);
            Swal.fire('Error!', 'Could not load fields for this payment gateway.', 'error');
        });
}

function loadGatewayInfo(paymentTypeId) {
    const infoCard = document.getElementById('gatewayInfoCard');
    fetch(`/PaymentTypeConfig/GetGatewayInfo?paymentTypeId=${paymentTypeId}`)
        .then(r => r.json())
        .then(res => {
            if (!res.success || !res.data) { infoCard.style.display = 'none'; return; }
            const info = res.data.data;
            document.getElementById('gatewayInfoLink').textContent = `Payment Gateway For ${info.countryName ?? ''}`;
            const logo = document.getElementById('gatewayInfoLogo');
            if (info.logoUrl) { logo.src = info.logoUrl; logo.style.display = 'inline-block'; }
            else { logo.style.display = 'none'; }
            document.getElementById('gatewayInfoDesc').textContent = info.description ?? '';
            const link = document.getElementById('gatewayInfoUrl');
            if (info.websiteUrl) { link.href = info.websiteUrl; link.textContent = info.websiteUrl; link.style.display = 'block'; }
            else { link.style.display = 'none'; }
            infoCard.style.display = 'block';
        })
        .catch(() => { infoCard.style.display = 'none'; });
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function validateConfigFields() {
    let isValid = true;
    document.querySelectorAll('.cfg-input').forEach(el => {
        const isRequired = el.dataset.required === 'true';
        const isSecret = el.dataset.secret === 'true';
        if (isRequired && !isSecret && !el.value.trim()) {
            el.classList.add('is-invalid');
            document.getElementById(`err_${el.id}`)?.classList.remove('d-none');
            isValid = false;
        } else {
            el.classList.remove('is-invalid');
            document.getElementById(`err_${el.id}`)?.classList.add('d-none');
        }
    });
    return isValid;
}

// ---- Save field values for the currently open tab ----
document.getElementById('btnSaveConfig')?.addEventListener('click', async function () {
    if (!activeTabId) return;
    if (!validateConfigFields()) return;

    const fields = [];
    document.querySelectorAll('.cfg-input').forEach(el => {
        const isSecret = el.dataset.secret === 'true';
        if (isSecret && !el.value) return;
        fields.push({ fieldID: parseInt(el.dataset.fieldId, 10), fieldValue: el.value.trim() });
    });

    if (fields.length === 0) {
        Swal.fire('Nothing to save', 'No field values were entered.', 'info');
        return;
    }

    this.setAttribute('disabled', 'true');
    try {
        const r = await fetch('/PaymentTypeConfig/SaveBatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentTypeId: activeTabId, fields })
        });
        const res = await r.json();
        if (res.success) {
            Swal.fire('Saved!', res.message || 'Configuration saved successfully.', 'success');
        } else {
            Swal.fire('Error!', res.message || 'Failed to save configuration.', 'error');
        }
    } catch (err) {
        console.error(err);
        Swal.fire('Error!', 'An unexpected error occurred while saving.', 'error');
    } finally {
        this.removeAttribute('disabled');
    }
});

// ---- Save which gateway is the active/default one (right sidebar) ----
document.getElementById('btnSaveDefaultGateway')?.addEventListener('click', async function () {
    const selected = document.querySelector('.default-gateway-radio:checked');
    const paymentTypeId = selected ? parseInt(selected.value, 10) : 0;

    this.setAttribute('disabled', 'true');
    try {
        const r = await fetch('/PaymentTypeConfig/SetDefaultGateway', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentTypeId })
        });
        const res = await r.json();
        if (res.success) {
            Swal.fire('Saved!', res.message || 'Default payment gateway updated.', 'success');
            // Keep the tabs/fields in sync with the newly-saved default, without a full reload.
            activeTabId = paymentTypeId;
            if (paymentTypeId > 0) {
                selectGatewayTab(paymentTypeId);
            } else {
                document.querySelectorAll('.gateway-tab-link').forEach(a => a.classList.remove('active'));
                document.getElementById('configFieldsCard').style.display = 'none';
                document.getElementById('gatewayInfoCard').style.display = 'none';
                document.getElementById('noGatewaySelectedMsg').style.display = 'block';
            }
        } else {
            Swal.fire('Error!', res.message || 'Failed to update default gateway.', 'error');
        }
    } catch (err) {
        console.error(err);
        Swal.fire('Error!', 'An unexpected error occurred.', 'error');
    } finally {
        this.removeAttribute('disabled');
    }
});

// ---- On page load: auto-select the gateway already saved for this company
// (tbl_Mst_Payment_Method.PaymentTypeId), so its tab is highlighted and its
// saved field values / gateway info load immediately — no click required.
document.addEventListener('DOMContentLoaded', function () {
    if (window.activePaymentTypeId && window.activePaymentTypeId > 0) {
        selectGatewayTab(window.activePaymentTypeId);
    }
});