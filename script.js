(() => {
  const STORAGE_KEY = 'invoice_studio_data_v1';
  const MULTI_STORAGE_KEY = 'invoice_studio_multi_v1';
  const BUSINESS_PROFILE_KEY = 'invoice_studio_business_profile_v1';

  const businessNameInput = document.getElementById('businessName');
  const clientNameInput = document.getElementById('clientName');
  const invoiceNumberInput = document.getElementById('invoiceNumber');
  const invoiceDateInput = document.getElementById('invoiceDate');
  const logoInput = document.getElementById('logoInput');
  const currencyInput = document.getElementById('currency');
  const taxRateInput = document.getElementById('taxRate');
  const discountValueInput = document.getElementById('discountValue');
  const discountTypeInput = document.getElementById('discountType');
  const templateSelect = document.getElementById('templateSelect');
  const itemsContainer = document.getElementById('itemsContainer');
  const savedInvoicesList = document.getElementById('savedInvoicesList');

  const addItemBtn = document.getElementById('addItemBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const autoNumberBtn = document.getElementById('autoNumberBtn');
  const clearInvoiceBtn = document.getElementById('clearInvoiceBtn');
  const duplicateInvoiceBtn = document.getElementById('duplicateInvoiceBtn');
  const newInvoiceBtn = document.getElementById('newInvoiceBtn');
  const saveBusinessProfileBtn = document.getElementById('saveBusinessProfileBtn');
  const saveInvoiceFileBtn = document.getElementById('saveInvoiceFileBtn');
  const loadInvoiceFileInput = document.getElementById('loadInvoiceFileInput');
  const saveCurrentInvoiceBtn = document.getElementById('saveCurrentInvoiceBtn');

  const previewRoot = document.getElementById('invoice-preview');
  const previewBusiness = document.getElementById('previewBusiness');
  const previewClient = document.getElementById('previewClient');
  const previewInvoiceNo = document.getElementById('previewInvoiceNo');
  const previewDate = document.getElementById('previewDate');
  const previewItems = document.getElementById('previewItems');
  const previewSubtotal = document.getElementById('previewSubtotal');
  const previewDiscountLabel = document.getElementById('previewDiscountLabel');
  const previewDiscount = document.getElementById('previewDiscount');
  const previewTaxLabel = document.getElementById('previewTaxLabel');
  const previewTax = document.getElementById('previewTax');
  const previewTotal = document.getElementById('previewTotal');
  const previewLogo = document.getElementById('previewLogo');
  const toast = document.getElementById('toast');

  const TEMPLATE_CLASS_MAP = {
    minimal: 'template-minimal',
    modern: 'template-modern',
    bold: 'template-bold',
  };

  const state = createEmptyInvoice();
  let savedInvoices = [];

  function todayIso() {
    return new Date().toISOString().split('T')[0];
  }

  function generateInvoiceNumber() {
    const timestamp = Date.now().toString().slice(-6);
    const rand = Math.floor(100 + Math.random() * 900);
    return `INV-${timestamp}-${rand}`;
  }

  function createEmptyInvoice(overrides = {}) {
    return {
      businessName: '',
      clientName: '',
      invoiceNumber: generateInvoiceNumber(),
      date: todayIso(),
      currency: 'USD',
      taxRate: '',
      discountValue: '',
      discountType: 'percent',
      logo: '',
      template: 'minimal',
      items: [{ description: '', price: '' }],
      ...overrides,
    };
  }

  function getCurrentInvoiceData() {
    return {
      businessName: state.businessName,
      clientName: state.clientName,
      invoiceNumber: state.invoiceNumber,
      date: state.date,
      currency: state.currency,
      taxRate: state.taxRate,
      discountValue: state.discountValue,
      discountType: state.discountType,
      logo: state.logo,
      template: state.template,
      items: state.items.map((item) => ({
        description: item.description || '',
        price: item.price || '',
      })),
    };
  }

  function sanitizeInvoice(input) {
    const fallback = createEmptyInvoice();
    const safe = input && typeof input === 'object' ? input : {};

    const items = Array.isArray(safe.items) && safe.items.length
      ? safe.items.map((item) => ({
          description: typeof item?.description === 'string' ? item.description : '',
          price: typeof item?.price === 'number' || typeof item?.price === 'string' ? item.price : '',
        }))
      : fallback.items;

    return {
      businessName: typeof safe.businessName === 'string' ? safe.businessName : fallback.businessName,
      clientName: typeof safe.clientName === 'string' ? safe.clientName : fallback.clientName,
      invoiceNumber: typeof safe.invoiceNumber === 'string' && safe.invoiceNumber.trim()
        ? safe.invoiceNumber
        : fallback.invoiceNumber,
      date: typeof safe.date === 'string' && safe.date ? safe.date : fallback.date,
      currency: ['USD', 'EUR', 'GBP'].includes(safe.currency) ? safe.currency : fallback.currency,
      taxRate: safe.taxRate ?? fallback.taxRate,
      discountValue: safe.discountValue ?? fallback.discountValue,
      discountType: safe.discountType === 'fixed' ? 'fixed' : 'percent',
      logo: typeof safe.logo === 'string' ? safe.logo : fallback.logo,
      template: ['minimal', 'modern', 'bold'].includes(safe.template) ? safe.template : fallback.template,
      items,
    };
  }

  function applyInvoice(invoiceData, { persistState = true } = {}) {
    const sanitized = sanitizeInvoice(invoiceData);
    Object.assign(state, sanitized);

    syncFormWithState();
    renderItemInputs();
    renderPreview();
    if (persistState) {
      persist();
    }
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: state.currency || 'USD',
    }).format(value || 0);
  }

  function calculateTotals() {
    const subtotal = state.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    const taxRate = Math.max(0, Number(state.taxRate) || 0);
    const discountRaw = Math.max(0, Number(state.discountValue) || 0);

    const discountAmount = state.discountType === 'fixed'
      ? Math.min(discountRaw, subtotal)
      : Math.min((subtotal * discountRaw) / 100, subtotal);

    const taxableAmount = Math.max(subtotal - discountAmount, 0);
    const taxAmount = (taxableAmount * taxRate) / 100;
    const total = taxableAmount + taxAmount;

    return {
      subtotal,
      taxRate,
      discountRaw,
      discountAmount,
      taxAmount,
      total,
    };
  }

  function addItemRow(item = { description: '', price: '' }) {
    state.items.push(item);
    renderItemInputs();
    renderPreview();
    persist();
  }

  function removeItemRow(index) {
    state.items.splice(index, 1);
    if (state.items.length === 0) {
      state.items.push({ description: '', price: '' });
    }
    renderItemInputs();
    renderPreview();
    persist();
  }

  function renderItemInputs() {
    itemsContainer.innerHTML = '';
    state.items.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'item-row';

      const descInput = document.createElement('input');
      descInput.type = 'text';
      descInput.placeholder = 'Service description';
      descInput.value = item.description;
      descInput.addEventListener('input', (e) => {
        state.items[index].description = e.target.value;
        renderPreview();
        persist();
      });

      const priceInput = document.createElement('input');
      priceInput.type = 'number';
      priceInput.placeholder = '0.00';
      priceInput.min = '0';
      priceInput.step = '0.01';
      priceInput.value = item.price;
      priceInput.addEventListener('input', (e) => {
        state.items[index].price = e.target.value;
        renderPreview();
        persist();
      });

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'btn remove-item';
      removeButton.textContent = '×';
      removeButton.setAttribute('aria-label', 'Remove item');
      removeButton.addEventListener('click', () => removeItemRow(index));

      row.append(descInput, priceInput, removeButton);
      itemsContainer.appendChild(row);
    });
  }

  function setTemplateClass() {
    previewRoot.classList.remove('template-minimal', 'template-modern', 'template-bold');
    previewRoot.classList.add(TEMPLATE_CLASS_MAP[state.template] || 'template-minimal');
  }

  function renderPreview() {
    previewBusiness.textContent = state.businessName || 'Your Business Name';
    previewClient.textContent = state.clientName || 'Client Name';
    previewInvoiceNo.textContent = `Invoice # ${state.invoiceNumber}`;
    previewDate.textContent = state.date ? `Date: ${state.date}` : 'Date';

    previewItems.innerHTML = '';

    const totals = calculateTotals();
    const visibleItems = state.items.filter((item) => item.description.trim() || Number(item.price) > 0);

    if (visibleItems.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="2">No items added yet.</td>';
      previewItems.appendChild(row);
    } else {
      visibleItems.forEach((item) => {
        const price = Number(item.price) || 0;
        const row = document.createElement('tr');
        row.innerHTML = `<td>${escapeHtml(item.description || 'Untitled service')}</td><td>${formatCurrency(price)}</td>`;
        previewItems.appendChild(row);
      });
    }

    previewSubtotal.textContent = formatCurrency(totals.subtotal);
    previewDiscountLabel.textContent = state.discountType === 'fixed'
      ? 'Discount (fixed)'
      : `Discount (${totals.discountRaw || 0}%)`;
    previewDiscount.textContent = `- ${formatCurrency(totals.discountAmount)}`;
    previewTaxLabel.textContent = `Tax (${totals.taxRate || 0}%)`;
    previewTax.textContent = formatCurrency(totals.taxAmount);
    previewTotal.textContent = formatCurrency(totals.total);

    if (state.logo) {
      previewLogo.src = state.logo;
      previewLogo.classList.remove('hidden');
    } else {
      previewLogo.classList.add('hidden');
    }

    setTemplateClass();
    downloadBtn.disabled = !canDownload(totals.total);
  }

  function renderSavedInvoices() {
    savedInvoicesList.innerHTML = '';

    if (!savedInvoices.length) {
      savedInvoicesList.innerHTML = '<p class="empty-state">No saved invoices yet.</p>';
      return;
    }

    savedInvoices.forEach((invoice, index) => {
      const row = document.createElement('div');
      row.className = 'saved-item';

      const info = document.createElement('button');
      info.type = 'button';
      info.className = 'saved-item-main';
      info.innerHTML = `
        <strong>${escapeHtml(invoice.invoiceNumber)}</strong>
        <span>${escapeHtml(invoice.clientName || 'No client')} • ${escapeHtml(invoice.date || 'No date')}</span>
      `;
      info.addEventListener('click', () => {
        applyInvoice(invoice);
        showToast('Loaded saved invoice.');
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn remove-item';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => {
        savedInvoices.splice(index, 1);
        persistSavedInvoices();
        renderSavedInvoices();
        showToast('Saved invoice deleted.');
      });

      row.append(info, deleteBtn);
      savedInvoicesList.appendChild(row);
    });
  }

  function canDownload(total) {
    return Boolean(state.businessName.trim() && state.clientName.trim() && total > 0);
  }

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getCurrentInvoiceData()));
  }

  function persistSavedInvoices() {
    localStorage.setItem(MULTI_STORAGE_KEY, JSON.stringify(savedInvoices));
  }

  function hydrateSavedInvoices() {
    const raw = localStorage.getItem(MULTI_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      savedInvoices = Array.isArray(parsed) ? parsed.map(sanitizeInvoice) : [];
    } catch (error) {
      console.warn('Failed to load multi-invoice data:', error);
      savedInvoices = [];
    }
  }

  function hydrateFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const stored = JSON.parse(raw);
      applyInvoice(stored, { persistState: false });
    } catch (error) {
      console.warn('Failed to load saved invoice data:', error);
    }
  }

  function hydrateBusinessProfile() {
    const raw = localStorage.getItem(BUSINESS_PROFILE_KEY);
    if (!raw) return;

    try {
      const profile = JSON.parse(raw);
      if (typeof profile.businessName === 'string') {
        state.businessName = profile.businessName;
      }
      if (typeof profile.logo === 'string') {
        state.logo = profile.logo;
      }
    } catch (error) {
      console.warn('Failed to load business profile:', error);
    }
  }

  function syncFormWithState() {
    businessNameInput.value = state.businessName;
    clientNameInput.value = state.clientName;
    invoiceNumberInput.value = state.invoiceNumber;
    invoiceDateInput.value = state.date;
    currencyInput.value = state.currency;
    taxRateInput.value = state.taxRate;
    discountValueInput.value = state.discountValue;
    discountTypeInput.value = state.discountType;
    templateSelect.value = state.template;
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function downloadInvoiceData() {
    const dataStr = JSON.stringify(getCurrentInvoiceData(), null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(state.invoiceNumber || 'invoice').replace(/\s+/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Invoice JSON exported.');
  }

  function loadInvoiceDataFromFile(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        applyInvoice(parsed);
        showToast('Invoice JSON loaded.');
      } catch {
        showToast('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  }

  function saveBusinessProfile() {
    const profile = {
      businessName: state.businessName,
      logo: state.logo,
    };
    localStorage.setItem(BUSINESS_PROFILE_KEY, JSON.stringify(profile));
    showToast('Business profile saved.');
  }

  function clearInvoice() {
    const preserved = {
      businessName: state.businessName,
      logo: state.logo,
      currency: state.currency,
      template: state.template,
    };
    applyInvoice(createEmptyInvoice(preserved));
    showToast('Invoice cleared.');
  }

  function duplicateInvoice() {
    const duplicate = getCurrentInvoiceData();
    duplicate.invoiceNumber = generateInvoiceNumber();
    duplicate.date = todayIso();
    applyInvoice(duplicate);
    showToast('Invoice duplicated with new number/date.');
  }

  function createNewInvoice() {
    const profileRaw = localStorage.getItem(BUSINESS_PROFILE_KEY);
    let profile = {};
    if (profileRaw) {
      try {
        profile = JSON.parse(profileRaw) || {};
      } catch {
        profile = {};
      }
    }

    applyInvoice(createEmptyInvoice({
      businessName: profile.businessName || '',
      logo: profile.logo || '',
      template: state.template,
      currency: state.currency,
    }));
    showToast('Started new invoice.');
  }

  function saveCurrentInvoice() {
    const invoice = sanitizeInvoice(getCurrentInvoiceData());
    const existingIndex = savedInvoices.findIndex((entry) => entry.invoiceNumber === invoice.invoiceNumber);

    if (existingIndex >= 0) {
      savedInvoices[existingIndex] = invoice;
      showToast('Saved invoice updated.');
    } else {
      savedInvoices.unshift(invoice);
      showToast('Invoice saved to list.');
    }

    persistSavedInvoices();
    renderSavedInvoices();
  }

  function downloadInvoicePdf() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const left = 20;
    let y = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(state.businessName || 'Business Name', left, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    y += 8;
    doc.text(`Invoice #: ${state.invoiceNumber}`, left, y);
    y += 6;
    doc.text(`Date: ${state.date}`, left, y);
    y += 10;
    doc.text(`Bill To: ${state.clientName || 'Client Name'}`, left, y);

    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.text('Description', left, y);
    doc.text('Price', 170, y, { align: 'right' });

    doc.setDrawColor(210, 210, 210);
    doc.line(left, y + 2, 190, y + 2);

    doc.setFont('helvetica', 'normal');
    const totals = calculateTotals();
    const visibleItems = state.items.filter((item) => item.description.trim() || Number(item.price) > 0);
    visibleItems.forEach((item) => {
      const price = Number(item.price) || 0;
      y += 9;
      doc.text(item.description || 'Untitled service', left, y);
      doc.text(formatCurrency(price), 170, y, { align: 'right' });
    });

    y += 10;
    doc.setDrawColor(210, 210, 210);
    doc.line(left, y, 190, y);
    y += 8;
    doc.text('Subtotal', left, y);
    doc.text(formatCurrency(totals.subtotal), 170, y, { align: 'right' });

    y += 7;
    doc.text(
      state.discountType === 'fixed' ? 'Discount (fixed)' : `Discount (${totals.discountRaw || 0}%)`,
      left,
      y
    );
    doc.text(`- ${formatCurrency(totals.discountAmount)}`, 170, y, { align: 'right' });

    y += 7;
    doc.text(`Tax (${totals.taxRate || 0}%)`, left, y);
    doc.text(formatCurrency(totals.taxAmount), 170, y, { align: 'right' });

    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: ${formatCurrency(totals.total)}`, 170, y, { align: 'right' });

    y = 286;
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('Generated by DZ Media', 105, y, { align: 'center' });

    doc.save(`${(state.invoiceNumber || 'invoice').replace(/\s+/g, '-')}.pdf`);
    showToast('Invoice downloaded successfully.');
  }

  businessNameInput.addEventListener('input', (e) => {
    state.businessName = e.target.value;
    renderPreview();
    persist();
  });

  clientNameInput.addEventListener('input', (e) => {
    state.clientName = e.target.value;
    renderPreview();
    persist();
  });

  invoiceDateInput.addEventListener('change', (e) => {
    state.date = e.target.value || todayIso();
    renderPreview();
    persist();
  });

  currencyInput.addEventListener('change', (e) => {
    state.currency = e.target.value;
    renderPreview();
    persist();
  });

  taxRateInput.addEventListener('input', (e) => {
    state.taxRate = e.target.value;
    renderPreview();
    persist();
  });

  discountValueInput.addEventListener('input', (e) => {
    state.discountValue = e.target.value;
    renderPreview();
    persist();
  });

  discountTypeInput.addEventListener('change', (e) => {
    state.discountType = e.target.value;
    renderPreview();
    persist();
  });

  templateSelect.addEventListener('change', (e) => {
    state.template = e.target.value;
    renderPreview();
    persist();
  });

  logoInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      state.logo = reader.result;
      renderPreview();
      persist();
    };
    reader.readAsDataURL(file);
  });

  addItemBtn.addEventListener('click', () => addItemRow());
  autoNumberBtn.addEventListener('click', () => {
    state.invoiceNumber = generateInvoiceNumber();
    invoiceNumberInput.value = state.invoiceNumber;
    renderPreview();
    persist();
  });
  clearInvoiceBtn.addEventListener('click', clearInvoice);
  duplicateInvoiceBtn.addEventListener('click', duplicateInvoice);
  newInvoiceBtn.addEventListener('click', createNewInvoice);
  saveBusinessProfileBtn.addEventListener('click', saveBusinessProfile);
  saveInvoiceFileBtn.addEventListener('click', downloadInvoiceData);
  loadInvoiceFileInput.addEventListener('change', (e) => {
    loadInvoiceDataFromFile(e.target.files?.[0]);
    e.target.value = '';
  });
  saveCurrentInvoiceBtn.addEventListener('click', saveCurrentInvoice);

  downloadBtn.addEventListener('click', () => {
    const { total } = calculateTotals();
    if (!canDownload(total)) return;
    downloadInvoicePdf();
  });

  hydrateBusinessProfile();
  hydrateFromStorage();
  hydrateSavedInvoices();
  syncFormWithState();
  renderItemInputs();
  renderPreview();
  renderSavedInvoices();
  persist();
})();
