(function () {
    'use strict';

    // ---------------------------------------------------------------
    // Bootstrap data from the Razor view
    // ---------------------------------------------------------------
    var boot = window.FeeTemplateBootstrap || { companyId: 0, sessionId: 0, userId: 0, header: null, details: [] };

    // ---------------------------------------------------------------
    // Element refs
    // ---------------------------------------------------------------
    var $class = document.getElementById('ddlClass');
    var $section = document.getElementById('ddlSection');
    var $installment = document.getElementById('ddlInstallment');
    var $admissionType = document.getElementById('ddlAdmissionType');
    var $feeCategory = document.getElementById('ddlFeeCategory');
    var $category = document.getElementById('ddlCategory');
    var $noOfMonths = document.getElementById('txtNoOfMonths');
    var $remark = document.getElementById('txtRemark');
    var $lateFeeDate = document.getElementById('txtLateFeeDate');
    var $lateFeeAmount = document.getElementById('txtLateFeeAmount');

    var $rowFeeHead = document.getElementById('ddlRowFeeHead');
    var $rowFeeAmount = document.getElementById('txtRowFeeAmount');
    var $rowDiscount = document.getElementById('txtRowDiscount');
    var $rowAmountPreview = document.getElementById('txtRowAmountPreview');
    var $rowAdmissionType = document.getElementById('ddlRowAdmissionType');
    var $btnRowAdd = document.getElementById('btnRowAdd');

    var $tblBody = document.getElementById('tblFeeHeadBody');
    var $lblTotalFee = document.getElementById('lblTotalFee');
    var $lblTotalAmount = document.getElementById('lblTotalAmount');

    var $hdnFeeTemplateId = document.getElementById('hdnFeeTemplateId');
    var $hdnIsActive = document.getElementById('hdnIsActive');

    //var $btnAddNew = document.getElementById('btnAddNew');
    var $btnEdit = document.getElementById('btnEdit');
    var $btnDelete = document.getElementById('btnDelete');
    var $btnSave = document.getElementById('btnSave');
    var $btnReset = document.getElementById('btnReset');
    var $btnCopy = document.getElementById('btnCopy');

    // All the header + row inputs that get enabled/disabled together
    var ALL_FORM_CONTROLS = [
        $class, $section, $installment, $admissionType, $feeCategory, $category,
        $noOfMonths, $remark, $lateFeeDate, $lateFeeAmount,
        $rowFeeHead, $rowFeeAmount, $rowDiscount, $rowAdmissionType, $btnRowAdd
    ];

    // In-memory grid state: array of row objects, plus one "editingIndex"
    // that points at the row currently loaded into the add/edit inputs
    // (-1 means "adding a brand-new row").
    var gridRows = [];
    var editingIndex = -1;
    var sNoCounter = 1;

    // Snapshot used by RESET to discard unsaved edits.
    var originalSnapshot = null;

    // ---------------------------------------------------------------
    // Utility helpers
    // ---------------------------------------------------------------
    function getJSON(url) {
        return fetch(url).then(function (r) { return r.json(); });
    }

    function toNumber(val) {
        var n = parseFloat(val);
        return isNaN(n) ? 0 : n;
    }

    function formatMoney(n) {
        return toNumber(n).toFixed(2);
    }

    function computeAmount(feeAmount, discountPercent) {
        var fee = toNumber(feeAmount);
        var disc = toNumber(discountPercent);
        var amt = fee - (fee * disc / 100);
        return amt < 0 ? 0 : amt;
    }

    function alertWarning(text) {
        Swal.fire({
            icon: 'warning',
            title: 'Warning',
            text: text,
            confirmButtonText: 'OK',
            customClass: { confirmButton: 'btn btn-success' },
            buttonsStyling: false
        });
    }

    function alertError(text) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: text,
            confirmButtonText: 'OK',
            customClass: { confirmButton: 'btn btn-danger' },
            buttonsStyling: false
        });
    }

    function alertSuccess(text, onOk) {
        Swal.fire({
            icon: 'success',
            title: 'Success',
            text: text,
            confirmButtonText: 'OK',
            customClass: { confirmButton: 'btn btn-success' },
            buttonsStyling: false
        }).then(function () {
            if (typeof onOk === 'function') onOk();
        });
    }

    function setFormEnabled(enabled) {
        ALL_FORM_CONTROLS.forEach(function (el) {
            if (el) el.disabled = !enabled;
        });
        $btnSave.disabled = !enabled;
        $btnReset.disabled = !enabled;
    }

    // ---------------------------------------------------------------
    // Static dropdowns (Installment / Admission Type) are already
    // rendered server-side in the .cshtml - nothing to bind from an API.
    // Only the row-level Fee Head list needs an AJAX call.
    // ---------------------------------------------------------------
    function loadFeeHeadDropdown() {
        return getJSON('/FeeTemplate/GetFeeHeadDropdown?companyId=' + boot.companyId + '&sessionId=' + boot.sessionId)
            .then(function (res) {
                $rowFeeHead.innerHTML = '<option value="">Select</option>';
                if (res && res.success && res.data) {
                    res.data.forEach(function (fh) {
                        var opt = document.createElement('option');
                        opt.value = fh.id;
                        opt.textContent = fh.name;
                        $rowFeeHead.appendChild(opt);
                    });
                }
            })
            .catch(function () {
                alertError('Failed to load Fee Head list.');
            });
    }

    // ---------------------------------------------------------------
    // Class -> Section cascade
    // ---------------------------------------------------------------
    function onClassChange() {
        var classId = $class.value;
        $section.innerHTML = '<option value="">-- Select --</option>';

        if (!classId) return;

        getJSON('/Academics/GetSectionsByClass/' + classId)
            .then(function (res) {
                if (res && res.success && res.data) {
                    res.data.forEach(function (s) {
                        var opt = document.createElement('option');
                        opt.value = s.sectionID;
                        opt.textContent = s.sectionName;
                        $section.appendChild(opt);
                    });
                }
            })
            .catch(function () {
                alertError('Failed to load Section list.');
            });
    }

    $class.addEventListener('change', onClassChange);

    // ---------------------------------------------------------------
    // Row amount live preview
    // ---------------------------------------------------------------
    function updateRowAmountPreview() {
        var amt = computeAmount($rowFeeAmount.value, $rowDiscount.value);
        $rowAmountPreview.textContent = formatMoney(amt);
    }
    $rowFeeAmount.addEventListener('input', updateRowAmountPreview);
    $rowDiscount.addEventListener('input', updateRowAmountPreview);

    // ---------------------------------------------------------------
    // Grid rendering
    // ---------------------------------------------------------------
    function renderGrid() {
        // remove all data rows, keep the "add row" (first row) intact
        Array.prototype.slice.call($tblBody.querySelectorAll('tr[data-row-index]')).forEach(function (tr) {
            tr.remove();
        });

        var totalFee = 0;
        var totalAmount = 0;

        gridRows.forEach(function (row, idx) {
            if (row.ISDELETE) return; // soft-removed, do not display

            totalFee += toNumber(row.FEEAMOUNT);
            totalAmount += toNumber(row.AMOUNT);

            var admLabel = row.ADMISSIONTYPE === 'D' ? 'D' : (row.ADMISSIONTYPE === 'R' ? 'R' : 'B');

            var tr = document.createElement('tr');
            tr.dataset.rowIndex = idx;
            tr.innerHTML =
                '<td><button type="button" class="btn btn-sm btn-link p-0 btnRowEdit" title="Edit"><i class="ti ti-pencil"></i></button></td>' +
                '<td>' + row.SNO + '</td>' +
                '<td>' + row.FEEHEADNAME + '</td>' +
                '<td class="text-end">' + formatMoney(row.FEEAMOUNT) + '</td>' +
                '<td class="text-end">' + formatMoney(row.DISCOUNTPERCENT) + '</td>' +
                '<td class="text-end">' + formatMoney(row.AMOUNT) + '</td>' +
                '<td>' + admLabel + '</td>' +
                '<td><button type="button" class="btn btn-sm btn-link text-danger p-0 btnRowDelete" title="Delete"><i class="ti ti-trash"></i></button></td>';
            $tblBody.appendChild(tr);
        });

        $lblTotalFee.textContent = formatMoney(totalFee);
        $lblTotalAmount.textContent = formatMoney(totalAmount);

        wireGridRowButtons();
    }

    function wireGridRowButtons() {
        $tblBody.querySelectorAll('.btnRowEdit').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var idx = parseInt(btn.closest('tr').dataset.rowIndex, 10);
                loadRowIntoEditor(idx);
            });
        });
        $tblBody.querySelectorAll('.btnRowDelete').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var idx = parseInt(btn.closest('tr').dataset.rowIndex, 10);
                deleteRow(idx);
            });
        });
    }

    function loadRowIntoEditor(idx) {
        var row = gridRows[idx];
        if (!row) return;

        editingIndex = idx;
        $rowFeeHead.value = row.FEEHEADID;
        $rowFeeAmount.value = row.FEEAMOUNT;
        $rowDiscount.value = row.DISCOUNTPERCENT;
        $rowAdmissionType.value = row.ADMISSIONTYPE || 'B';
        updateRowAmountPreview();
        $btnRowAdd.innerHTML = '<i class="ti ti-check"></i>';
        $btnRowAdd.title = 'Update Row';
    }

    function resetRowEditor() {
        editingIndex = -1;
        $rowFeeHead.value = '';
        $rowFeeAmount.value = '';
        $rowDiscount.value = '';
        $rowAdmissionType.value = 'B';
        $rowAmountPreview.textContent = '0.00';
        $btnRowAdd.innerHTML = '<i class="ti ti-plus"></i>';
        $btnRowAdd.title = 'Add / Update Row';
    }

    function deleteRow(idx) {
        var row = gridRows[idx];
        if (!row) return;

        Swal.fire({
            title: 'Are you sure?',
            text: 'Remove "' + row.FEEHEADNAME + '" from this template?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, remove it!',
            customClass: { confirmButton: 'btn btn-danger me-2', cancelButton: 'btn btn-secondary' },
            buttonsStyling: false
        }).then(function (result) {
            if (!result.isConfirmed) return;

            if (row.DETAILID && row.DETAILID > 0) {
                // already saved server-side -> soft flag for delete on next SAVE
                row.ISDELETE = true;
            } else {
                // never saved -> just drop it from the array
                gridRows.splice(idx, 1);
            }
            renderGrid();
        });
    }

    // ---------------------------------------------------------------
    // Add / Update row from the editor inputs
    // ---------------------------------------------------------------
    function validateRowEditor() {
        if (!$rowFeeHead.value) {
            alertWarning('Please select a Fee Head.');
            return false;
        }

        var feeAmount = toNumber($rowFeeAmount.value);
        if (feeAmount <= 0) {
            alertWarning('Fee Amount must be greater than 0.');
            return false;
        }

        var discount = toNumber($rowDiscount.value);
        if (discount < 0 || discount > 100) {
            alertWarning('Discount % must be between 0 and 100.');
            return false;
        }

        // duplicate fee head check (ignore the row currently being edited)
        var duplicate = gridRows.some(function (r, i) {
            return !r.ISDELETE && i !== editingIndex && String(r.FEEHEADID) === String($rowFeeHead.value);
        });
        if (duplicate) {
            alertWarning('This Fee Head has already been added to the template.');
            return false;
        }

        return true;
    }

    $btnRowAdd.addEventListener('click', function () {
        if (!validateRowEditor()) return;

        var feeHeadId = parseInt($rowFeeHead.value, 10);
        var feeHeadName = $rowFeeHead.options[$rowFeeHead.selectedIndex].textContent;
        var feeAmount = toNumber($rowFeeAmount.value);
        var discount = toNumber($rowDiscount.value);
        var amount = computeAmount(feeAmount, discount);
        var admissionType = $rowAdmissionType.value || 'B';

        if (editingIndex >= 0) {
            var row = gridRows[editingIndex];
            row.FEEHEADID = feeHeadId;
            row.FEEHEADNAME = feeHeadName;
            row.FEEAMOUNT = feeAmount;
            row.DISCOUNTPERCENT = discount;
            row.AMOUNT = amount;
            row.ADMISSIONTYPE = admissionType;
        } else {
            gridRows.push({
                DETAILID: 0,
                SNO: sNoCounter++,
                FEEHEADID: feeHeadId,
                FEEHEADNAME: feeHeadName,
                FEEAMOUNT: feeAmount,
                DISCOUNTPERCENT: discount,
                AMOUNT: amount,
                ADMISSIONTYPE: admissionType,
                ISDELETE: false
            });
        }

        resetRowEditor();
        renderGrid();
    });

    // ---------------------------------------------------------------
    // Header validation
    // ---------------------------------------------------------------
    function validateHeader() {
        if (!$class.value) {
            alertWarning('Please select a Class.');
            return false;
        }
        if (!$section.value) {
            alertWarning('Please select a Section.');
            return false;
        }
        if (!$installment.value) {
            alertWarning('Please select an Installment.');
            return false;
        }
        if (!$admissionType.value) {
            alertWarning('Please select an Admission Type.');
            return false;
        }
        if ($lateFeeAmount.value && toNumber($lateFeeAmount.value) < 0) {
            alertWarning('Late Fee Amount cannot be negative.');
            return false;
        }
        if ($noOfMonths.value && toNumber($noOfMonths.value) < 0) {
            alertWarning('No Of Months cannot be negative.');
            return false;
        }

        var activeRows = gridRows.filter(function (r) { return !r.ISDELETE; });
        if (activeRows.length === 0) {
            alertWarning('Please add at least one Fee Head row before saving.');
            return false;
        }

        return true;
    }

    // ---------------------------------------------------------------
    // Build the SAVE payload matching FeeTemplateSaveRequest
    // ---------------------------------------------------------------
    function buildSavePayload() {
        return {
            FEETEMPLATEID: parseInt($hdnFeeTemplateId.value, 10) || 0,
            COMPANYID: boot.companyId,
            SESSIONID: boot.sessionId,
            CLASSID: parseInt($class.value, 10),
            SECTIONID: parseInt($section.value, 10),
            INSTALLMENTID: parseInt($installment.value, 10),
            ADMISSIONTYPE: $admissionType.value,
            FEECATEGORYID: $feeCategory.value ? parseInt($feeCategory.value, 10) : null,
            CATEGORYID: $category.value ? parseInt($category.value, 10) : null,
            NOOFMONTHS: toNumber($noOfMonths.value),
            LATEFEEDATE: $lateFeeDate.value || null,
            LATEFEEAMOUNT: toNumber($lateFeeAmount.value),
            REMARK: $remark.value || null,
            ISACTIVE: $hdnIsActive.value === 'true',
            USERID: boot.userId,
            IPADDRESS: null,
            DETAILS: gridRows.map(function (r) {
                return {
                    DETAILID: r.DETAILID || 0,
                    SNO: r.SNO,
                    FEEHEADID: r.FEEHEADID,
                    FEEAMOUNT: r.FEEAMOUNT,
                    DISCOUNTPERCENT: r.DISCOUNTPERCENT,
                    AMOUNT: r.AMOUNT,
                    ADMISSIONTYPE: r.ADMISSIONTYPE,
                    ISDELETE: !!r.ISDELETE
                };
            })
        };
    }

    // ---------------------------------------------------------------
    // SAVE
    // ---------------------------------------------------------------
    $btnSave.addEventListener('click', function () {
        if (!validateHeader()) return;

        var payload = buildSavePayload();
        $btnSave.disabled = true;

        fetch('/FeeTemplate/Save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(function (r) { return r.json(); })
            .then(function (result) {
                if (result && result.result === 1) {
                    alertSuccess(result.MESSAGE || 'Fee Template saved successfully.', function () {
                        var newId = result.FEETEMPLATEID || result.TEMPLATEID || payload.FEETEMPLATEID;
                        if (newId) {
                            window.location.href = '/FeeTemplate/Index';
                        } else {
                            window.location.reload();
                        }
                    });
                } else {
                    alertError((result && result.MESSAGE) || 'Failed to save Fee Template.');
                }
            })
            .catch(function () {
                alertError('An error occurred while saving.');
            })
            .finally(function () {
                $btnSave.disabled = false;
            });
    });

    // ---------------------------------------------------------------
    // GET BY ID (used by page load when editing, and by Copy)
    // ---------------------------------------------------------------
    function loadTemplate(id)
    {
        if (id == 0)
        {
            return;
        }
        return getJSON('/FeeTemplate/GetByID?id=' + id + '&companyId=' + boot.companyId + '&sessionId=' + boot.sessionId)
            .then(function (res) {
                if (res && res.result === 1) {
                    applyHeaderAndDetails(res.header, res.details);
                } else {
                    alertError((res && res.MESSAGE) || 'Fee Template not found.');
                }
            })
            .catch(function () {
                alertError('Failed to load Fee Template.');
            });
    }

    function applyHeaderAndDetails(header, details) {
        //if (header) {
        //    $hdnFeeTemplateId.value = header.FEETEMPLATEID;
        //    $class.value = header.CLASSID;
        //    onClassChangeThenSet(header.SECTIONID, header.SECTIONNAME);
        //    $installment.value = header.INSTALLMENTID;
        //    $admissionType.value = header.ADMISSIONTYPE;
        //    $feeCategory.value = header.FEECATEGORYID || '';
        //    $category.value = header.CATEGORYID || '';
        //    $noOfMonths.value = header.NOOFMONTHS;
        //    $remark.value = header.REMARK || '';
        //    $lateFeeDate.value = header.LATEFEEDATE ? header.LATEFEEDATE.substring(0, 10) : '';
        //    $lateFeeAmount.value = header.LATEFEEAMOUNT;
        //    $hdnIsActive.value = (!!header.ISACTIVE).toString();
        //}

        // This is the "details grid" — every saved Fee Head row for the
        // template gets mapped in here and handed to renderGrid() below,
        // so ALL of them show up in the table, not just the last one.
        gridRows = (details || []).map(function (d) {
            return {
                DETAILID: d.detailid,
                SNO: d.sno,
                FEEHEADID: d.feeheadid,
                FEEHEADNAME: d.feeheadname,
                FEEAMOUNT: d.feeamount,
                DISCOUNTPERCENT: d.discountpercent,
                AMOUNT: d.amount,
                ADMISSIONTYPE: d.admissiontype,
                ISDELETE: false
            };
        });
        sNoCounter = gridRows.length > 0 ? Math.max.apply(null, gridRows.map(function (r) { return r.SNO; })) + 1 : 1;
        renderGrid();

        originalSnapshot = JSON.stringify(buildSavePayload());
    }

    // Section dropdown needs the Class change AJAX to finish before we
    // can select the saved SectionID, so this helper chains the two.
    function onClassChangeThenSet(sectionId, sectionName) {
        var classId = $class.value;
        $section.innerHTML = '<option value="">-- Select --</option>';
        if (!classId) return;

        getJSON('/Academics/GetSectionsByClass/' + classId)
            .then(function (res) {
                if (res && res.success && res.data) {
                    res.data.forEach(function (s) {
                        var opt = document.createElement('option');
                        opt.value = s.sectionID;
                        opt.textContent = s.sectionName;
                        $section.appendChild(opt);
                    });
                }
                if (sectionId) $section.value = sectionId;
            });
    }

   

    

    //$btnCopy.addEventListener('click', function () {
    //    var id = parseInt($hdnFeeTemplateId.value, 10) || 0;
    //    if (id <= 0) {
    //        alertWarning('Please select a saved Fee Template to copy.');
    //        return;
    //    }
    //    // Duplicate the currently loaded template as a brand-new,
    //    // unsaved record: keep header/grid values, clear the ID so
    //    // SAVE performs an INSERT. User should change Class / Section
    //    // / Installment before saving to avoid a duplicate-template error.
    //    $hdnFeeTemplateId.value = 0;
    //    gridRows.forEach(function (r) { r.DETAILID = 0; });
    //   // setFormEnabled(true);
    //    $btnDelete.disabled = true;
    //    alertWarning('Template copied. Please update Class / Section / Installment before saving.');
    //});

    // ---------------------------------------------------------------
    // Initial page load
    // ---------------------------------------------------------------
    document.addEventListener('DOMContentLoaded', function () {
        loadFeeHeadDropdown();
        var id = parseInt($hdnFeeTemplateId.value, 10) || 0;
        loadTemplate(id);
    });

})();