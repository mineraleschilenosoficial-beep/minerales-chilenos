const host = window.location.hostname;
const isLocalHost = host === "localhost" || host === "127.0.0.1";
const runtimeApiBaseUrl = (window.__RUNTIME_CONFIG__ && window.__RUNTIME_CONFIG__.API_BASE_URL) || "";
const sameMachineDevBaseUrl = window.location.port === "8000" ? `${window.location.protocol}//${host}:8001` : "";
const API_BASE_URL = runtimeApiBaseUrl || sameMachineDevBaseUrl || (isLocalHost ? "http://127.0.0.1:8001" : "");

window.APP_CONFIG = {
  API_BASE_URL,
  MINES_URL: `${API_BASE_URL}/api/minas`,
  GRAPHQL_URL: `${API_BASE_URL}/api/concesiones/graphql`,
  CONCESSIONS_URL: `${API_BASE_URL}/api/concesiones`,
  DATA_URL: `${API_BASE_URL}/api/yacimientos`,
  LINK_REPORT_URL: `${API_BASE_URL}/api/link-report`,
  CONCESSIONS_PAGE_SIZE: 8000,
  CONCESSIONS_USE_BBOX: true,
  GTM_ID: "GTM-MRGDC2RP",
  CACHE_KEY: "mineraleschilenos:data:v3",
  CACHE_TTL_MS: 1000 * 60 * 60 * 6
};
