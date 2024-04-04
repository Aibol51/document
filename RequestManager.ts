// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import qs from "qs";
import { RequesterType } from "./BaseResource";
interface RequestI {
  url: string;
  time: number;
  data: any;
  state: number;
  asyncFn: any;
}
export class RequestManager {
  private cache = new Map();
  private task = [];
  private request: RequesterType;
  constructor(request: RequesterType) {
    this.request = request;
  }
  async call(caller: any, ...arg: any) {
    const [method, ...request] = arg;
    const [url, data, options] = request;
    const urls = [method, url, qs.stringify(data || {}), qs.stringify(options || {})].join("&");
    const cacheItem = this.cache.get(urls);
    const asyncFn = async () => {
      return new Promise((resolve, reject) => {
        const item = this.cache.get(urls) || {};
        // console.log(item,'asyncFn')
        this.cache.set(urls, Object.assign(item, { state: 1 }));
        caller(...request)
          .then((data: any) => {
            resolve(data);
            const item = this.cache.get(urls) || {};
            // console.log(item,'asyncFn2')
            this.cache.set(urls, Object.assign(item, { state: 0 }));
          })
          .catch((err: any) => {
            const item = this.cache.get(urls) || {};
            // console.log(item,'asyncFn3')
            this.cache.set(urls, Object.assign(item, { state: -1 }));
            reject(err);
          });
      });
    };
    this.cache.set(urls, { asyncFn });
    if (cacheItem && cacheItem.state == 1) {
      console.log(cacheItem, "cacheItem");
      return Promise.resolve({});
      // return  await  cacheItem.asyncFn();
    } else {
      return asyncFn();
    }
    return Promise.resolve({});
  }
  proxy(): RequesterType {
    const m = ["delete", "get", "head", "options", "post", "put", "patch"];
    const self: any = this;
    const proxyObj: any = {};
    m.forEach(item => {
      proxyObj[item] = function (...arg: any[]) {
        return self.call(self.request[item], ...[item, ...arg]);
      };
    });
    return proxyObj as RequesterType;
  }
}
