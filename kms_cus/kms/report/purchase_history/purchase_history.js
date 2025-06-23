// Copyright (c) 2025, Blue Phoenix and contributors
// For license information, please see license.txt

frappe.query_reports["Purchase History"] = {
	// "filters": [

	// ]
	formatter: function(value, row, column, data, default_formatter) {
    value = default_formatter(value, row, column, data);

    if (!data || data.is_total_row) {
      return value;
    }

    if ((column.label === "Received Quantity") ||
            (column.label === "Billed Amount" && data.billed_amt && data.billed_amt !== 0)) {
      return `<span style="color: green;">${value}</span>`;
    }

    return value;
  }
};
