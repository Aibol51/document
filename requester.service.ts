import axios, { AxiosResponse } from "axios";
import qs from "qs";
import { useAuth, useToast, useGoogleAnaltics } from "../hooks";
import { useI18n, getSystemLang } from "../i18n";
import {
  makeRandomId,
  getUUID,
  isMobile,
  isHybridApp,
  getBridgeAppInfo,
  getHybridAppType,
  PROJECT_VERSION,
  STORE_USER_INFO,
} from "../common";
import { useLocalStorage } from "core";
import { useEvent } from "../config";
export interface Sign {
  [key: string]: string | number;
}
const { localStore } = useLocalStorage();
const { getToken, setToken, setMaintain, isLogin } = useAuth();
const { toast } = useToast();
const { $t } = useI18n();
const { tokenEvent, platformEvent } = useEvent();
const { userRequestBad } = useGoogleAnaltics();

// const requestMap: string[] = [];
const requestCacheMap = new Map();
const excludePath: string[] = ["/api/auth/logout"];
const ERROR_CODE = [
  "ERR_BAD_OPTION_VALUE",
  "ERR_BAD_OPTION",
  "ECONNABORTED",
  "ETIMEDOUT",
  "ERR_NETWORK",
  "ERR_FR_TOO_MANY_REDIRECTS",
  "ERR_DEPRECATED",
  "ERR_BAD_RESPONSE",
  "ERR_BAD_REQUEST",
  // "ERR_CANCELED",
  "ERR_NOT_SUPPORT",
  "ERR_INVALID_URL",
];

/**
 * 主站请求工具函数
 */
export function requesterFn() {
  const request = axios.create({
    baseURL: window.CONFIG?.api || process.env.CMS_API,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    timeout: 20 * 1000,
    withCredentials: true,
  });
  request.interceptors.request.use(
    async (config: any) => {
      // 上传文件接口单独处理
      if (config.url === "/api/file/upload") {
        config.headers["content-type"] = "multipart/form-data";
        config.headers = Object.assign(config.headers, await creatHeaders());
        return config;
      }
      if(config.url === "/api/web/burying/point" && config.method === "post") {
        config.headers["content-type"] = "application/json";
        console.log(config);
      }
      console.log("config", config);
      const controller = new AbortController();
      config.signal = controller.signal;
      const requestParams = `${config.url}${config.params ? JSON.stringify(config.params) : ""}`;
      if (requestCacheMap.has(requestParams)) {
        console.log("cancel reqeust", requestParams);
        controller.abort();
      } else {
        requestCacheMap.set(requestParams, controller);
      }

      // if (config?.method && ["post", "put"].includes(config?.method)) {
      //   config.data = qs.stringify(config.data, {
      //     arrayFormat: "indices",
      //     allowDots: true,
      //   });
      // }
      if (config?.method && ["post", "put"].includes(config.method.toLowerCase()) && config.headers["Content-Type"] !== "application/json") {
        config.data = qs.stringify(config.data, {
          arrayFormat: "indices",
          allowDots: true,
        });
      }
      config.headers = Object.assign(config.headers, await creatHeaders());
      // 兼容活动详情webview请求语言问题
      if (config.params?.lang) {
        config.headers.langue = config.params?.lang;
      }
      return config;
    },
    error => {
      userRequestBad(99999, "network anomaly", error.config?.url || "");
      // userRequestBad(status, '网络错误', config.url)
      return Promise.reject({
        code: 1,
        status: 200,
        data: {},
        result: false,
        message: $t("common_error_network" /**网络异常，请检查网络 */),
      });
    }
  );
  request.interceptors.response.use(
    response => {
      clearRequestCache(response);
      const { data, status, config } = response;
      const { code } = data || {};
      // 解除维护后路由停留在维护界面刷新自动跳转首页
      if (
        window.location.href.indexOf("maintain") > -1 &&
        config.url === "/api/banner/list" &&
        status !== 609
      ) {
        userRequestBad(609, data.message || "", config.url);
        return platformEvent.emit(false);
      }
      if ([401, 403, 405].includes(code)) {
        if (code === 401 && isLogin.value) {
          toast.error($t("common_login_out_tips" /*您的账号已退出，请重新登录*/));
        }
        localStore.remove(STORE_USER_INFO);
        userRequestBad(code, data.message || "", config.url);
        setToken("");
        tokenEvent.emit(true);

        return Promise.resolve(Object.assign(data, { result: false }));
      }
      if (typeof data === "string" && data.length > 10 && status === 200) {
        return Promise.resolve(Object.assign({ data }, { result: true, status }));
      } else if (code !== 0) {
        code === 400 && config.url === "/api/activity/drawRedEnvelope"
          ? toast.error($t("mine_no_draws_today" /*今日已没有抽奖次数*/))
          : data.message && toast.error(data.message);
        userRequestBad(code, data.message || "", config.url);
        return Promise.resolve({ ...data, result: false });
      }

      return Promise.resolve(Object.assign(data, { result: code === 0, status }));
    },
    error => {
      clearRequestCache(error);
      const { response, message, config, code } = error;
      const { status, data = {} } = response || {};
      userRequestBad(
        status || code || 99999,
        "response:network anomaly (--message:" + message + "--requestUrl:" + config?.baseURL ||
        error?.config?.baseURL + ")",
        config?.url
      );
      if (message.includes("timeout")) {
        return Promise.resolve(
          Object.assign(data ? data : {}, {
            result: false,
            message: "",
          })
        );
      }

      if ([401, 403, 405].includes(status) && !excludePath.includes(response?.config?.url || "")) {
        localStore.remove(STORE_USER_INFO);
        setToken("");
        tokenEvent.emit(true);
        return Promise.resolve(Object.assign(data, { result: false }));
      }
      if (status === 609) {
        return platformEvent.emit(true, data);
      }
      if (status >= 500 || status === 400) {
        data.message && toast.error(data.message);
        return Promise.resolve({ ...data, result: false });
      }
    }
  );
  return request;
}

export async function creatHeaders() {
  const timestamp = Date.now();
  const sign = makeRandomId(-16);
  const appInfo = isHybridApp() ? await getBridgeAppInfo() : {};
  const appType = getHybridAppType();
  const {
    version = PROJECT_VERSION,
    device_id = getUUID(),
    client_type = appType ? appType : isMobile ? "h5" : "web",
  } = appInfo || {};
  const token = await getToken();
  const langue = getSystemLang();
  const tenant = window.CONFIG?.name;
  const signParams: Sign = {
    timestamp,
    sign,
    version,
    client_type,
    device_id,
    langue,
    tenant,
  };

  if (token) {
    signParams.Authorization = `${token}`;
  }
  return signParams;
}

export function clearRequestCache(response: AxiosResponse | any) {
  let requestParams = "";

  if (response && response.config) {
    requestParams = `${response.config.url}${response.config.params ? JSON.stringify(response.config.params) : ""
      }`;
    requestCacheMap.delete(requestParams);
    return;
  }

  // TODO 处理config为空的清空，默认直接清除全部, 待观察
  // 响应code:ERR_CANCELED 类型是abort的情况，不用处理
  if (ERROR_CODE.includes(response.code)) {
    requestCacheMap.clear();
  }
}
