import api from "./api";

export const getSettings = async () => {
  const response = await api.get("/settings/");
  return response.data;
};

export const getBusinessProfile = async () => {
  const response = await api.get("/settings/business-profile/");
  return response.data;
};

export const getBillingProfile = async () => {
  const response = await api.get("/settings/billing-profile/");
  return response.data;
};

export const getDataSummary = async () => {
  const response = await api.get("/settings/data-summary/");
  return response.data;
};

export const downloadDataBackup = async () => {
  const response = await api.get("/settings/backup/", { responseType: "blob" });
  return response.data;
};

// Staff-accessible weighing machine connection settings + the
// admin-controlled manual weight entry lock. Used by Billing / Gold Return.
export const getWeighingMachineConfig = async () => {
  const response = await api.get("/settings/weighing-config/");
  return response.data;
};

export const updateSettings = async (data) => {
  const response = await api.patch("/settings/", data);
  return response.data;
};

export const uploadLogo = async (file) => {
  const payload = new FormData();
  payload.append("logo", file);

  const response = await api.post("/settings/logo/", payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};
