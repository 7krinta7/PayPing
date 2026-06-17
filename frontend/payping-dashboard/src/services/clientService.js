import api from './api';

export async function getClients() {
  const { data } = await api.get('/clients');
  return data;
}

export async function createClient(clientData) {
  const { data } = await api.post('/clients', clientData);
  return data;
}

export async function updateClient(id, clientData) {
  const { data } = await api.patch(`/clients/${id}`, clientData);
  return data;
}

export async function deleteClient(id) {
  const { data } = await api.delete(`/clients/${id}`);
  return data;
}
