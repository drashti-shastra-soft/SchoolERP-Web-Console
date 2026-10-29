$(document).ready(function () {
    loadPresentStudentCount();
    loadPresentStaffCount();
    loadInquiryStatusCount();
    loadLibraryBudgetChart();
    loadPhoneCallLogChart();
    loadUserTypeWiseCount();
});

function loadPresentStudentCount() {
    $.ajax({
        url: '/Dashboard/GetPresentStudentCount',
        type: 'GET',
        success: function (response) {
            if (response.success && response.data) {
                $('#presentStudentCount').text(
                    response.data.presentStudents + '/' + response.data.totalStudents
                );
            } else {
                $('#presentStudentCount').text('--/--');
            }
        },
        error: function () {
            console.error('Unable to load present student count');
            $('#presentStudentCount').text('--/--');
        }
    });
}


function loadPresentStaffCount() {
    $.ajax({
        url: '/Dashboard/GetPresentStaffCount',
        type: 'GET',
        success: function (response) {
            if (response.success && response.data) {
                $('#presentStaffCount').text(
                    response.data.presentStaff + '/' + response.data.totalStaff
                );
            } else {
                $('#presentStaffCount').text('--/--');
            }
        },
        error: function () {
            console.error('Unable to load present staff count');
            $('#presentStaffCount').text('--/--');
        }
    });
}


// Enquiry Overview Donut Chart
var enquiryChart = null;

function loadInquiryStatusCount() {
    $.ajax({
        url: '/Dashboard/GetInquiryStatusCount',
        type: 'GET',
        success: function (response) {
            if (!response.success || !response.data) return;

            var d = response.data;

            // Update legend counts
            $('#count-new').text(d.newCount);
            $('#count-followup').text(d.followUpCount);
            $('#count-converted').text(d.convertedCount);
            $('#count-lost').text(d.lostCount);

            $('#followup-count').text(d.followUpCount + '/' + d.totalCount);

            // Destroy existing chart if any
            if (enquiryChart) {
                enquiryChart.destroy();
                enquiryChart = null;
            }

            // Render ApexCharts donut
            enquiryChart = new ApexCharts(
                document.querySelector("#enquiry-circle-chart"),
                {
                    series: [d.newCount, d.followUpCount, d.convertedCount, d.lostCount],
                    chart: { type: 'donut', height: 265 },
                    labels: ['New', 'Follow Up', 'Converted', 'Lost'],
                    colors: ['#378ADD', '#1D9E75', '#639922', '#E24B4A'],
                    legend: { show: false },
                    dataLabels: { enabled: false },
                    plotOptions: {
                        pie: {
                            donut: {
                                size: '70%',
                                labels: {
                                    show: true,
                                    total: {
                                        show: true,
                                        label: 'Total',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        color: '#6c757d',
                                        formatter: function () { return d.totalCount; }
                                    }
                                }
                            }
                        }
                    },
                    tooltip: {
                        y: { formatter: function (val) { return val + ' Enquiries'; } }
                    }
                }
            );
            enquiryChart.render();
        },
        error: function () {
            console.error('Unable to load enquiry status count');
        }
    });
}


var studentChart = null;
var staffChart = null;

// UPDATED - reuses your existing /Dashboard/GetPresentStudentCount
function loadPresentStudentCount() {
    $.ajax({
        url: '/Dashboard/GetPresentStudentCount',
        type: 'GET',
        success: function (response) {
            if (response.success && response.data) {
                var present = response.data.presentStudents;
                var total = response.data.totalStudents;
                var absent = total - present;

                // Your existing counter
                $('#presentStudentCount').text(present + '/' + total);

                // Legend counts
                $('#student-present-legend').text(present);
                $('#student-absent-legend').text(absent);

                // Destroy old chart
                if (studentChart) { studentChart.destroy(); studentChart = null; }

                // Render donut chart
                studentChart = new ApexCharts(
                    document.querySelector('#student-circle-chart'), {
                    series: [present, absent],
                    chart: { type: 'donut', height: 265 },
                    labels: ['Present', 'Absent'],
                    colors: ['#1D9E75', '#E24B4A'],
                    legend: { show: false },
                    dataLabels: { enabled: false },
                    plotOptions: {
                        pie: {
                            donut: {
                                size: '70%',
                                labels: {
                                    show: true,
                                    total: {
                                        show: true,
                                        label: 'Total',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        color: '#6c757d',
                                        formatter: function () { return total; }
                                    }
                                }
                            }
                        }
                    },
                    tooltip: {
                        y: { formatter: function (val) { return val + ' Students'; } }
                    }
                });
                studentChart.render();

            } else {
                $('#presentStudentCount').text('--/--');
            }
        },
        error: function () {
            console.error('Unable to load present student count');
            $('#presentStudentCount').text('--/--');
        }
    });
}

// UPDATED - reuses your existing /Dashboard/GetPresentStaffCount
function loadPresentStaffCount() {
    $.ajax({
        url: '/Dashboard/GetPresentStaffCount',
        type: 'GET',
        success: function (response) {
            if (response.success && response.data) {
                var present = response.data.presentStaff;
                var total = response.data.totalStaff;
                var absent = total - present;

                // Your existing counter
                $('#presentStaffCount').text(present + '/' + total);

                // Legend counts
                $('#staff-present-legend').text(present);
                $('#staff-absent-legend').text(absent);

                // Destroy old chart
                if (staffChart) { staffChart.destroy(); staffChart = null; }

                // Render donut chart
                staffChart = new ApexCharts(
                    document.querySelector('#staff-circle-chart'), {
                    series: [present, absent],
                    chart: { type: 'donut', height: 265 },
                    labels: ['Present', 'Absent'],
                    colors: ['#1D9E75', '#E24B4A'],
                    legend: { show: false },
                    dataLabels: { enabled: false },
                    plotOptions: {
                        pie: {
                            donut: {
                                size: '70%',
                                labels: {
                                    show: true,
                                    total: {
                                        show: true,
                                        label: 'Total',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        color: '#6c757d',
                                        formatter: function () { return total; }
                                    }
                                }
                            }
                        }
                    },
                    tooltip: {
                        y: { formatter: function (val) { return val + ' Staff'; } }
                    }
                });
                staffChart.render();

            } else {
                $('#presentStaffCount').text('--/--');
            }
        },
        error: function () {
            console.error('Unable to load present staff count');
            $('#presentStaffCount').text('--/--');
        }
    });
}

var libraryBudgetChart = null;

function loadLibraryBudgetChart() {
    $.ajax({
        url: '/Dashboard/GetLibraryBudgetChartData',
        type: 'GET',
        success: function (response) {
            if (!response.success || !response.data) return;

            var d = response.data;

            // Update total count in header
            $('#lib-total-count').text(d.totalCount);

            // Destroy old chart
            if (libraryBudgetChart) {
                libraryBudgetChart.destroy();
                libraryBudgetChart = null;
            }

            // Bar values = BudgetId (unique number per budget)
            var barValues = d.budgetIds;

            // Line value = totalCount repeated for each label
            var lineValues = d.labels.map(function () { return d.totalCount; });

            libraryBudgetChart = new ApexCharts(
                document.querySelector('#library-budget-chart'), {
                series: [
                    {
                        name: 'Budget ID',
                        type: 'bar',
                        data: barValues
                    },
                    {
                        name: 'Total Budgets',
                        type: 'line',
                        data: lineValues
                    }
                ],
                chart: {
                    height: 265,
                    type: 'line',
                    toolbar: { show: false }
                },
                stroke: {
                    width: [0, 3],
                    curve: 'smooth'
                },
                colors: ['#6975de', '#1D9E75'],
                fill: {
                    opacity: [0.4, 1],
                    type: ['solid', 'solid']
                },
                labels: d.labels,          // BudgetName on X axis
                xaxis: {
                    type: 'category',
                    labels: {
                        rotate: -45,       // rotate if long names
                        style: {
                            fontSize: '11px',
                            colors: '#6c757d'
                        }
                    }
                },
                yaxis: {
                    labels: {
                        formatter: function (val) {
                            return Math.round(val);
                        }
                    }
                },
                grid: {
                    borderColor: '#e9ecef',
                    strokeDashArray: 4
                },
                legend: { show: false },
                dataLabels: { enabled: false },
                tooltip: {
                    shared: true,
                    intersect: false,
                    y: {
                        formatter: function (val, opts) {
                            // Show DisplayLabel + Acronym in tooltip
                            if (opts.seriesIndex === 0) {
                                var idx = opts.dataPointIndex;
                                return d.displayLabel[idx]
                                    + ' (' + d.acronym[idx] + ')';
                            }
                            return val + ' Total Budgets';
                        }
                    }
                },
                plotOptions: {
                    bar: {
                        columnWidth: '50%',
                        borderRadius: 4
                    }
                }
            });

            libraryBudgetChart.render();
        },
        error: function () {
            console.error('Unable to load library budget chart');
        }
    });
}


var phoneCallChart = null;

function loadPhoneCallLogChart() {
    $.ajax({
        url: '/Dashboard/GetPhoneCallLogChartData',
        type: 'GET',
        success: function (response) {
            if (!response.success || !response.data) return;

            var d = response.data;

            if (phoneCallChart) {
                phoneCallChart.destroy();
                phoneCallChart = null;
            }

            phoneCallChart = new ApexCharts(
                document.querySelector('#phonecall-chart'), {
                series: [
                    { name: 'Completed', data: d.completed },
                    { name: 'Ongoing', data: d.ongoing },
                    { name: 'Rescheduled', data: d.rescheduled }
                ],
                chart: {
                    type: 'bar',
                    height: 265,
                    stacked: true,        // ← stacked like screenshot
                    toolbar: { show: false }
                },
                colors: ['#00d4b4', '#378ADD', '#4B49AC'],
                plotOptions: {
                    bar: {
                        columnWidth: '45%',
                        borderRadius: 4,
                        borderRadiusApplication: 'end',  // round top only
                        borderRadiusWhenStacked: 'last'
                    }
                },
                dataLabels: { enabled: false },
                xaxis: {
                    categories: d.months,
                    labels: {
                        style: { fontSize: '12px', colors: '#6c757d' }
                    }
                },
                yaxis: {
                    labels: {
                        formatter: function (val) {
                            return val >= 1000
                                ? (val / 1000).toFixed(1) + 'K'
                                : val;
                        }
                    }
                },
                grid: {
                    borderColor: '#e9ecef',
                    strokeDashArray: 4
                },
                legend: {
                    show: true,
                    position: 'bottom',
                    markers: { radius: 12 }
                },
                tooltip: {
                    shared: true,
                    intersect: false,
                    y: {
                        formatter: function (val) {
                            return val + ' Calls';
                        }
                    }
                }
            });

            phoneCallChart.render();
        },
        error: function () {
            console.error('Unable to load phone call log chart');
        }
    });
}



function loadUserTypeWiseCount() {
    $.ajax({
        url: '/Dashboard/GetUserTypeWiseCount',
        type: 'GET',
        success: function (response) {
            if (!response.success || !response.data) return;

            $.each(response.data, function (i, item) {
                var count = item.userCount.toString().padStart(2, '0');
                $('[data-usertype="' + item.roleName + '"]').text(count);
            });
        },
        error: function () {
            console.error('Unable to load user type wise count');
        }
    });
}