import api from './api';

function unwrapInvoice(response) {
  return response?.invoice ?? response;
}

export async function getInvoices() {
  const { data } = await api.get("/invoices");
  return data;
}

export async function getPendingInvoices() {
  const { data } = await api.get('/invoices/pending');
  return data;
}

export async function createInvoice(invoiceData) {
  const { data } = await api.post('/invoices', invoiceData);
  return data;
}

export async function updateInvoice(id, invoiceData) {
  const { data } = await api.patch(`/invoices/${id}`, invoiceData);
  return unwrapInvoice(data);
}

export async function markInvoicePaid(id) {
  const { data } = await api.patch(`/invoices/${id}/pay`);
  return unwrapInvoice(data);
}

export async function deleteInvoice(id) {
  const { data } = await api.delete(`/invoices/${id}`);
  return data;
}
