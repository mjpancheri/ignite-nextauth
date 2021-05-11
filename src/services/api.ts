import axios, { AxiosError } from 'axios';
import { parseCookies, setCookie } from 'nookies';

import { signOut } from '../contexts/AuthContext';
import { AuthTokenError } from './errors/AuthTokenError';

let isRefreshing = false;
let failedRequestsQueue = [];

export function setupAPIClient(ctx = undefined) {
  let cookies = parseCookies(ctx);

  const api = axios.create({
    baseURL: 'http://localhost:3333',
    headers: {
      Authorization: `Bearer ${cookies['nextauth.token']}`
    }
  })

  api.interceptors.response.use(response => {
    return response;
  }, (error: AxiosError) => {
    console.log(error.response.data?.code);
    if(error.response.status === 401) {
      // console.log(error.response);
      if(error.response.data?.code === 'token.expired') {
        cookies = parseCookies(ctx);

        const { 'nextauth.refreshToken': oldRefreshToken } = cookies;
        const originalConfig = error.config;

        if(!isRefreshing) {
          isRefreshing = true;
// console.log('refresh antes');
          api.post('/refresh', {
            refreshToken: oldRefreshToken
          }).then(response => {
            // console.log('refresh depois');
            const { token, refreshToken } = response.data;
          
            setCookie(ctx, 'nextauth.token', token, {
              maxAge: 60 * 60 * 24 * 30, // 30 days
              path: '/',
            });
            
            setCookie(ctx, 'nextauth.refreshToken', refreshToken, {
              maxAge: 60 * 60 * 24 * 30, // 30 days
              path: '/',
            });
    
            api.defaults.headers['Authorization'] = `Bearer ${token}`;

            failedRequestsQueue.forEach(request => request.onSuccess(token));
            failedRequestsQueue = [];
          }).catch(err => {
            // console.log('api1',error);
            failedRequestsQueue.forEach(request => request.onFailure(err));
            failedRequestsQueue = [];
            
            if(process.browser) {
              signOut();
            }
          }).finally(() => {
            isRefreshing = false;
          });
        } else {
          new Promise((resolve, reject) => {
            failedRequestsQueue.push({
              onSuccess: (token: string) => {
                originalConfig.headers['Authorization'] = `Bearer ${token}`

                resolve(api(originalConfig))
              },
              onFailure: (err: AxiosError) => {
                reject(err)
              },
            })
          })
        }
      } else {
        if(process.browser) {
          signOut();
        } else {
          return Promise.reject(new AuthTokenError());
        }
      }
    }
    // console.log('api2',error);
    return Promise.reject(error);
  })

  return api;
}