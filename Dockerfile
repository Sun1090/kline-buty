# ---- 构建阶段 ----
FROM node:22-alpine AS build
# vitepress build 需要 git（lastUpdated 计算页面最后修改时间），alpine 基础镜像不预装
RUN apk add --no-cache git
WORKDIR /app
COPY package*.json ./
# legacy-peer-deps（@docsearch/react peer react<19）必须在 npm ci 前就位，
# 与 CI（checkout 自带 .npmrc）保持一致；缺失会导致 strict peer 解析 react@18 树而 EUSAGE。
COPY .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

# ---- 运行阶段 ----
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
