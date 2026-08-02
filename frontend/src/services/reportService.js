import api from "./api";

export const getReportSummary = async (params = {}) => {
  const response = await api.get("/reports/summary/", { params });
  return response.data;
};
