const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

export const printCustomerBills = (customer, bills, printWindow = null, printConfig = {}) => {
  const targetWindow = printWindow || window.open("", "_blank", "width=420,height=900");
  if (!targetWindow) return false;

  const billMarkup = bills.map((bill) => {
    const createdAt = bill.created_at ? new Date(bill.created_at) : new Date();
    const rows = (bill.items || []).map((item) => `
      <tr><td>${escapeHtml(item.die_code || item.work_name)}</td><td>${item.quantity || 0}</td>
      <td>${Number(item.rate || 0).toFixed(2)}</td><td>${Number(item.amount || 0).toFixed(2)}</td></tr>`).join("");

    return `<article class="receipt">
      <div class="shop-name">${escapeHtml(printConfig.shop_name || "NELLORE DIE CUTTING")}</div>
      <div class="shop-address">${escapeHtml(printConfig.address || "").replace(/\r?\n/g, "<br />")}<br />Contact: ${escapeHtml(printConfig.phone_number || "")}</div>
      <div class="separator"></div><div class="bill-title">★ BILL ★</div><div class="separator"></div>
      <table class="info">
        <tr><td><b>Bill No</b></td><td>:</td><td>${escapeHtml(bill.bill_number)}</td></tr>
        <tr><td><b>Date</b></td><td>:</td><td>${createdAt.toLocaleDateString("en-IN")}</td></tr>
        <tr><td><b>Time</b></td><td>:</td><td>${createdAt.toLocaleTimeString("en-IN")}</td></tr>
        <tr><td><b>Mobile</b></td><td>:</td><td>${escapeHtml(bill.customer_mobile || customer.mobile)}</td></tr>
        <tr><td><b>Token No</b></td><td>:</td><td>${escapeHtml(bill.token_number)}</td></tr>
        <tr><td><b>Payment</b></td><td>:</td><td>${escapeHtml(bill.payment_method)}</td></tr>
        <tr><td><b>Gold Return</b></td><td>:</td><td><b>${Number(bill.gold_return || 0).toFixed(3)} gm</b></td></tr>
      </table>
      <div class="separator"></div>
      <div class="gold-return-box"><div class="gold-return-label">GOLD RETURN</div><div class="gold-return-value">${Number(bill.gold_return || 0).toFixed(3)} gm</div></div>
      <table class="items"><thead><tr><th>Die</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="total"><div class="line"><span>Total Amount</span><b>₹ ${Number(bill.total_amount || 0).toFixed(2)}</b></div>
      <div class="line"><span>Discount</span><b>₹ ${Number(bill.discount || 0).toFixed(2)}</b></div></div>
      <div class="final-box"><div class="final-label">FINAL AMOUNT</div><div class="final-value">₹ ${Number(bill.final_amount || 0).toFixed(2)}</div></div>
      <div class="separator"></div><div class="footer">Thank You! Visit Again.<br />Please keep this bill safely.</div>
    </article>`;
  }).join("");

  targetWindow.document.open();
  targetWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(customer.name)} Bills</title>
    <style>
      @page { size: 80mm auto; margin: 3mm; }
      * { box-sizing: border-box; font-family: Arial, sans-serif; }
      body { margin: 0; background: #fff; color: #000; }
      .receipt { width: 72mm; margin: auto; padding: 8px; page-break-after: always; }
      .shop-name, .bill-title, .footer { text-align: center; }
      .shop-name { font-size: 22px; font-weight: bold; }.shop-address { text-align: center; font-size: 12px; margin-top: 6px; }
      .separator { border-top: 2px dashed #000; margin: 10px 0; }.bill-title { font-size: 20px; font-weight: bold; margin: 10px 0; }
      .info, .items { width: 100%; border-collapse: collapse; }.info td { padding: 3px 0; font-size: 13px; }
      .items { margin-top: 10px; }.items th, .items td { border: 1px solid #000; padding: 5px; font-size: 12px; text-align: center; }
      .gold-return-box { border: 2px solid #000; margin-top: 12px; padding: 8px; text-align: center; }.gold-return-label { font-size: 14px; font-weight: bold; }.gold-return-value { font-size: 24px; font-weight: bold; }
      .total { margin-top: 12px; font-size: 14px; }.line { display: flex; justify-content: space-between; margin-top: 6px; }
      .final-box { border: 2px solid #000; margin-top: 12px; padding: 10px; text-align: center; }.final-label { font-size: 16px; font-weight: bold; }.final-value { font-size: 30px; font-weight: bold; }.footer { margin-top: 15px; font-size: 13px; }
    </style></head><body>${billMarkup}</body></html>`);
  targetWindow.document.close();
  targetWindow.onload = () => {
    targetWindow.focus();
    targetWindow.print();
  };
  return true;
};
