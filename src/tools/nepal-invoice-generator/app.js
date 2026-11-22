(function () {
    const $ = (id) => document.getElementById(id);
    const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

    // Approximate BS display (year offset ~56.7). Good enough for visual; exact converter lives on the date tool.
    function adToBsLabel(iso) {
      if (!iso) return '';
      const d = new Date(iso + 'T12:00:00');
      if (isNaN(d)) return '';
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const day = d.getDate();
      let bsY = y + 56;
      if (m > 4 || (m === 4 && day >= 14)) bsY = y + 57;
      return `BS ~ ${bsY}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }

    let logoData = '';
    let qrData = '';
    let items = [{ desc: '', qty: 1, rate: 0 }];

    function setLang(lang) {
      document.body.classList.toggle('lang-ne', lang === 'ne');
      document.body.classList.toggle('lang-en', lang !== 'ne');
    }

    function renderItemsTable() {
      const tbody = $('items-body');
      tbody.innerHTML = '';
      items.forEach((it, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><input data-i="${i}" data-f="desc" value="${it.desc.replace(/"/g,'&quot;')}" placeholder="Service or product"></td>
          <td class="qty"><input data-i="${i}" data-f="qty" type="number" min="0" step="any" value="${it.qty}"></td>
          <td class="num"><input data-i="${i}" data-f="rate" type="number" min="0" step="any" value="${it.rate}"></td>
          <td class="num">${fmt(it.qty * it.rate)}</td>
          <td class="act"><button type="button" class="btn btn-sm" data-del="${i}" aria-label="Remove">×</button></td>`;
        tbody.appendChild(tr);
      });
      tbody.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('input', (e) => {
          const i = +e.target.dataset.i;
          const f = e.target.dataset.f;
          items[i][f] = f === 'desc' ? e.target.value : (parseFloat(e.target.value) || 0);
          renderItemsTable();
          updatePreview();
        });
      });
      tbody.querySelectorAll('[data-del]').forEach(btn => {
        btn.addEventListener('click', () => {
          items.splice(+btn.dataset.del, 1);
          if (!items.length) items.push({ desc: '', qty: 1, rate: 0 });
          renderItemsTable();
          updatePreview();
        });
      });
    }

    function calcTotals() {
      const sub = items.reduce((s, it) => s + (it.qty * it.rate), 0);
      const disc = parseFloat($('discount').value) || 0;
      const after = Math.max(0, sub - disc);
      const vatOn = $('vat-toggle').checked;
      const vat = vatOn ? after * 0.13 : 0;
      return { sub, disc, after, vat, total: after + vat, vatOn };
    }

    function updatePreview() {
      const t = calcTotals();
      const lang = $('lang').value;
      const tpl = $('template').value;
      const sheet = $('invoice-preview');
      sheet.className = 'invoice-sheet tpl-' + tpl;

      const invDate = $('inv-date').value;
      const adLabel = invDate || '—';
      const bsLabel = invDate ? adToBsLabel(invDate) : '';

      const L = lang === 'ne' ? {
        invoice: 'इनभ्वाइस / रसिद',
        billTo: 'बिल प्राप्तकर्ता',
        from: 'प्रेषक',
        invNo: 'नम्बर',
        date: 'मिति',
        desc: 'विवरण',
        qty: 'परिमाण',
        rate: 'दर',
        amt: 'रकम',
        sub: 'उप-जम्मा',
        disc: 'छुट',
        vat: 'भ्याट (१३%)',
        total: 'कुल रकम',
        payment: 'भुक्तानी',
        notes: 'नोट'
      } : {
        invoice: 'INVOICE',
        billTo: 'Bill to',
        from: 'From',
        invNo: 'Invoice #',
        date: 'Date',
        desc: 'Description',
        qty: 'Qty',
        rate: 'Rate',
        amt: 'Amount',
        sub: 'Subtotal',
        disc: 'Discount',
        vat: 'VAT (13%)',
        total: 'Grand Total',
        payment: 'Payment',
        notes: 'Notes'
      };

      const rows = items.filter(it => it.desc || it.rate).map(it =>
        `<tr><td>${escapeHtml(it.desc || '—')}</td><td class="r">${it.qty}</td><td class="r">${fmt(it.rate)}</td><td class="r">${fmt(it.qty * it.rate)}</td></tr>`
      ).join('') || `<tr><td colspan="4" style="color:#94a3b8">Add line items…</td></tr>`;

      sheet.innerHTML = `
        <div class="inv-header">
          <div class="inv-brand">
            ${logoData ? `<img class="logo-preview" src="${logoData}" alt="Logo">` : ''}
            <h2>${escapeHtml($('biz-name').value || 'Your Business')}</h2>
            <div>${escapeHtml($('biz-address').value || '')}</div>
            <div>${escapeHtml($('biz-phone').value || '')}${($('biz-phone').value && $('biz-email').value) ? ' · ' : ''}${escapeHtml($('biz-email').value || '')}</div>
            ${$('biz-pan').value ? `<div>PAN/VAT: ${escapeHtml($('biz-pan').value)}</div>` : ''}
          </div>
          <div class="inv-meta">
            <strong>${L.invoice}</strong>
            <div>${L.invNo}: ${escapeHtml($('inv-no').value || '—')}</div>
            <div>${L.date}: ${adLabel}</div>
            ${bsLabel ? `<div style="color:#64748b">${bsLabel}</div>` : ''}
          </div>
        </div>
        <div class="inv-parties">
          <div>
            <h3>${L.billTo}</h3>
            <div><strong>${escapeHtml($('client-name').value || 'Client')}</strong></div>
            <div>${escapeHtml($('client-address').value || '')}</div>
            ${$('client-pan').value ? `<div>PAN: ${escapeHtml($('client-pan').value)}</div>` : ''}
          </div>
          <div>
            <h3>${L.from}</h3>
            <div>${escapeHtml($('biz-name').value || 'Your Business')}</div>
          </div>
        </div>
        <table class="inv-table">
          <thead><tr><th>${L.desc}</th><th class="r">${L.qty}</th><th class="r">${L.rate}</th><th class="r">${L.amt}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="inv-totals">
          <div><span>${L.sub}</span><span>रू ${fmt(t.sub)}</span></div>
          ${t.disc > 0 ? `<div><span>${L.disc}</span><span>− रू ${fmt(t.disc)}</span></div>` : ''}
          ${t.vatOn ? `<div><span>${L.vat}</span><span>रू ${fmt(t.vat)}</span></div>` : ''}
          <div class="grand"><span>${L.total}</span><span>रू ${fmt(t.total)}</span></div>
        </div>
        ${($('pay-text').value || qrData) ? `
        <div class="inv-payment">
          <div style="flex:1">
            <strong>${L.payment}</strong>
            <div style="white-space:pre-wrap;margin-top:4px">${escapeHtml($('pay-text').value || '')}</div>
          </div>
          ${qrData ? `<img src="${qrData}" alt="Payment QR">` : ''}
        </div>` : ''}
        ${$('notes').value ? `<div class="inv-notes"><strong>${L.notes}:</strong> ${escapeHtml($('notes').value)}</div>` : ''}
      `;
    }

    function escapeHtml(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function readFileAsDataURL(file, cb) {
      if (!file) return;
      const r = new FileReader();
      r.onload = () => cb(r.result);
      r.readAsDataURL(file);
    }

    // Events
    $('btn-add-item').addEventListener('click', () => {
      items.push({ desc: '', qty: 1, rate: 0 });
      renderItemsTable();
      updatePreview();
    });
    ['biz-name','biz-pan','biz-address','biz-phone','biz-email','client-name','client-pan','client-address','inv-no','inv-date','discount','notes','pay-text','vat-toggle','template','lang'].forEach(id => {
      const el = $(id);
      if (el) el.addEventListener('input', updatePreview);
      if (el) el.addEventListener('change', () => {
        if (id === 'lang') setLang(el.value);
        updatePreview();
      });
    });
    $('biz-logo').addEventListener('change', (e) => {
      readFileAsDataURL(e.target.files[0], (d) => { logoData = d; updatePreview(); });
    });
    $('pay-qr').addEventListener('change', (e) => {
      readFileAsDataURL(e.target.files[0], (d) => { qrData = d; updatePreview(); });
    });

    $('btn-save-profile').addEventListener('click', () => {
      const data = {
        name: $('biz-name').value,
        pan: $('biz-pan').value,
        address: $('biz-address').value,
        phone: $('biz-phone').value,
        email: $('biz-email').value,
        logo: logoData,
        payText: $('pay-text').value,
        qr: qrData
      };
      try {
        localStorage.setItem('pbd_invoice_profile', JSON.stringify(data));
        $('profile-status').textContent = 'Profile saved in this browser.';
      } catch (e) {
        $('profile-status').textContent = 'Could not save (storage full or blocked).';
      }
    });
    $('btn-load-profile').addEventListener('click', () => {
      try {
        const raw = localStorage.getItem('pbd_invoice_profile');
        if (!raw) { $('profile-status').textContent = 'No saved profile found.'; return; }
        const d = JSON.parse(raw);
        $('biz-name').value = d.name || '';
        $('biz-pan').value = d.pan || '';
        $('biz-address').value = d.address || '';
        $('biz-phone').value = d.phone || '';
        $('biz-email').value = d.email || '';
        $('pay-text').value = d.payText || '';
        logoData = d.logo || '';
        qrData = d.qr || '';
        $('profile-status').textContent = 'Profile loaded.';
        updatePreview();
      } catch (e) {
        $('profile-status').textContent = 'Could not load profile.';
      }
    });

    function doPrint() {
      const html = $('invoice-preview').innerHTML;
      const w = window.open('', '_blank');
      w.document.write(`<!doctype html><html><head><title>Invoice</title>
        <style>
          body{font-family:system-ui,sans-serif;margin:24px;color:#111}
          .inv-header{display:flex;justify-content:space-between;border-bottom:2px solid #0b7285;padding-bottom:12px;margin-bottom:16px}
          .inv-brand h2{margin:0 0 4px;color:#0b7285}
          .inv-parties{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
          .inv-parties h3{margin:0 0 4px;font-size:11px;text-transform:uppercase;color:#64748b}
          table{width:100%;border-collapse:collapse;margin-bottom:12px}
          th,td{border-bottom:1px solid #e2e8f0;padding:7px 6px;text-align:left}
          th{background:#f8fafc;font-size:11px;text-transform:uppercase}
          .r{text-align:right}
          .inv-totals{margin-left:auto;width:220px}
          .inv-totals div{display:flex;justify-content:space-between;padding:3px 0}
          .grand{font-weight:800;border-top:2px solid #0b7285;margin-top:4px;padding-top:6px}
          .inv-payment{margin-top:16px;padding-top:12px;border-top:1px dashed #cbd5e1;display:flex;gap:16px}
          .inv-payment img{max-width:110px;max-height:110px}
          .logo-preview{max-height:48px;max-width:140px}
        </style></head><body>${html}</body></html>`);
      w.document.close();
      setTimeout(() => { w.print(); }, 300);
    }

    async function doPdf() {
      if (typeof html2canvas === 'undefined' || !window.jspdf) {
        doPrint();
        return;
      }
      const el = $('invoice-preview');
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const img = canvas.toDataURL('image/png');
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;
      let y = margin;
      if (imgH <= pageH - margin * 2) {
        pdf.addImage(img, 'PNG', margin, y, imgW, imgH);
      } else {
        let remaining = imgH;
        let srcY = 0;
        const pageImgH = pageH - margin * 2;
        while (remaining > 0) {
          const sliceH = Math.min(pageImgH, remaining);
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = (sliceH / imgH) * canvas.height;
          const ctx = sliceCanvas.getContext('2d');
          ctx.drawImage(canvas, 0, srcY, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
          const sliceImg = sliceCanvas.toDataURL('image/png');
          if (srcY > 0) pdf.addPage();
          pdf.addImage(sliceImg, 'PNG', margin, margin, imgW, sliceH);
          srcY += sliceCanvas.height;
          remaining -= sliceH;
        }
      }
      const name = ($('inv-no').value || 'invoice').replace(/[^\w\-]+/g, '_');
      pdf.save(name + '.pdf');
    }

    $('btn-download').addEventListener('click', doPdf);
    $('btn-print').addEventListener('click', doPrint);
    $('btn-download-m').addEventListener('click', doPdf);
    $('btn-print-m').addEventListener('click', doPrint);
    $('btn-reset').addEventListener('click', () => {
      items = [{ desc: '', qty: 1, rate: 0 }];
      $('client-name').value = '';
      $('client-pan').value = '';
      $('client-address').value = '';
      $('discount').value = 0;
      $('notes').value = '';
      $('vat-toggle').checked = false;
      renderItemsTable();
      updatePreview();
    });

    // Init
    const today = new Date();
    $('inv-date').value = today.toISOString().slice(0, 10);
    setLang('en');
    renderItemsTable();
    try {
      const raw = localStorage.getItem('pbd_invoice_profile');
      if (raw) {
        const d = JSON.parse(raw);
        $('biz-name').value = d.name || '';
        $('biz-pan').value = d.pan || '';
        $('biz-address').value = d.address || '';
        $('biz-phone').value = d.phone || '';
        $('biz-email').value = d.email || '';
        if (d.payText) $('pay-text').value = d.payText;
        logoData = d.logo || '';
        qrData = d.qr || '';
      }
    } catch (e) {}
    updatePreview();
    document.getElementById('yr').textContent = new Date().getFullYear();
  })();
