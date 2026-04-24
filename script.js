(() => {
  const STORAGE_KEY = 'invoice_studio_data_v1';

  const businessNameInput = document.getElementById('businessName');
  const clientNameInput = document.getElementById('clientName');
  const invoiceNumberInput = document.getElementById('invoiceNumber');
  const invoiceDateInput = document.getElementById('invoiceDate');
  const logoInput = document.getElementById('logoInput');
  const itemsContainer = document.getElementById('itemsContainer');
  const addItemBtn = document.getElementById('addItemBtn');
  const downloadBtn = document.getElementById('downloadBtn');

  const previewBusiness = document.getElementById('previewBusiness');
  const previewClient = document.getElementById('previewClient');
  const previewInvoiceNo = document.getElementById('previewInvoiceNo');
  const previewDate = document.getElementById('previewDate');
  const previewItems = document.getElementById('previewItems');
  const previewTotal = document.getElementById('previewTotal');
  const previewLogo = document.getElementById('previewLogo');
  const toast = document.getElementById('toast');

  const state = {
    businessName: '',
    clientName: '',
    invoiceNumber: generateInvoiceNumber(),
    date: new Date().toISOString().split('T')[0],
    logo: '',
    items: [{ description: '', price: '' }],
  };

  function generateInvoiceNumber() {
    const timestamp = Date.now().toString().slice(-6);
    const rand = Math.floor(100 + Math.random() * 900);
    return `INV-${timestamp}-${rand}`;
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value || 0);
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

  function renderPreview() {
    previewBusiness.textContent = state.businessName || 'Your Business Name';
    previewClient.textContent = state.clientName || 'Client Name';
    previewInvoiceNo.textContent = `Invoice # ${state.invoiceNumber}`;
    previewDate.textContent = state.date ? `Date: ${state.date}` : 'Date';

    previewItems.innerHTML = '';

    let total = 0;
    const visibleItems = state.items.filter((item) => item.description.trim() || Number(item.price) > 0);

    if (visibleItems.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="2">No items added yet.</td>';
      previewItems.appendChild(row);
    } else {
      visibleItems.forEach((item) => {
        const price = Number(item.price) || 0;
        total += price;
        const row = document.createElement('tr');
        row.innerHTML = `<td>${escapeHtml(item.description || 'Untitled service')}</td><td>${formatCurrency(price)}</td>`;
        previewItems.appendChild(row);
      });
    }

    previewTotal.textContent = formatCurrency(total);

    if (state.logo) {
      previewLogo.src = state.logo;
      previewLogo.classList.remove('hidden');
    } else {
      previewLogo.classList.add('hidden');
    }

    downloadBtn.disabled = !canDownload(total);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function hydrateFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const stored = JSON.parse(raw);
      state.businessName = stored.businessName || '';
      state.clientName = stored.clientName || '';
      state.invoiceNumber = stored.invoiceNumber || generateInvoiceNumber();
      state.date = stored.date || new Date().toISOString().split('T')[0];
      state.logo = stored.logo || '';
      state.items = Array.isArray(stored.items) && stored.items.length
        ? stored.items.map((item) => ({
            description: item.description || '',
            price: item.price || '',
          }))
        : [{ description: '', price: '' }];
    } catch (error) {
      console.warn('Failed to load saved invoice data:', error);
    }
  }

  function syncFormWithState() {
    businessNameInput.value = state.businessName;
    clientNameInput.value = state.clientName;
    invoiceNumberInput.value = state.invoiceNumber;
    invoiceDateInput.value = state.date;
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
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
    let total = 0;
    const visibleItems = state.items.filter((item) => item.description.trim() || Number(item.price) > 0);
    visibleItems.forEach((item) => {
      const price = Number(item.price) || 0;
      total += price;
      y += 9;
      doc.text(item.description || 'Untitled service', left, y);
      doc.text(formatCurrency(price), 170, y, { align: 'right' });
    });

    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: ${formatCurrency(total)}`, 170, y, { align: 'right' });

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
    state.date = e.target.value;
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

  downloadBtn.addEventListener('click', () => {
    const total = state.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    if (!canDownload(total)) return;
    downloadInvoicePdf();
  });

  hydrateFromStorage();
  syncFormWithState();
  renderItemInputs();
  renderPreview();
  persist();
})();
